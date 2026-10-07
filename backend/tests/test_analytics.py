import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_test_db():
    init_db()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM holdings")
        cursor.execute("DELETE FROM dividend_events")
        cursor.execute("DELETE FROM transactions")
        conn.commit()
    yield


def test_analytics_overview_empty_db():
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_portfolio_value"] == 0.0
    assert data["total_invested"] == 0.0
    assert data["portfolio_yield"] == 0.0
    assert data["yield_on_cost"] == 0.0
    assert data["holdings_concentration"] == []
    assert data["single_stock_warnings"] == []


def test_analytics_overview_with_holdings_and_concentration():
    # Insert holdings:
    # 1. ASML: 10 * 800 = 8000, cost 7000, yield 2.0% -> annual dividend 160
    # 2. SHEL: 100 * 30 = 3000, cost 2800, yield 4.0% -> annual dividend 120
    # Total value = 11,000. ASML weight = 8000 / 11000 = 72.7% (exceeds 15% -> warning!)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO holdings (
                provider, external_id, ticker, name, quantity, average_price, current_price,
                market_value, sector, dividend_yield, annual_dividend, payout_frequency
            ) VALUES
            ('TRADING212', 'h1', 'ASML', 'ASML Holding', 10, 700.0, 800.0, 8000.0, 'Technology', 2.0, 160.0, 'Quarterly'),
            ('TRADING212', 'h2', 'SHEL', 'Shell PLC', 100, 28.0, 30.0, 3000.0, 'Energy', 4.0, 120.0, 'Quarterly')
            """
        )
        conn.commit()

    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()

    assert data["total_portfolio_value"] == 11000.0
    assert data["total_invested"] == 9800.0
    assert data["total_annual_dividend"] == 280.0
    # portfolio yield = 280 / 11000 * 100 = 2.55%
    assert round(data["portfolio_yield"], 2) == 2.55
    # yield on cost = 280 / 9800 * 100 = 2.86%
    assert round(data["yield_on_cost"], 2) == 2.86

    # Concentration check (both ASML at 72.7% and SHEL at 27.3% exceed 15%)
    assert round(data["top1_concentration"], 2) == 72.73
    assert len(data["single_stock_warnings"]) == 2
    assert any("ASML" in w for w in data["single_stock_warnings"])
    assert any("SHEL" in w for w in data["single_stock_warnings"])

    # Sector check (Technology is 72.7% > 25% -> warning!)
    assert len(data["sector_warnings"]) >= 1
    assert any("Technology" in w for w in data["sector_warnings"])

    # Frequency check
    assert len(data["frequency_breakdown"]) == 1
    assert data["frequency_breakdown"][0]["frequency"] == "Quarterly"

    # Income by holding
    assert len(data["income_by_holding"]) == 2
    assert data["income_by_holding"][0]["ticker"] == "ASML"
    assert data["income_by_holding"][0]["annual_dividend"] == 160.0


def test_projections_calculation():
    # Test projections with 5 years
    response = client.get("/api/v1/analytics/projections?years=5&dividend_growth_rate=6.0&dividend_reinvestment=true&annual_contribution=1000")
    assert response.status_code == 200
    data = response.json()

    assert data["years"] == 5
    assert len(data["projections"]) == 5
    assert data["projections"][0]["year"] == 1
    assert data["projections"][4]["year"] == 5

    # Values must compound positively
    val_y1 = data["projections"][0]["portfolio_value"]
    val_y5 = data["projections"][4]["portfolio_value"]
    assert val_y5 > val_y1

    div_y1 = data["projections"][0]["annual_dividend"]
    div_y5 = data["projections"][4]["annual_dividend"]
    assert div_y5 > div_y1


def test_historical_growth_calculation():
    # Insert historical received dividends across 3 years
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO dividend_events (source, external_id, ticker, amount, currency, payment_date, status)
            VALUES
            ('TRADING212', 'div-2023', 'ASML', 500.0, 'EUR', '2023-05-15', 'RECEIVED'),
            ('TRADING212', 'div-2024', 'ASML', 600.0, 'EUR', '2024-05-15', 'RECEIVED'),
            ('TRADING212', 'div-2025', 'ASML', 720.0, 'EUR', '2025-05-15', 'RECEIVED')
            """
        )
        conn.commit()

    response = client.get("/api/v1/analytics/growth")
    assert response.status_code == 200
    data = response.json()

    assert len(data["years"]) == 3
    assert data["years"][0]["year"] == 2023
    assert data["years"][0]["received_amount"] == 500.0
    assert data["years"][1]["year"] == 2024
    assert data["years"][1]["received_amount"] == 600.0
    # Growth 2023 -> 2024 is ((600 - 500) / 500) * 100 = 20.0%
    assert data["years"][1]["growth_rate_percent"] == 20.0
    # CAGR should be calculated
    assert data["cagr_percent"] is not None
    assert data["cagr_percent"] > 0


def test_diversification_empty_portfolio():
    response = client.get("/api/v1/analytics/diversification")
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 0
    assert data["hhi_index"] == 0.0
    assert data["total_holdings_count"] == 0
    assert len(data["metrics"]) == 4


def test_diversification_populated_portfolio():
    # Insert diversified set of holdings
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM holdings")
        cursor.execute(
            """
            INSERT INTO holdings (provider, ticker, name, quantity, average_price, current_price, market_value, currency, sector, dividend_yield, annual_dividend)
            VALUES
            ('TRADING212', 'ASML_NL_EQ', 'ASML Holding', 10, 600.0, 700.0, 7000.0, 'EUR', 'Technology', 1.5, 105.0),
            ('TRADING212', 'SHELL_NL_EQ', 'Shell plc', 100, 25.0, 30.0, 3000.0, 'EUR', 'Energy', 4.0, 120.0),
            ('TRADING212', 'INGA_NL_EQ', 'ING Groep', 200, 12.0, 15.0, 3000.0, 'EUR', 'Financial Services', 5.0, 150.0),
            ('TRADING212', 'AAPL_US_EQ', 'Apple Inc', 20, 150.0, 200.0, 4000.0, 'EUR', 'Technology', 0.5, 20.0),
            ('TRADING212', 'ULVR_GB_EQ', 'Unilever plc', 50, 40.0, 45.0, 2250.0, 'EUR', 'Consumer Defensive', 3.5, 78.75)
            """
        )
        conn.commit()

    response = client.get("/api/v1/analytics/diversification")
    assert response.status_code == 200
    data = response.json()

    assert data["total_holdings_count"] == 5
    assert data["total_sectors_count"] == 4
    assert data["overall_score"] > 0
    assert data["rating"] in ["Highly Diversified", "Well Diversified", "Moderately Concentrated", "High Risk / Concentrated"]
    assert data["hhi_index"] > 0
    assert data["effective_holdings"] > 0
    assert len(data["metrics"]) == 4
    assert len(data["geographic_exposure"]) >= 3
    assert len(data["income_risks"]) == 5
    assert len(data["recommendations"]) >= 1

    technology = next(sector for sector in data["sectors"] if sector["sector"] == "Technology")
    assert [holding["ticker"] for holding in technology["holdings"]] == ["ASML_NL_EQ", "AAPL_US_EQ"]
    assert round(technology["holdings"][0]["percentage"], 2) == 36.36

    united_states = next(region for region in data["geographic_exposure"] if region["region"] == "United States")
    assert [holding["ticker"] for holding in united_states["holdings"]] == ["AAPL_US_EQ"]
