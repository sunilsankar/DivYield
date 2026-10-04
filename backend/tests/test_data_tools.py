import csv
import io
import pytest
from starlette.testclient import TestClient
from app.main import app
from app.database import init_db
from app.services.cash_interest import (
    estimate_cash_interest,
    list_cash_interest,
    total_interest_ytd,
)
from app.services.manual_entries import create_manual_holding, create_manual_transaction
from app.services.csv_io import (
    holdings_csv,
    transactions_csv,
    dividends_csv,
    import_holdings_csv,
    import_transactions_csv,
    import_dividends_csv,
)
from app.database import get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield


def test_cash_interest_simple_calculation():
    res = estimate_cash_interest(
        average_balance=10000.0,
        annual_rate_percent=3.0,
        period_start="2025-01-01",
        period_end="2025-04-01",
        notes="Test savings",
        source="MANUAL",
    )
    # 91 days * 10000 * 0.03 / 365 ≈ 74.79
    assert res["interest_earned"] > 70.0
    assert res["interest_earned"] < 80.0
    assert res["days"] == 91
    assert res["source"] == "MANUAL"


def test_cash_interest_endpoint_validation():
    response = client.post(
        "/api/v1/data-tools/cash-interest/estimate",
        json={
            "average_balance": -100,
            "annual_rate_percent": 2.0,
        },
    )
    assert response.status_code == 400


def test_cash_interest_list_and_total():
    estimate_cash_interest(
        average_balance=5000.0,
        annual_rate_percent=2.5,
        period_start=f"{2025}-01-01",
        period_end=f"{2025}-03-15",
    )
    response = client.get("/api/v1/data-tools/cash-interest")
    assert response.status_code == 200
    data = response.json()
    assert "periods" in data
    assert "total_interest_ytd" in data
    assert len(data["periods"]) >= 1


def test_create_manual_holding():
    res = create_manual_holding(
        ticker="MANUAL_X",
        quantity=50,
        average_price=120.0,
        name="Manual Test Stock",
        sector="Tech",
        annual_dividend=200.0,
        dividend_yield=3.3,
    )
    assert res["ticker"] == "MANUAL_X"
    assert res["market_value"] == 6000.0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM holdings WHERE ticker = 'MANUAL_X'")
        conn.commit()


def test_create_manual_transaction():
    res = create_manual_transaction(
        ticker="MANUAL_X",
        type_="DIVIDEND",
        amount=42.0,
        currency="EUR",
        notes="Quarterly dividend",
    )
    assert res["type"] == "DIVIDEND"
    assert res["amount"] == 42.0
    assert res["source"] == "MANUAL"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE external_id = ?", (res["external_id"],))
        conn.commit()


def test_manual_transaction_invalid_type():
    response = client.post(
        "/api/v1/data-tools/manual-transactions",
        json={"type": "INVALID_TYPE", "amount": 10.0, "currency": "EUR"},
    )
    assert response.status_code == 400


def test_csv_holdings_export_import_roundtrip():
    body = """ticker,name,quantity,average_price,current_price,market_value,currency,sector,annual_dividend,dividend_yield,payout_frequency
CSV_TEST,A Test Co,100,50.0,55.0,5500.0,EUR,Tech,150,2.7,Quarterly
"""
    inserted = import_holdings_csv(body)
    assert inserted == 1

    csv_body = holdings_csv()
    reader = csv.DictReader(io.StringIO(csv_body))
    rows = [r for r in reader if r["ticker"] == "CSV_TEST"]
    assert len(rows) == 1

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM holdings WHERE ticker = 'CSV_TEST'")
        conn.commit()


def test_csv_transactions_export_import_roundtrip():
    body = """date,type,ticker,price,quantity,amount,currency,notes
2025-01-15,DIVIDEND,CSV_TX_TEST,0.0,0,200.0,EUR,Test dividend
"""
    inserted = import_transactions_csv(body)
    assert inserted == 1

    csv_body = transactions_csv()
    assert "CSV_TX_TEST" in csv_body

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE ticker = 'CSV_TX_TEST'")
        conn.commit()


def test_csv_dividends_export_import_roundtrip():
    body = """ticker,declaration_date,ex_dividend_date,record_date,payment_date,amount,currency,status,source
CSV_DIV_TEST,2025-02-01,2025-02-15,2025-02-20,2025-03-01,15.0,EUR,EXPECTED,MANUAL
"""
    inserted = import_dividends_csv(body)
    assert inserted == 1

    csv_body = dividends_csv()
    assert "CSV_DIV_TEST" in csv_body

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dividend_events WHERE ticker = 'CSV_DIV_TEST'")
        conn.commit()


def test_csv_holdings_endpoint_export():
    response = client.get("/api/v1/data-tools/export.csv", params={"dataset": "holdings"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "ticker,name,quantity" in response.text


def test_csv_holdings_missing_header():
    body = "ticker,name\nFOO,Bar"
    with pytest.raises(ValueError):
        import_holdings_csv(body)


def test_manual_holding_endpoint():
    response = client.post(
        "/api/v1/data-tools/manual-holdings",
        json={
            "ticker": "END_HOLD",
            "quantity": 25,
            "average_price": 75.0,
            "name": "End-to-end Holding",
            "sector": "Healthcare",
            "annual_dividend": 50.0,
        },
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM holdings WHERE ticker = 'END_HOLD'")
        conn.commit()


def test_manual_transaction_endpoint():
    response = client.post(
        "/api/v1/data-tools/manual-transactions",
        json={
            "ticker": "END_HOLD",
            "type": "DIVIDEND",
            "amount": 12.50,
            "currency": "EUR",
            "notes": "End-to-end dividend",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "END_HOLD" in data["message"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE ticker = 'END_HOLD'")
        conn.commit()


def test_cash_interest_endpoint_save_and_list():
    response = client.post(
        "/api/v1/data-tools/cash-interest/estimate",
        json={
            "average_balance": 25000.0,
            "annual_rate_percent": 3.5,
            "period_start": "2025-06-01",
            "period_end": "2025-09-30",
            "notes": "End-to-end test",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "MANUAL"
    assert data["days"] == 122

    response = client.get("/api/v1/data-tools/cash-interest")
    assert response.status_code == 200
    assert any("End-to-end test" in (p.get("notes") or "") for p in response.json()["periods"])


def test_csv_import_endpoint_roundtrip():
    body = """date,type,ticker,price,quantity,amount,currency,notes
2025-08-01,DIVIDEND,END_TX_CSV,0,0,42.50,EUR,Endpoint import test
"""
    response = client.post(
        "/api/v1/data-tools/import.csv",
        params={"dataset": "transactions"},
        content=body,
        headers={"Content-Type": "text/csv"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE ticker = 'END_TX_CSV'")
        conn.commit()