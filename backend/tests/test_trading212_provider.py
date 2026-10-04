"""Tests for Trading 212 Read-Only Provider Security, Pagination, and Allowlist Enforcement."""
import pytest
from unittest.mock import AsyncMock, patch
import httpx
from app.providers.trading212 import Trading212Client, Trading212SecurityError


@pytest.mark.anyio
async def test_client_blocks_forbidden_methods():
    client = Trading212Client(api_key="test-key")
    with pytest.raises(Trading212SecurityError, match="strictly GET read-only"):
        client._validate_path_security("POST", "/api/v0/equity/account/cash")

    with pytest.raises(Trading212SecurityError, match="strictly GET read-only"):
        client._validate_path_security("DELETE", "/api/v0/equity/portfolio")


@pytest.mark.anyio
async def test_client_blocks_non_allowlisted_endpoints():
    client = Trading212Client(api_key="test-key")
    # Endpoint not in allowlist
    with pytest.raises(Trading212SecurityError, match="not in TRADING212_READ_ALLOWLIST"):
        client._validate_path_security("GET", "/api/v0/equity/orders")

    with pytest.raises(Trading212SecurityError, match="not in TRADING212_READ_ALLOWLIST"):
        client._validate_path_security("GET", "/api/v0/admin/settings")


@pytest.mark.anyio
async def test_client_blocks_forbidden_keywords():
    client = Trading212Client(api_key="test-key")
    with pytest.raises(Trading212SecurityError):
        client._validate_path_security("GET", "/api/v0/equity/portfolio/place_order")


@pytest.mark.anyio
async def test_pagination_fetches_all_pages():
    client = Trading212Client(api_key="test-key")

    page_1 = {
        "items": [{"id": 1, "ticker": "ASML_NL_EQ", "fillQty": 10}],
        "nextPagePath": "/api/v0/history/orders?cursor=page2token",
    }
    page_2 = {
        "items": [{"id": 2, "ticker": "SHEL_NL_EQ", "fillQty": 25}],
        "nextPagePath": None,
    }

    async def mock_get_order_history(cursor=None, limit=50):
        if cursor is None:
            return page_1
        elif cursor == "page2token":
            return page_2
        return {"items": [], "nextPagePath": None}

    with patch.object(client, "get_order_history", side_effect=mock_get_order_history):
        orders = await client.get_all_orders()
        assert len(orders) == 2
        assert orders[0]["id"] == 1
        assert orders[1]["id"] == 2


@pytest.mark.anyio
async def test_dividends_pagination():
    client = Trading212Client(api_key="test-key")

    page_1 = {
        "items": [{"reference": "div-1", "ticker": "ASML_NL_EQ", "amount": 15.0}],
        "nextPagePath": "/api/v0/history/dividends?cursor=c2",
    }
    page_2 = {
        "items": [{"reference": "div-2", "ticker": "SHEL_NL_EQ", "amount": 28.5}],
        "nextPagePath": None,
    }

    async def mock_get_div_history(cursor=None, limit=50):
        if cursor is None:
            return page_1
        return page_2

    with patch.object(client, "get_dividends_history", side_effect=mock_get_div_history):
        dividends = await client.get_all_dividends()
        assert len(dividends) == 2
        assert dividends[0]["reference"] == "div-1"
        assert dividends[1]["reference"] == "div-2"


@pytest.mark.anyio
async def test_rate_limit_retry():
    client = Trading212Client(api_key="test-key", max_retries=2)

    # First call returns 429, second returns 200
    mock_resp_429 = httpx.Response(
        status_code=429,
        headers={"Retry-After": "0.01"},
        request=httpx.Request("GET", "https://live.trading212.com/api/v0/equity/account/cash"),
    )
    mock_resp_200 = httpx.Response(
        status_code=200,
        json={"currency": "EUR", "free": 500.0},
        request=httpx.Request("GET", "https://live.trading212.com/api/v0/equity/account/cash"),
    )

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[mock_resp_429, mock_resp_200])

    with patch("httpx.AsyncClient") as mock_async_client:
        mock_async_client.return_value.__aenter__.return_value = mock_client
        data = await client.get_account_cash()
        assert data["currency"] == "EUR"
        assert data["free"] == 500.0
        assert mock_client.get.call_count == 2
