import pytest
from starlette.testclient import TestClient
from app.main import app
from app.database import get_db, set_setting
from app.services.tax_engine import tax_calculator_nl, NETHERLANDS_TAX_RULES

client = TestClient(app)


def test_tax_rules_endpoint():
    response = client.get("/api/v1/tax/rules")
    assert response.status_code == 200
    data = response.json()
    assert data["jurisdiction"] == "Netherlands"
    assert 2024 in data["supported_years"]
    assert 2025 in data["supported_years"]
    assert 2026 in data["supported_years"]
    assert len(data["rules"]) >= 3
    rule_2025 = next(r for r in data["rules"] if r["year"] == 2025)
    assert rule_2025["tax_rate"] == 36.0
    assert rule_2025["tax_free_threshold_single"] == 57684.0


def test_netherlands_tax_below_threshold():
    # Calculation with total assets below threshold
    res = tax_calculator_nl.calculate_box3(
        investments_value=30000.0,
        cash_value=10000.0,
        tax_year=2025,
        has_fiscal_partner=False,
    )
    assert res["total_assets"] == 40000.0
    assert res["is_below_threshold"] is True
    assert res["estimated_tax_liability"] == 0.0
    assert res["taxable_assets"] == 0.0
    assert "Never present as an official tax liability" in res["assumptions"][-1]


def test_netherlands_tax_above_threshold_manual_query():
    # 2024 rules: Single allowance = 57,000, Inv rate = 6.04%, Cash rate = 1.03%, Tax rate = 36%
    # Investments = 100,000, Cash = 20,000 -> Total = 120,000
    # Taxable wealth = 120,000 - 57,000 = 63,000
    # Deemed Inv = 6,040, Deemed Cash = 206 -> Total Deemed = 6,246
    # Effective rate = 6,246 / 120,000 = 0.05205 (5.205%)
    # Taxable benefit = 63,000 * 0.05205 = 3,279.15
    # Tax = 3,279.15 * 0.36 = 1,180.49
    response = client.get(
        "/api/v1/tax/netherlands",
        params={
            "year": 2024,
            "has_fiscal_partner": False,
            "investments_override": 100000.0,
            "cash_override": 20000.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_assets"] == 120000.0
    assert data["tax_free_allowance"] == 57000.0
    assert data["taxable_assets"] == 63000.0
    assert data["is_below_threshold"] is False
    assert abs(data["estimated_tax_liability"] - 1180.50) < 1.0


def test_netherlands_tax_fiscal_partner_allowance():
    # Total = 100,000. Single threshold is 57,000 (taxable), but partner threshold is 114,000 (below threshold)
    res_single = tax_calculator_nl.calculate_box3(
        investments_value=100000.0, cash_value=0.0, tax_year=2024, has_fiscal_partner=False
    )
    assert res_single["is_below_threshold"] is False
    assert res_single["estimated_tax_liability"] > 0

    res_partner = tax_calculator_nl.calculate_box3(
        investments_value=100000.0, cash_value=0.0, tax_year=2024, has_fiscal_partner=True
    )
    assert res_partner["is_below_threshold"] is True
    assert res_partner["tax_free_allowance"] == 114000.0
    assert res_partner["estimated_tax_liability"] == 0.0


def test_netherlands_tax_from_database_and_withholding_credit():
    # Insert dummy holdings and dividend events into SQLite
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM holdings WHERE ticker LIKE 'TEST_TAX_%'")
        cursor.execute("DELETE FROM dividend_events WHERE ticker LIKE 'TEST_TAX_%'")

        cursor.execute(
            """
            INSERT INTO holdings (ticker, name, quantity, current_price, market_value, average_price, provider, external_id)
            VALUES ('TEST_TAX_1', 'Tax Test Stock', 100, 800.0, 80000.0, 700.0, 'MANUAL', 'MAN_TAX_1')
            """
        )
        cursor.execute(
            """
            INSERT INTO dividend_events (ticker, payment_date, amount, currency, status, source, external_id)
            VALUES ('TEST_TAX_1', '2025-05-15', 1000.0, 'EUR', 'RECEIVED', 'MANUAL', 'DIV_TAX_1')
            """
        )
        conn.commit()

    set_setting("account_free_cash", "5000.0")

    response = client.get("/api/v1/tax/netherlands", params={"year": 2025, "has_fiscal_partner": False})
    assert response.status_code == 200
    data = response.json()
    assert data["total_investments"] >= 80000.0
    assert data["total_cash"] >= 5000.0
    # Withholding tax credit is 15% of 1000 = 150.0
    assert data["withholding_tax_credit"] >= 150.0
    assert data["estimated_net_liability"] <= data["estimated_tax_liability"]

    # Cleanup
    with get_db() as conn:
        conn.cursor().execute("DELETE FROM holdings WHERE ticker LIKE 'TEST_TAX_%'")
        conn.cursor().execute("DELETE FROM dividend_events WHERE ticker LIKE 'TEST_TAX_%'")
        conn.commit()


def test_netherlands_tax_export_csv():
    response = client.get("/api/v1/tax/netherlands/export", params={"year": 2025, "has_fiscal_partner": False})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    content = response.text
    assert "# DivYield Netherlands Tax Report (Box 3)" in content
    assert "DISCLAIMER" in content
    assert "Taxable Assets Base" in content
    assert "Estimated Net Box 3 Payable" in content
