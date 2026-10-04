"""Tests for EODHD Enrichment Service and Symbol Resolution."""
import pytest
import sqlite3
from unittest.mock import AsyncMock, patch, MagicMock
from app.database import get_db_connection, init_db
from app.services.eodhd_enrichment import (
    EODHDEnrichmentService,
    resolve_eodhd_symbol,
)
from app.providers.eodhd import EODHDClient


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_enrichment.db"
    monkeypatch.setattr("app.config.settings.db_path", test_db)
    init_db(test_db)
    yield


def test_resolve_eodhd_symbol():
    with get_db_connection() as conn:
        # Prepopulate a custom mapping
        conn.execute(
            """
            INSERT OR REPLACE INTO instrument_mappings
            (trading212_identifier, trading212_ticker, eodhd_symbol, confidence)
            VALUES ('CUSTOM_TICKER', 'CUSTOM_TICKER', 'CUSTOM.LSE', 'MANUAL')
            """
        )
        conn.commit()

        # 1. Custom mapping
        sym, conf = resolve_eodhd_symbol("CUSTOM_TICKER", conn)
        assert sym == "CUSTOM.LSE"
        assert conf == "MANUAL"

        # 2. Dot ticker
        sym, conf = resolve_eodhd_symbol("ASML.AS", conn)
        assert sym == "ASML.AS"
        assert conf == "EXACT_TICKER"

        # 3. T212 suffixes
        sym, conf = resolve_eodhd_symbol("SHEL_NL_EQ", conn)
        assert sym == "SHEL.AS"
        assert conf == "EXCHANGE_QUALIFIED"

        sym, conf = resolve_eodhd_symbol("AAPL_US_EQ", conn)
        assert sym == "AAPL.US"
        assert conf == "EXCHANGE_QUALIFIED"

        sym, conf = resolve_eodhd_symbol("SAP_DE_EQ", conn)
        assert sym == "SAP.XETRA"
        assert conf == "EXCHANGE_QUALIFIED"

        # 4. Pure letters
        sym, conf = resolve_eodhd_symbol("O", conn)
        assert sym == "O.US"
        assert conf == "HEURISTIC"


@pytest.mark.anyio
async def test_enrich_portfolio_success():
    # Insert test holding into SQLite
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO holdings
            (provider, external_id, ticker, name, currency, quantity, average_price, current_price, market_value)
            VALUES ('trading212', 'pos_asml_test', 'ASML.AS', 'ASML Holding NV', 'EUR', 10, 700.0, 800.0, 8000.0)
            ON CONFLICT(provider, external_id) DO UPDATE SET quantity = 10, market_value = 8000.0
            """
        )
        conn.commit()

    mock_client = MagicMock(spec=EODHDClient)
    mock_client.get_fundamentals = AsyncMock(
        return_value={
            "General": {
                "Sector": "Technology",
                "Industry": "Semiconductors",
            },
            "Highlights": {
                "DividendYield": 0.015,  # 1.5%
                "DividendShare": 12.0,   # €12 per share
            },
        }
    )
    mock_client.get_dividends = AsyncMock(
        return_value=[
            {
                "date": "2029-11-15",
                "paymentDate": "2029-11-30",
                "declarationDate": "2029-10-15",
                "recordDate": "2029-11-16",
                "value": 3.0,
                "currency": "EUR",
            }
        ]
    )

    service = EODHDEnrichmentService(client=mock_client)
    res = await service.enrich_portfolio()

    assert res["success"] is True
    assert res["instruments_enriched"] >= 1
    assert res["dividend_events_added"] >= 1

    # Verify SQLite update on holdings
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT sector, industry, dividend_yield, annual_dividend FROM holdings WHERE ticker = 'ASML.AS'")
        row = cursor.fetchone()
        assert row is not None
        assert row["sector"] == "Technology"
        assert row["industry"] == "Semiconductors"
        assert row["dividend_yield"] == 1.5
        assert row["annual_dividend"] == 120.0  # 12.0 * 10 shares

        # Verify dividend_events table has upcoming EXPECTED event
        cursor.execute("SELECT * FROM dividend_events WHERE ticker = 'ASML.AS' AND status = 'EXPECTED'")
        event = cursor.fetchone()
        assert event is not None
        assert event["amount"] == 30.0  # 3.0 * 10 shares
        assert event["payment_date"] == "2029-11-30"
        assert event["source"] == "EODHD"


@pytest.mark.anyio
async def test_enrich_portfolio_idempotency():
    mock_client = MagicMock(spec=EODHDClient)
    mock_client.get_fundamentals = AsyncMock(
        return_value={
            "General": {"Sector": "Technology"},
            "Highlights": {"DividendYield": 0.015},
        }
    )
    mock_client.get_dividends = AsyncMock(
        return_value=[
            {
                "date": "2029-11-15",
                "paymentDate": "2029-11-30",
                "value": 3.0,
            }
        ]
    )

    service = EODHDEnrichmentService(client=mock_client)

    # First run
    await service.enrich_portfolio()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) as count FROM dividend_events WHERE source = 'EODHD'")
        count_first = cursor.fetchone()["count"]

    # Second run
    await service.enrich_portfolio()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) as count FROM dividend_events WHERE source = 'EODHD'")
        count_second = cursor.fetchone()["count"]

    # Assert no duplicate events were created
    assert count_first == count_second
