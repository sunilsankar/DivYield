"""Tests for Trading 212 Synchronization, Idempotency, and API Endpoints."""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, init_db
from app.services.trading212_sync import sync_trading212


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_sync.db"
    monkeypatch.setattr("app.config.settings.db_path", test_db)
    init_db(test_db)
    yield


@pytest.mark.anyio
async def test_sync_without_credentials_returns_not_configured():
    with patch("app.services.trading212_sync.get_trading212_credentials", return_value=None):
        res = await sync_trading212()
        assert res["success"] is False
        assert res["status"] == "not_configured"


@pytest.mark.anyio
async def test_sync_idempotency_and_data_ingestion():
    mock_cash = {"currency": "EUR", "free": 1250.0, "total": 15000.0, "ppl": 450.0}
    mock_metadata = [
        {"ticker": "ASML_NL_EQ", "name": "ASML Holding NV", "isin": "NL0010273215", "currencyCode": "EUR"},
        {"ticker": "SHEL_NL_EQ", "name": "Shell PLC", "isin": "GB00BP6MXD84", "currencyCode": "EUR"},
    ]
    mock_portfolio = [
        {"ticker": "ASML_NL_EQ", "quantity": 10.0, "averagePrice": 700.0, "currentPrice": 800.0, "ppl": 1000.0},
        {"ticker": "SHEL_NL_EQ", "quantity": 100.0, "averagePrice": 25.0, "currentPrice": 30.0, "ppl": 500.0},
    ]
    mock_orders = [
        {
            "id": 1001,
            "ticker": "ASML_NL_EQ",
            "dateExecuted": "2026-01-15T10:00:00Z",
            "fillQty": 10.0,
            "fillPrice": 700.0,
            "fillCost": 7000.0,
            "taxes": 0.0,
            "status": "FILLED",
        },
    ]
    mock_transactions = [
        {"reference": "tx-1", "dateTime": "2026-01-10T08:00:00Z", "type": "DEPOSIT", "amount": 10000.0, "currency": "EUR"},
    ]
    mock_dividends = [
        {"reference": "div-99", "ticker": "ASML_NL_EQ", "paidOn": "2026-02-15T09:00:00Z", "amount": 15.2, "currency": "EUR"},
    ]

    mock_client = AsyncMock()
    mock_client.get_account_cash.return_value = mock_cash
    mock_client.get_instruments_metadata.return_value = mock_metadata
    mock_client.get_portfolio.return_value = mock_portfolio
    mock_client.get_all_orders.return_value = mock_orders
    mock_client.get_all_transactions.return_value = mock_transactions
    mock_client.get_all_dividends.return_value = mock_dividends

    with (
        patch("app.services.trading212_sync.get_trading212_credentials", return_value={"api_key": "valid_key", "environment": "live"}),
        patch("app.services.trading212_sync.Trading212Client", return_value=mock_client),
    ):
        # 1st sync run
        res1 = await sync_trading212()
        assert res1["success"] is True
        assert res1["holdings_count"] == 2
        assert res1["orders_count"] == 1
        assert res1["dividends_count"] == 1

        # Check DB row counts
        with get_db() as conn:
            h_count = conn.execute("SELECT COUNT(*) FROM holdings").fetchone()[0]
            tx_count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            div_count = conn.execute("SELECT COUNT(*) FROM dividend_events").fetchone()[0]
            assert h_count == 2
            assert tx_count == 2  # 1 order + 1 cash transaction
            assert div_count == 1

            # Assert dividend status is strictly RECEIVED
            div_status = conn.execute("SELECT status FROM dividend_events WHERE external_id = 't212-div-div-99'").fetchone()[0]
            assert div_status == "RECEIVED"

            # 2nd sync run — Must be 100% idempotent (no duplicates inserted)
            res2 = await sync_trading212()
            assert res2["success"] is True

            with get_db() as conn:
                h_count2 = conn.execute("SELECT COUNT(*) FROM holdings").fetchone()[0]
                tx_count2 = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
                div_count2 = conn.execute("SELECT COUNT(*) FROM dividend_events").fetchone()[0]
                assert h_count2 == 2
                assert tx_count2 == 2
                assert div_count2 == 1


@pytest.mark.anyio
async def test_sync_blocks_concurrent_runs():
    from app.services.trading212_sync import _sync_lock
    # Simulate a running lock
    await _sync_lock.acquire()
    try:
        res = await sync_trading212()
        assert res["success"] is False
        assert res["status"] == "in_progress"
        assert "Concurrent sync is disallowed" in res["error"]
    finally:
        _sync_lock.release()



def test_api_endpoints_after_sync():
    client = TestClient(app)

    # Insert test data into SQLite
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO holdings (provider, external_id, ticker, name, currency, quantity, average_price, current_price, market_value)
            VALUES ('trading212', 'ASML_NL_EQ', 'ASML', 'ASML Holding NV', 'EUR', 10.0, 700.0, 800.0, 8000.0);
            """
        )
        conn.execute(
            """
            INSERT INTO transactions (date, ticker, type, quantity, price, amount, fees, currency, external_id, source)
            VALUES ('2026-01-15T10:00:00Z', 'ASML', 'BUY', 10.0, 700.0, 7000.0, 0.0, 'EUR', 't212-ord-1', 'TRADING212');
            """
        )
        conn.execute(
            """
            INSERT INTO dividend_events (ticker, payment_date, amount, currency, source, status, external_id)
            VALUES ('ASML', '2026-02-15T10:00:00Z', 15.0, 'EUR', 'TRADING212', 'RECEIVED', 't212-div-1');
            """
        )
        conn.commit()

    # 1. GET /api/v1/portfolio
    resp = client.get("/api/v1/portfolio")
    assert resp.status_code == 200
    data = resp.json()
    assert data["holdings_count"] == 1
    assert data["holdings_value"] == 8000.0
    assert data["total_invested"] == 7000.0
    assert data["unrealized_pnl"] == 1000.0

    # 2. GET /api/v1/holdings
    resp_holdings = client.get("/api/v1/holdings")
    assert resp_holdings.status_code == 200
    holdings_data = resp_holdings.json()
    assert holdings_data["count"] == 1
    assert holdings_data["holdings"][0]["ticker"] == "ASML"
    assert holdings_data["holdings"][0]["unrealized_gain"] == 1000.0

    # 3. GET /api/v1/transactions
    resp_tx = client.get("/api/v1/transactions")
    assert resp_tx.status_code == 200
    tx_data = resp_tx.json()
    assert tx_data["total_count"] == 1
    assert tx_data["transactions"][0]["ticker"] == "ASML"

    # 4. GET /api/v1/dividends
    resp_div = client.get("/api/v1/dividends")
    assert resp_div.status_code == 200
    div_data = resp_div.json()
    assert div_data["count"] == 1
    assert div_data["dividends"][0]["status"] == "RECEIVED"
    assert div_data["total_amount"] == 15.0
