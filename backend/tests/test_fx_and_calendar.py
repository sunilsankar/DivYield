from fastapi.testclient import TestClient
from app.main import app
from app.services.trading212_sync import derive_fx_rates
from app.database import get_db, init_db


def test_derive_fx_rates_local_to_eur():
    """Verify live FX rate derivation from positions' local vs EUR PnL."""
    metadata = {
        "AAPL_US_EQ": {"ticker": "AAPL_US_EQ", "currencyCode": "USD"},
        "NESF_GB_EQ": {"ticker": "NESF_GB_EQ", "currencyCode": "GBX"},
        "ASML_NL_EQ": {"ticker": "ASML_NL_EQ", "currencyCode": "EUR"},
    }

    # 1. AAPL: bought at $100, current $110, qty 10. Local pnl = $100.
    # Trading 212 reports ppl = €90.00, fxPpl = 0. Derived USD rate = 90 / 100 = 0.90
    # 2. NESF: bought at 100p, current 110p, qty 100. Local pnl = 1000 GBX.
    # Trading 212 reports ppl = €11.75, fxPpl = 0. Derived GBX rate = 11.75 / 1000 = 0.01175
    # 3. ASML: EUR position -> rate is always 1.0
    portfolio = [
        {
            "ticker": "AAPL_US_EQ",
            "quantity": 10.0,
            "averagePrice": 100.0,
            "currentPrice": 110.0,
            "ppl": 90.0,
            "fxPpl": 0.0,
        },
        {
            "ticker": "NESF_GB_EQ",
            "quantity": 100.0,
            "averagePrice": 100.0,
            "currentPrice": 110.0,
            "ppl": 11.75,
            "fxPpl": 0.0,
        },
        {
            "ticker": "ASML_NL_EQ",
            "quantity": 5.0,
            "averagePrice": 700.0,
            "currentPrice": 750.0,
            "ppl": 250.0,
            "fxPpl": 0.0,
        },
    ]

    rates = derive_fx_rates(portfolio, metadata, account_currency="EUR")

    assert rates["EUR"] == 1.0
    assert abs(rates["USD"] - 0.90) < 0.001
    assert abs(rates["GBX"] - 0.01175) < 0.0001
    # Check GBP was derived from GBX
    assert abs(rates["GBP"] - 1.175) < 0.01


def test_derive_fx_rates_fallback_defaults():
    """Verify fallback defaults when portfolio positions have zero local PnL."""
    metadata = {
        "NEW_US_EQ": {"ticker": "NEW_US_EQ", "currencyCode": "USD"},
    }
    # No price change
    portfolio = [
        {
            "ticker": "NEW_US_EQ",
            "quantity": 10.0,
            "averagePrice": 100.0,
            "currentPrice": 100.0,
            "ppl": 0.0,
            "fxPpl": 0.0,
        }
    ]

    rates = derive_fx_rates(portfolio, metadata, account_currency="EUR")
    assert rates["EUR"] == 1.0
    assert "USD" in rates
    assert rates["USD"] > 0
    assert "GBX" in rates
    assert "GBP" in rates


def test_calendar_and_dividends_company_name_resolution():
    """Verify /api/v1/calendar and /api/v1/dividends return resolved company names alongside ticker."""
    init_db()

    with get_db() as conn:
        conn.execute("DELETE FROM holdings;")
        conn.execute("DELETE FROM dividend_events;")

        # Insert test holding with full company name
        conn.execute(
            """
            INSERT INTO holdings (
                provider, external_id, ticker, name, isin, currency,
                quantity, average_price, current_price, market_value, fx_rate
            ) VALUES ('trading212', 'O_US_EQ', 'O', 'Realty Income Corp', 'US7561091049', 'EUR',
                      50.0, 50.0, 55.0, 2750.0, 0.90);
            """
        )

        # Insert received and expected dividends for O
        conn.execute(
            """
            INSERT INTO dividend_events (
                ticker, payment_date, amount, currency, source, status, external_id
            ) VALUES
            ('O', '2026-09-15', 12.50, 'EUR', 'TRADING212', 'RECEIVED', 'div-rec-1'),
            ('O', '2026-10-15', 12.80, 'EUR', 'EODHD', 'EXPECTED', 'div-exp-1');
            """
        )
        conn.commit()

    client = TestClient(app)

    # 1. Test /api/v1/calendar
    cal_res = client.get("/api/v1/calendar")
    assert cal_res.status_code == 200
    cal_data = cal_res.json()
    assert cal_data["count"] == 2
    assert cal_data["total_received"] == 12.50
    assert cal_data["total_expected"] == 12.80
    for ev in cal_data["events"]:
        assert ev["ticker"] == "O"
        assert ev["company_name"] == "Realty Income Corp"

    # 2. Test /api/v1/dividends
    rec_res = client.get("/api/v1/dividends")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["count"] == 1
    assert rec_data["dividends"][0]["ticker"] == "O"
    assert rec_data["dividends"][0]["company_name"] == "Realty Income Corp"

    # 3. Test /api/v1/dividends/expected
    exp_res = client.get("/api/v1/dividends/expected")
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert exp_data["count"] == 1
    assert exp_data["dividends"][0]["ticker"] == "O"
    assert exp_data["dividends"][0]["company_name"] == "Realty Income Corp"
