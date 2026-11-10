"""Tests for the Base Currency preference and Trading 212 account currency resolution."""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, get_setting, init_db, set_setting
from app.services.trading212_sync import sync_trading212

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_currency.db"
    monkeypatch.setattr("app.config.settings.db_path", test_db)
    init_db(test_db)
    yield


def _mock_client(summary=None, summary_error=None, cash=None, orders=None, dividends=None):
    mock = AsyncMock()
    if summary_error is not None:
        mock.get_account_summary.side_effect = summary_error
    else:
        mock.get_account_summary.return_value = summary
    # /equity/account/cash has no currency field.
    mock.get_account_cash.return_value = cash or {"free": 10.0, "total": 110.0, "ppl": 5.0}
    mock.get_instruments_metadata.return_value = [
        {"ticker": "VUSAl_EQ", "name": "Vanguard S&P 500", "isin": "IE00B3XXRP09", "currencyCode": "GBX"},
    ]
    mock.get_portfolio.return_value = [
        {"ticker": "VUSAl_EQ", "quantity": 1.0, "averagePrice": 9000.0, "currentPrice": 10000.0, "ppl": 10.0},
    ]
    mock.get_all_orders.return_value = orders or [
        {
            "order": {"id": 501, "ticker": "VUSAl_EQ", "side": "BUY", "status": "FILLED"},
            "fill": {"id": 901, "quantity": 1.0, "price": 90.0, "filledAt": "2026-01-05T10:00:00Z",
                     "walletImpact": {"netValue": 90.0}},
        },
    ]
    mock.get_all_transactions.return_value = []
    mock.get_all_dividends.return_value = dividends or []
    return mock


async def _sync(mock):
    with (
        patch("app.services.trading212_sync.get_trading212_credentials", return_value={"api_key": "k", "environment": "live"}),
        patch("app.services.trading212_sync.Trading212Client", return_value=mock),
    ):
        res = await sync_trading212()
    assert res["success"] is True
    return res


# --- Preferences endpoint -------------------------------------------------------------

def test_preferences_default_to_eur():
    resp = client.get("/api/v1/preferences")
    assert resp.status_code == 200
    data = resp.json()
    assert data["base_currency"] == "EUR"
    assert data["account_currency_source"] == "default"
    assert data["supported_base_currencies"] == ["EUR", "USD", "GBP"]


def test_saving_base_currency_persists_and_applies_until_t212_reports_one():
    resp = client.post("/api/v1/preferences", json={"base_currency": "gbp"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["base_currency"] == "GBP"
    assert data["account_currency"] == "GBP"
    assert data["account_currency_source"] == "preference"
    assert client.get("/api/v1/preferences").json()["base_currency"] == "GBP"


def test_unsupported_base_currency_is_rejected():
    resp = client.post("/api/v1/preferences", json={"base_currency": "JPY"})
    assert resp.status_code == 400
    assert get_setting("base_currency") == "EUR"


def test_preference_does_not_override_currency_reported_by_t212():
    set_setting("account_currency", "USD")
    set_setting("account_currency_source", "trading212")
    data = client.post("/api/v1/preferences", json={"base_currency": "GBP"}).json()
    assert data["base_currency"] == "GBP"
    assert data["account_currency"] == "USD"


# --- Account currency during sync -------------------------------------------------------

@pytest.mark.anyio
async def test_sync_uses_currency_from_account_summary():
    res = await _sync(_mock_client(summary={"currency": "GBP", "cash": {}, "totalValue": 110.0}))
    assert res["account_currency"] == "GBP"
    assert get_setting("account_currency") == "GBP"
    assert get_setting("account_currency_source") == "trading212"
    with get_db() as conn:
        assert conn.execute("SELECT currency FROM holdings").fetchone()[0] == "GBP"
        assert conn.execute("SELECT currency FROM transactions WHERE type = 'BUY'").fetchone()[0] == "GBP"


@pytest.mark.anyio
async def test_sync_falls_back_to_base_currency_preference():
    set_setting("base_currency", "GBP")
    res = await _sync(_mock_client(summary_error=RuntimeError("404")))
    assert res["account_currency"] == "GBP"
    assert get_setting("account_currency_source") == "preference"


@pytest.mark.anyio
async def test_sync_defaults_to_eur_without_any_currency_information():
    with get_db() as conn:
        conn.execute("DELETE FROM settings WHERE key = 'base_currency'")
        conn.commit()
    res = await _sync(_mock_client(summary={}))
    assert res["account_currency"] == "EUR"
    assert get_setting("account_currency_source") == "default"


@pytest.mark.anyio
async def test_resync_relabels_existing_order_rows():
    """Order rows stored under the old EUR fallback are corrected on the next sync."""
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO transactions (date, ticker, type, quantity, price, amount, fees, currency, external_id, source)
            VALUES ('2026-01-05T10:00:00Z', 'VUSAl', 'BUY', 1.0, 90.0, 90.0, 0.0, 'EUR', 't212-ord-501', 'TRADING212');
            """
        )
        conn.commit()
    orders = [{"id": 501, "ticker": "VUSAl_EQ", "dateExecuted": "2026-01-05T10:00:00Z",
               "fillQty": 1.0, "fillPrice": 90.0, "fillCost": 90.0, "status": "FILLED"}]
    await _sync(_mock_client(summary={"currency": "GBP"}, orders=orders))
    with get_db() as conn:
        row = conn.execute("SELECT currency FROM transactions WHERE external_id = 't212-ord-501'").fetchone()
    assert row[0] == "GBP"


# --- Dividends --------------------------------------------------------------------------

@pytest.mark.anyio
async def test_dividends_use_amount_in_account_currency_not_amount_in_euro():
    dividends = [
        {"reference": "d-1", "ticker": "VUSAl_EQ", "paidOn": "2026-02-01T09:00:00Z",
         "amount": 1.50, "amountInEuro": 1.75, "currency": "GBP"},
        {"reference": "d-2", "ticker": "VUSAl_EQ", "paidOn": "2026-03-01T09:00:00Z",
         "amountInEuro": 2.00},
    ]
    await _sync(_mock_client(summary={"currency": "GBP"}, dividends=dividends))
    with get_db() as conn:
        rows = {r[0]: (r[1], r[2]) for r in conn.execute(
            "SELECT external_id, amount, currency FROM dividend_events WHERE source = 'TRADING212'")}
    assert rows["t212-div-d-1"] == (pytest.approx(1.50), "GBP")
    assert rows["t212-div-d-2"] == (pytest.approx(2.00), "EUR")
