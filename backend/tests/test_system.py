from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, set_setting, get_setting
from app.credentials import save_trading212_credentials, get_trading212_credentials

client = TestClient(app)


def test_factory_reset_wipes_data_and_credentials():
    # 1. Insert test data in DB and save credentials
    save_trading212_credentials("test-api-key-12345", environment="demo")
    assert get_trading212_credentials() is not None

    with get_db() as conn:
        conn.execute(
            "INSERT INTO holdings (provider, external_id, ticker, quantity, market_value) VALUES (?, ?, ?, ?, ?);",
            ("trading212", "pos-1", "AAPL", 10.0, 1500.0),
        )
        conn.execute(
            "INSERT INTO transactions (date, ticker, type, amount) VALUES (?, ?, ?, ?);",
            ("2025-01-01", "AAPL", "BUY", 1500.0),
        )
        conn.execute(
            "INSERT INTO dividend_events (ticker, payment_date, amount, source) VALUES (?, ?, ?, ?);",
            ("AAPL", "2025-02-15", 25.0, "TRADING212"),
        )
        conn.commit()

    # Verify rows exist
    with get_db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM holdings;").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM transactions;").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM dividend_events;").fetchone()[0] == 1

    # 2. Call factory-reset with clear_credentials=True
    resp = client.post("/api/v1/system/factory-reset", json={"clear_credentials": True})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "wiped" in data["message"].lower()

    # 3. Verify DB tables are empty
    with get_db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM holdings;").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM transactions;").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM dividend_events;").fetchone()[0] == 0
        # Default settings should be restored
        assert get_setting("base_currency") == "EUR"

    # 4. Verify credentials wiped
    assert get_trading212_credentials() is None


def test_factory_reset_preserving_credentials():
    save_trading212_credentials("test-api-key-preserve", environment="live")
    assert get_trading212_credentials() is not None

    with get_db() as conn:
        conn.execute(
            "INSERT INTO holdings (provider, external_id, ticker, quantity, market_value) VALUES (?, ?, ?, ?, ?);",
            ("trading212", "pos-2", "MSFT", 5.0, 2000.0),
        )
        conn.commit()

    resp = client.post("/api/v1/system/factory-reset", json={"clear_credentials": False})
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # DB wiped
    with get_db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM holdings;").fetchone()[0] == 0

    # Credentials preserved
    creds = get_trading212_credentials()
    assert creds is not None
    assert creds["api_key"] == "test-api-key-preserve"
