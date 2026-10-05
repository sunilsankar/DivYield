import asyncio
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import httpx
from app.main import app
from app.credentials import (
    mask_secret,
    save_trading212_credentials,
    get_trading212_credentials,
    delete_trading212_credentials,
    set_secret,
    get_secret,
    delete_secret,
)
from app.providers.trading212 import Trading212Client


client = TestClient(app)


def test_mask_secret():
    assert mask_secret(None) is None
    assert mask_secret("") is None
    assert mask_secret("123") == "••••••••"
    assert mask_secret("1234") == "••••••••"
    assert mask_secret("abcdef1234") == "••••••••1234"
    assert mask_secret("secret_token_live_9999") == "••••••••9999"


def test_secret_storage_and_encryption():
    key = "test_item_unique_key"
    val = "my_super_secret_value"
    set_secret(key, val)
    assert get_secret(key) == val
    delete_secret(key)
    assert get_secret(key) is None


def test_trading212_credentials_lifecycle():
    delete_trading212_credentials()
    assert get_trading212_credentials() is None

    save_trading212_credentials(api_key="t212_key_xyz", api_secret="t212_sec_123", environment="demo")
    creds = get_trading212_credentials()
    assert creds is not None
    assert creds["api_key"] == "t212_key_xyz"
    assert creds["api_secret"] == "t212_sec_123"
    assert creds["environment"] == "demo"

    delete_trading212_credentials()
    assert get_trading212_credentials() is None


def test_trading212_client_statuses():
    async def _run_tests():
        client_t212 = Trading212Client(api_key="test_key", environment="live")

        # 1. 200 OK -> connected
        mock_resp_200 = httpx.Response(200, json={"currency": "EUR"}, request=httpx.Request("GET", "https://test"))
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp_200
            res = await client_t212.test_connection()
            assert res["status"] == "connected"
            assert res["account_currency"] == "EUR"
            assert res["permissions"]["orders_execute"] is False

        # 2. 401 -> invalid_credentials
        mock_resp_401 = httpx.Response(401, request=httpx.Request("GET", "https://test"))
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp_401
            res = await client_t212.test_connection()
            assert res["status"] == "invalid_credentials"

        # 3. 403 -> access_denied
        mock_resp_403 = httpx.Response(403, request=httpx.Request("GET", "https://test"))
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp_403
            res = await client_t212.test_connection()
            assert res["status"] == "access_denied"

        # 4. 429 -> rate_limited
        mock_resp_429 = httpx.Response(429, request=httpx.Request("GET", "https://test"))
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp_429
            res = await client_t212.test_connection()
            assert res["status"] == "rate_limited"

        # 5. 500 -> provider_unavailable
        mock_resp_500 = httpx.Response(500, request=httpx.Request("GET", "https://test"))
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp_500
            res = await client_t212.test_connection()
            assert res["status"] == "provider_unavailable"

        # 6. Network timeout -> network_failure
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.ConnectTimeout("Connection timed out")
            res = await client_t212.test_connection()
            assert res["status"] == "network_failure"

    asyncio.run(_run_tests())


def test_api_connections_endpoint_never_exposes_raw_credentials():
    save_trading212_credentials(api_key="T212_ULTRA_SECRET_KEY_1234", environment="live")

    response = client.get("/api/v1/connections")
    assert response.status_code == 200
    data = response.json()

    # Verify no raw secrets
    assert "T212_ULTRA_SECRET_KEY_1234" not in response.text

    # Verify masked format
    assert data["trading212"]["configured"] is True
    assert data["trading212"]["masked_key"] == "••••••••1234"

    # Clean up
    delete_trading212_credentials()

    response_cleared = client.get("/api/v1/connections")
    data_cleared = response_cleared.json()
    assert data_cleared["trading212"]["configured"] is False
    assert data_cleared["trading212"]["masked_key"] is None


def test_api_save_and_test_and_delete_endpoints():
    # 1. Save Trading 212
    resp_save_t212 = client.post(
        "/api/v1/credentials/trading212",
        json={"api_key": "raw_t212_key_8888", "environment": "live"},
    )
    assert resp_save_t212.status_code == 200
    assert resp_save_t212.json()["success"] is True
    assert "raw_t212_key_8888" not in resp_save_t212.text
    assert resp_save_t212.json()["details"]["masked_key"] == "••••••••8888"

    # 2. Test Trading 212 with mock
    mock_resp = httpx.Response(200, json={"currency": "EUR"}, request=httpx.Request("GET", "https://test"))
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        resp_test_t212 = client.post("/api/v1/credentials/trading212/test")
        assert resp_test_t212.status_code == 200
        assert resp_test_t212.json()["status"] == "connected"

    # 3. Disconnect Trading 212
    resp_del_t212 = client.delete("/api/v1/credentials/trading212")
    assert resp_del_t212.status_code == 200
    assert resp_del_t212.json()["success"] is True
