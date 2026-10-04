"""Tests for Combined Synchronization Pipeline and Router."""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_db_connection
from app.services.combined_sync import run_combined_sync


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_combined_sync.db"
    monkeypatch.setattr("app.config.settings.db_path", test_db)
    init_db(test_db)
    yield


@pytest.mark.anyio
async def test_combined_sync_not_configured():
    with patch("app.services.combined_sync.get_trading212_credentials", return_value=None), \
         patch("app.services.combined_sync.get_eodhd_credentials", return_value=None):
        res = await run_combined_sync()
        assert res["success"] is False
        assert res["status"] == "not_configured"


@pytest.mark.anyio
async def test_combined_sync_full_pipeline():
    mock_t212_creds = {"api_key": "test_key", "api_secret": "test_sec", "environment": "practice"}
    mock_eodhd_creds = {"api_token": "test_token"}

    mock_t212_res = {
        "success": True,
        "status": "completed",
        "message": "Trading 212 synced",
        "holdings_count": 5,
        "orders_count": 10,
        "transactions_count": 8,
        "dividends_count": 4,
        "account_currency": "EUR",
        "free_cash": 1000.0,
        "total_cash": 5000.0,
    }

    mock_enrich_res = {
        "success": True,
        "instruments_enriched": 5,
        "dividend_events_added": 8,
        "errors": [],
    }

    with patch("app.services.combined_sync.get_trading212_credentials", return_value=mock_t212_creds), \
         patch("app.services.combined_sync.get_eodhd_credentials", return_value=mock_eodhd_creds), \
         patch("app.services.combined_sync.sync_trading212", new_callable=AsyncMock, return_value=mock_t212_res), \
         patch("app.services.eodhd_enrichment.EODHDEnrichmentService.enrich_portfolio", new_callable=AsyncMock, return_value=mock_enrich_res):

        res = await run_combined_sync()
        assert res["success"] is True
        assert res["status"] == "completed"
        assert res["holdings_count"] == 5
        assert res["instruments_enriched"] == 5
        assert res["expected_dividends_added"] == 8
        assert "Trading 212: 5 holdings" in res["message"]
        assert "EODHD: 5 enriched" in res["message"]

        # Check sync_log
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT provider, status, items_synced FROM sync_log WHERE provider = 'COMBINED'")
            row = cursor.fetchone()
            assert row is not None
            assert row["status"] == "SUCCESS"
            assert row["items_synced"] == (5 + 10 + 8 + 4 + 5 + 8)


@pytest.mark.anyio
async def test_combined_sync_concurrency_lock():
    from app.services.combined_sync import _combined_sync_lock
    async with _combined_sync_lock:
        res = await run_combined_sync()
        assert res["success"] is False
        assert res["status"] == "already_running"
        assert res["error"] == "concurrent_sync_blocked"


def test_sync_endpoints_e2e():
    client = TestClient(app)

    # 1. Check sync status
    status_resp = client.get("/api/v1/sync/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "is_syncing" in status_data
    assert "trading212_status" in status_data
    assert "eodhd_status" in status_data

    # 2. Trigger sync when unconfigured
    with patch("app.services.combined_sync.get_trading212_credentials", return_value=None), \
         patch("app.services.combined_sync.get_eodhd_credentials", return_value=None):
        sync_resp = client.post("/api/v1/sync")
        assert sync_resp.status_code == 200
        sync_data = sync_resp.json()
        assert sync_data["success"] is False
        assert sync_data["status"] == "not_configured"


def test_sync_progress_tracking():
    from app.services.combined_sync import update_sync_progress, get_sync_progress, clear_sync_progress, _combined_sync_lock
    client = TestClient(app)

    # Initially cleared
    clear_sync_progress()
    prog = get_sync_progress()
    assert prog["current_step"] == 0

    # Set progress
    update_sync_progress(3, 8, "Synchronizing open portfolio holdings...")
    prog = get_sync_progress()
    assert prog["current_step"] == 3
    assert prog["total_steps"] == 8
    assert prog["step_message"] == "Synchronizing open portfolio holdings..."

    # When lock is acquired, /sync/status should reflect progress
    with patch.object(_combined_sync_lock, "locked", return_value=True):
        resp = client.get("/api/v1/sync/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_syncing"] is True
        assert data["current_step"] == 3
        assert data["total_steps"] == 8
        assert data["step_message"] == "Synchronizing open portfolio holdings..."

    clear_sync_progress()
    prog_after = get_sync_progress()
    assert prog_after["current_step"] == 0
