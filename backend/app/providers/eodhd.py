"""EODHD Market Data and Dividend Provider."""
import asyncio
from typing import Dict, Any, Optional, List
import httpx

EODHD_BASE_URL = "https://eodhd.com/api"


class EODHDError(Exception):
    """Base exception for EODHD provider errors."""
    pass


class EODHDAuthError(EODHDError):
    """Raised when EODHD API token is invalid or unauthorized."""
    pass


class EODHDRateLimitError(EODHDError):
    """Raised when EODHD API rate limit is exceeded."""
    pass


class EODHDNotFoundError(EODHDError):
    """Raised when requested ticker or resource is not found on EODHD."""
    pass


class EODHDClient:
    """Client for EODHD Market Data and Dividend API."""

    def __init__(self, api_token: str, timeout: float = 12.0, max_retries: int = 3):
        self.api_token = api_token.strip()
        self.timeout = timeout
        self.max_retries = max_retries
        self.base_url = EODHD_BASE_URL

    async def _request(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        expected_status: int = 200,
    ) -> Any:
        """Internal helper to execute GET requests with retry logic and error normalization."""
        merged_params = {"api_token": self.api_token, "fmt": "json"}
        if params:
            merged_params.update(params)

        url = f"{self.base_url}{path}"
        backoff = 0.5

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries):
                try:
                    resp = await client.get(url, params=merged_params)
                    if resp.status_code == expected_status:
                        return resp.json()
                    elif resp.status_code in (401, 403):
                        raise EODHDAuthError(f"EODHD authentication failed (HTTP {resp.status_code}): {resp.text[:200]}")
                    elif resp.status_code == 404:
                        raise EODHDNotFoundError(f"EODHD resource not found for {path}")
                    elif resp.status_code == 429:
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(backoff)
                            backoff *= 2
                            continue
                        raise EODHDRateLimitError("EODHD rate limit exceeded (HTTP 429)")
                    elif resp.status_code >= 500:
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(backoff)
                            backoff *= 2
                            continue
                        raise EODHDError(f"EODHD server error (HTTP {resp.status_code})")
                    else:
                        raise EODHDError(f"EODHD unexpected response (HTTP {resp.status_code}): {resp.text[:200]}")
                except (httpx.ConnectError, httpx.TimeoutException) as exc:
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue
                    raise EODHDError(f"Network error connecting to EODHD: {str(exc)}")

    async def test_connection(self) -> Dict[str, Any]:
        """Validate authentication, basic instrument access, and dividend calendar access."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            # 1. Test basic auth with exchanges list
            exchanges_url = f"{self.base_url}/exchanges-list/?api_token={self.api_token}&fmt=json"
            try:
                base_resp = await client.get(exchanges_url)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                return {
                    "status": "network_failure",
                    "has_dividend_calendar": False,
                    "message": f"Network error connecting to EODHD: {str(exc)}",
                }
            except Exception as exc:
                return {
                    "status": "error",
                    "has_dividend_calendar": False,
                    "message": f"Connection error: {str(exc)}",
                }

            if base_resp.status_code in (401, 403):
                return {
                    "status": "invalid_credentials",
                    "has_dividend_calendar": False,
                    "message": "Invalid EODHD API token or unauthorized access",
                }
            elif base_resp.status_code >= 500:
                return {
                    "status": "provider_unavailable",
                    "has_dividend_calendar": False,
                    "message": f"EODHD service unavailable (HTTP {base_resp.status_code})",
                }
            elif base_resp.status_code != 200:
                return {
                    "status": "error",
                    "has_dividend_calendar": False,
                    "message": f"Unexpected response from EODHD: HTTP {base_resp.status_code}",
                }

            # 2. Test dividend calendar permission
            calendar_url = f"{self.base_url}/calendar/dividends?api_token={self.api_token}&fmt=json&limit=1"
            has_calendar = False
            warning = None
            try:
                cal_resp = await client.get(calendar_url)
                if cal_resp.status_code == 200:
                    has_calendar = True
                elif cal_resp.status_code in (402, 403):
                    has_calendar = False
                    warning = "Dividend Calendar Unavailable (requires EODHD subscription with calendar access)"
                else:
                    has_calendar = False
                    warning = f"Dividend Calendar responded with HTTP {cal_resp.status_code}"
            except Exception as exc:
                has_calendar = False
                warning = f"Could not verify dividend calendar access: {str(exc)}"

            return {
                "status": "connected",
                "has_dividend_calendar": has_calendar,
                "warning": warning,
                "message": "Successfully connected to EODHD" if has_calendar else "Connected (Dividend Calendar Unavailable)",
            }

    async def get_fundamentals(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Retrieve instrument fundamentals (General info, Highlights, Dividends, Valuation)."""
        clean_ticker = ticker.strip().upper()
        try:
            data = await self._request(f"/fundamentals/{clean_ticker}")
            return data
        except EODHDNotFoundError:
            return None

    async def get_dividends(
        self,
        ticker: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve historical and upcoming dividend events for a given ticker."""
        clean_ticker = ticker.strip().upper()
        params = {}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        try:
            data = await self._request(f"/div/{clean_ticker}", params=params)
            if isinstance(data, list):
                return data
            return []
        except EODHDNotFoundError:
            return []

    async def get_dividend_calendar(
        self,
        from_date: str,
        to_date: str,
    ) -> List[Dict[str, Any]]:
        """Retrieve market-wide upcoming dividend events between from_date and to_date."""
        params = {"from": from_date, "to": to_date}
        try:
            data = await self._request("/calendar/dividends", params=params)
            if isinstance(data, dict) and "dividends" in data:
                return data["dividends"]
            elif isinstance(data, list):
                return data
            return []
        except (EODHDNotFoundError, EODHDAuthError):
            # Calendar may not be permitted on basic tier
            return []

    async def get_realtime_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Retrieve real-time or end-of-day price quote for a ticker."""
        clean_ticker = ticker.strip().upper()
        try:
            data = await self._request(f"/real-time/{clean_ticker}")
            if isinstance(data, dict) and "close" in data:
                return data
        except Exception:
            pass

        # Fallback to EOD endpoint
        try:
            eod_data = await self._request(
                f"/eod/{clean_ticker}",
                params={"order": "d", "limit": 1},
            )
            if isinstance(eod_data, list) and len(eod_data) > 0:
                return eod_data[0]
        except Exception:
            return None
        return None

    async def search_symbols(self, query: str) -> List[Dict[str, Any]]:
        """Search instruments across global exchanges."""
        clean_query = query.strip()
        if not clean_query:
            return []
        try:
            data = await self._request(f"/search/{clean_query}")
            if isinstance(data, list):
                return data
            return []
        except Exception:
            return []
