"""Tests for EODHD router and Instrument Mapping endpoints."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from app.main import app
from app.database import get_db_connection

client = TestClient(app)


def test_enrich_endpoint_not_configured():
    with patch("app.routers.eodhd.get_eodhd_credentials", return_value=None):
        resp = client.post("/api/v1/eodhd/enrich")
        assert resp.status_code == 400
        assert "not configured" in resp.json()["detail"]


def test_enrich_endpoint_success():
    mock_creds = {"api_token": "valid_token"}
    with patch("app.routers.eodhd.get_eodhd_credentials", return_value=mock_creds), \
         patch("app.routers.eodhd.EODHDEnrichmentService.enrich_portfolio", new_callable=AsyncMock) as mock_enrich:
        mock_enrich.return_value = {
            "success": True,
            "message": "Enriched 2 instruments",
            "instruments_enriched": 2,
            "dividend_events_added": 4,
            "errors": [],
        }

        resp = client.post("/api/v1/eodhd/enrich")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["instruments_enriched"] == 2
        assert data["dividend_events_added"] == 4


def test_mappings_crud():
    # 1. Create mapping
    payload = {
        "trading212_identifier": "TEST_TICKER_X",
        "eodhd_symbol": "TEST.AS",
        "confidence": "MANUAL",
    }
    create_resp = client.post("/api/v1/mappings", json=payload)
    assert create_resp.status_code == 200
    assert create_resp.json()["success"] is True

    # 2. List mappings and verify
    list_resp = client.get("/api/v1/mappings")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["count"] >= 1
    found = next((m for m in data["mappings"] if m["trading212_identifier"] == "TEST_TICKER_X"), None)
    assert found is not None
    assert found["eodhd_symbol"] == "TEST.AS"
    mapping_id = found["id"]

    # 3. Update mapping (idempotent upsert)
    update_payload = {
        "trading212_identifier": "TEST_TICKER_X",
        "eodhd_symbol": "TEST_UPDATED.AS",
        "confidence": "MANUAL",
    }
    update_resp = client.post("/api/v1/mappings", json=update_payload)
    assert update_resp.status_code == 200

    # Verify updated
    list_resp2 = client.get("/api/v1/mappings")
    found_updated = next((m for m in list_resp2.json()["mappings"] if m["id"] == mapping_id), None)
    assert found_updated is not None
    assert found_updated["eodhd_symbol"] == "TEST_UPDATED.AS"

    # 4. Delete mapping
    del_resp = client.delete(f"/api/v1/mappings/{mapping_id}")
    assert del_resp.status_code == 200

    # Verify deleted
    list_resp3 = client.get("/api/v1/mappings")
    assert not any(m["id"] == mapping_id for m in list_resp3.json()["mappings"])
