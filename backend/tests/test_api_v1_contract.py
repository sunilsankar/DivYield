"""Tests verifying the exact mobile and web API v1 contract matching docs/API.md."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, init_db, set_setting

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_api_contract.db"
    monkeypatch.setattr("app.config.settings.db_path", test_db)
    init_db()

    # Seed mock data for contract testing
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO holdings
              (provider, external_id, ticker, name, quantity, average_price, current_price,
               market_value, currency, sector, annual_dividend, dividend_yield, payout_frequency, eodhd_symbol)
            VALUES
              ('T212', 'h1', 'ASML_NL_EQ', 'ASML Holding', 10.0, 700.0, 850.0, 8500.0, 'EUR', 'Technology', 60.0, 1.5, 'Quarterly', 'ASML.AS'),
              ('T212', 'h2', 'NN_NL_EQ', 'NN Group', 100.0, 35.0, 42.0, 4200.0, 'EUR', 'Financials', 320.0, 7.6, 'Semi-Annual', 'NN.AS');
            """
        )
        cursor.execute(
            """
            INSERT INTO transactions
              (source, external_id, ticker, type, quantity, price, amount, currency, date, notes)
            VALUES
              ('T212', 't1', 'ASML_NL_EQ', 'BUY', 10.0, 700.0, 7000.0, 'EUR', '2025-01-10T10:00:00Z', 'Initial purchase'),
              ('T212', 't2', 'NN_NL_EQ', 'BUY', 100.0, 35.0, 3500.0, 'EUR', '2025-01-15T11:00:00Z', 'Dividend capture');
            """
        )
        cursor.execute(
            """
            INSERT INTO dividend_events
              (ticker, amount, currency, payment_date, ex_dividend_date, source, status, external_id)
            VALUES
              ('NN_NL_EQ', 160.0, 'EUR', '2025-06-20', '2025-06-10', 'TRADING212', 'RECEIVED', 'div1'),
              ('ASML_NL_EQ', 30.0, 'EUR', '2026-11-15', '2026-11-01', 'EODHD', 'EXPECTED', 'div2');
            """
        )
        conn.commit()
    set_setting("account_currency", "EUR")
    set_setting("account_free_cash", "1500.0")


def test_calendar_endpoint():
    """Verify GET /api/v1/calendar returns combined chronological events."""
    resp = client.get("/api/v1/calendar")
    assert resp.status_code == 200
    data = resp.json()
    assert "events" in data
    assert data["total_received"] == 160.0
    assert data["total_expected"] == 30.0
    assert data["total_amount"] == 190.0
    assert data["count"] == 2

    # Filter by status
    resp_rec = client.get("/api/v1/calendar?status=RECEIVED")
    assert resp_rec.status_code == 200
    assert resp_rec.json()["count"] == 1
    assert resp_rec.json()["events"][0]["status"] == "RECEIVED"

    # Filter by ticker
    resp_ticker = client.get("/api/v1/calendar?ticker=ASML")
    assert resp_ticker.status_code == 200
    assert resp_ticker.json()["count"] == 1
    assert resp_ticker.json()["events"][0]["ticker"] == "ASML_NL_EQ"


def test_analytics_endpoints_allocation_dividends_value():
    """Verify /api/v1/analytics/allocation, /dividends, /value endpoints."""
    # Allocation
    resp_alloc = client.get("/api/v1/analytics/allocation")
    assert resp_alloc.status_code == 200
    data_alloc = resp_alloc.json()
    assert data_alloc["total_value"] == 12700.0  # 8500 + 4200
    assert len(data_alloc["sectors"]) == 2
    assert len(data_alloc["top_holdings"]) == 2

    # Dividends
    resp_div = client.get("/api/v1/analytics/dividends")
    assert resp_div.status_code == 200
    data_div = resp_div.json()
    assert data_div["annual_dividend_income"] == 380.0  # 60 + 320
    assert data_div["current_portfolio_yield"] > 0
    assert data_div["yield_on_cost"] > 0

    # Value
    resp_val = client.get("/api/v1/analytics/value")
    assert resp_val.status_code == 200
    data_val = resp_val.json()
    assert data_val["holdings_value"] == 12700.0
    assert data_val["uninvested_cash"] == 1500.0
    assert data_val["total_portfolio_value"] == 14200.0
    assert data_val["holdings_count"] == 2


def test_tax_summary_and_report_endpoints():
    """Verify /api/v1/tax/summary and /report endpoints."""
    resp_summary = client.get("/api/v1/tax/summary?year=2025")
    assert resp_summary.status_code == 200
    data_summary = resp_summary.json()
    assert data_summary["jurisdiction"] == "Netherlands"
    assert data_summary["tax_year"] == 2025
    assert "taxable_assets" in data_summary
    assert "estimated_net_liability" in data_summary

    resp_report = client.get("/api/v1/tax/report?year=2025")
    assert resp_report.status_code == 200
    data_report = resp_report.json()
    assert "assumptions" in data_report
    assert "total_assets" in data_report


def test_export_endpoints():
    """Verify /api/v1/export/transactions, /dividends, /yahoo."""
    # Transactions CSV
    resp_tx = client.get("/api/v1/export/transactions")
    assert resp_tx.status_code == 200
    assert "text/csv" in resp_tx.headers["content-type"]
    assert "ASML_NL_EQ" in resp_tx.text
    assert "NN_NL_EQ" in resp_tx.text

    # Dividends CSV
    resp_div = client.get("/api/v1/export/dividends")
    assert resp_div.status_code == 200
    assert "text/csv" in resp_div.headers["content-type"]
    assert "NN_NL_EQ" in resp_div.text
    assert "ASML_NL_EQ" in resp_div.text

    # Yahoo Finance Portfolio CSV
    resp_yahoo = client.get("/api/v1/export/yahoo")
    assert resp_yahoo.status_code == 200
    assert "text/csv" in resp_yahoo.headers["content-type"]
    assert "Symbol,Current Price" in resp_yahoo.text
    assert "ASML.AS" in resp_yahoo.text
    assert "NN.AS" in resp_yahoo.text


def test_no_trading_order_execution_routes_exist():
    """Security audit: verify that no trading order execution or mutation routes exist."""
    forbidden_routes = [
        "/api/v1/orders",
        "/api/v1/orders/execute",
        "/api/v1/order/place",
        "/api/v1/trade/buy",
        "/api/v1/trade/sell",
        "/api/v1/portfolio/buy",
        "/api/v1/portfolio/sell",
        "/api/v1/transfer",
    ]
    for route in forbidden_routes:
        # Check GET, POST, PUT, DELETE
        assert client.get(route).status_code in (404, 405)
        assert client.post(route, json={}).status_code in (404, 405)
        assert client.put(route, json={}).status_code in (404, 405)
        assert client.delete(route).status_code in (404, 405)
