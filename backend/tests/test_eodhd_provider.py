"""Tests for EODHD Market Data and Dividend Provider."""
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from app.providers.eodhd import (
    EODHDClient,
    EODHDError,
    EODHDAuthError,
    EODHDRateLimitError,
    EODHDNotFoundError,
)


@pytest.fixture
def eodhd_client():
    return EODHDClient(api_token="mock_token_12345", timeout=5.0, max_retries=2)


@pytest.mark.anyio
async def test_eodhd_get_fundamentals_success(eodhd_client):
    mock_payload = {
        "General": {
            "Code": "ASML",
            "Name": "ASML Holding NV",
            "Exchange": "AS",
            "Sector": "Technology",
            "Industry": "Semiconductors",
        },
        "Highlights": {
            "DividendYield": 0.0145,
            "DividendShare": 6.10,
        },
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_payload
        mock_get.return_value = mock_resp

        result = await eodhd_client.get_fundamentals("ASML.AS")
        assert result is not None
        assert result["General"]["Name"] == "ASML Holding NV"
        assert result["General"]["Sector"] == "Technology"
        assert result["Highlights"]["DividendYield"] == 0.0145


@pytest.mark.anyio
async def test_eodhd_get_fundamentals_not_found(eodhd_client):
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = "Not Found"
        mock_get.return_value = mock_resp

        result = await eodhd_client.get_fundamentals("NONEXISTENT.AS")
        assert result is None


@pytest.mark.anyio
async def test_eodhd_get_dividends_success(eodhd_client):
    mock_divs = [
        {
            "date": "2026-11-12",
            "declarationDate": "2026-10-15",
            "recordDate": "2026-11-13",
            "paymentDate": "2026-11-28",
            "period": "Quarterly",
            "value": 1.52,
            "unadjustedValue": 1.52,
            "currency": "EUR",
        }
    ]

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_divs
        mock_get.return_value = mock_resp

        result = await eodhd_client.get_dividends("ASML.AS")
        assert len(result) == 1
        assert result[0]["value"] == 1.52
        assert result[0]["paymentDate"] == "2026-11-28"


@pytest.mark.anyio
async def test_eodhd_rate_limit_retry(eodhd_client):
    with patch("httpx.AsyncClient.get") as mock_get, patch("asyncio.sleep", new_callable=AsyncMock):
        resp_429 = MagicMock()
        resp_429.status_code = 429
        resp_429.text = "Rate Limited"

        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.json.return_value = [{"date": "2026-10-01", "value": 0.5}]

        # First returns 429, then retry returns 200
        mock_get.side_effect = [resp_429, resp_200]

        result = await eodhd_client.get_dividends("O.US")
        assert len(result) == 1
        assert result[0]["value"] == 0.5
        assert mock_get.call_count == 2


@pytest.mark.anyio
async def test_eodhd_auth_error(eodhd_client):
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized"
        mock_get.return_value = mock_resp

        with pytest.raises(EODHDAuthError):
            await eodhd_client.get_fundamentals("AAPL.US")


@pytest.mark.anyio
async def test_eodhd_search_symbols(eodhd_client):
    mock_search = [
        {
            "Code": "ASML",
            "Exchange": "AS",
            "Name": "ASML Holding NV",
            "Type": "Common Stock",
            "Country": "Netherlands",
            "Currency": "EUR",
            "ISIN": "NL0010273215",
        }
    ]

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_search
        mock_get.return_value = mock_resp

        result = await eodhd_client.search_symbols("ASML")
        assert len(result) == 1
        assert result[0]["Code"] == "ASML"
        assert result[0]["Exchange"] == "AS"
