import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db_connection
from app.services.yfinance_enrichment import (
    resolve_yahoo_symbol,
    YahooRateLimiter,
    YahooFinanceEnrichmentService,
)


def test_resolve_yahoo_symbol_mappings():
    with get_db_connection() as conn:
        # 1. Standard US stock
        assert resolve_yahoo_symbol("AAPL", conn) == "AAPL"
        assert resolve_yahoo_symbol("AAPL_US_EQ", conn) == "AAPL"
        assert resolve_yahoo_symbol("MSFT", conn) == "MSFT"

        # 2. Known overrides
        assert resolve_yahoo_symbol("FB", conn) == "META"

        # 3. European / UK exchange suffixes
        assert resolve_yahoo_symbol("ASML_NL_EQ", conn) == "ASML.AS"
        assert resolve_yahoo_symbol("ASMLa", conn) == "ASML.AS"
        assert resolve_yahoo_symbol("SHEL_GB_EQ", conn) == "SHEL.L"
        assert resolve_yahoo_symbol("SHELl", conn) == "SHEL.L"
        assert resolve_yahoo_symbol("BMW_DE_EQ", conn) == "BMW.DE"
        assert resolve_yahoo_symbol("BMWd", conn) == "BMW.DE"
        assert resolve_yahoo_symbol("MC_FR_EQ", conn) == "MC.PA"
        assert resolve_yahoo_symbol("MCp", conn) == "MC.PA"

        # 4. Custom manual mapping override
        conn.execute(
            """
            INSERT INTO instrument_mappings (trading212_ticker, yahoo_ticker, confidence)
            VALUES ('CUSTOM_TICKER', 'CUSTOM.L', 'MANUAL')
            ON CONFLICT(trading212_ticker) DO UPDATE SET yahoo_ticker = excluded.yahoo_ticker;
            """
        )
        conn.commit()
        assert resolve_yahoo_symbol("CUSTOM_TICKER", conn) == "CUSTOM.L"


def test_yahoo_rate_limiter_pacing():
    limiter = YahooRateLimiter(min_interval=0.05)
    start = time.perf_counter()
    limiter.acquire()
    limiter.acquire()
    elapsed = time.perf_counter() - start
    # Two requests with min_interval 0.05 must take at least 0.045s
    assert elapsed >= 0.04

    # Test backoff and reset
    limiter.on_429_rate_limit()
    assert limiter._consecutive_429s == 1
    assert limiter._backoff_until > time.time()
    limiter.on_success()
    assert limiter._consecutive_429s == 0


def test_mappings_crud_endpoints():
    client = TestClient(app)

    # 1. Create mapping
    resp = client.post(
        "/api/v1/mappings",
        json={"trading212_ticker": "TEST_T212", "yahoo_ticker": "TEST.US"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 2. Get mappings
    resp = client.get("/api/v1/mappings")
    assert resp.status_code == 200
    data = resp.json()
    assert any(m["trading212_ticker"] == "TEST_T212" for m in data["mappings"])
    mapping = next(m for m in data["mappings"] if m["trading212_ticker"] == "TEST_T212")

    # 3. Delete mapping
    del_resp = client.delete(f"/api/v1/mappings/{mapping['id']}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True
