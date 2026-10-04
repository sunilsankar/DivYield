"""Trading 212 Read-Only Provider.

STRICT READ-ONLY: Never implements order placement, execution, modification,
cancellation, money transfer, or account mutation.
Automated checks enforce read allowlist and forbid any mutation operations.
"""

from typing import Dict, Any, Optional, List
import asyncio
import base64
import httpx
from app.providers.trading212_allowlist import TRADING212_READ_ALLOWLIST, FORBIDDEN_OPERATIONS

LIVE_BASE_URL = "https://live.trading212.com"
DEMO_BASE_URL = "https://demo.trading212.com"


class Trading212SecurityError(PermissionError):
    """Raised when an operation violates Trading 212 strict read-only policy."""
    pass


class Trading212Client:
    """Strictly read-only client for Trading 212 Public API."""

    def __init__(
        self,
        api_key: str,
        api_secret: Optional[str] = None,
        environment: str = "live",
        timeout: float = 12.0,
        max_retries: int = 3,
    ):
        self.api_key = (api_key or "").strip()
        self.api_secret = (api_secret or "").strip() or None
        self.environment = (environment or "live").strip().lower()
        self.base_host = DEMO_BASE_URL if self.environment == "demo" else LIVE_BASE_URL
        self.timeout = timeout
        self.max_retries = max_retries
        self._active_auth_token: Optional[str] = None

    def _build_auth_candidates(self) -> List[str]:
        """Generate possible auth header formats (Basic key:secret, Basic key, raw key)."""
        if self._active_auth_token:
            return [self._active_auth_token]

        key = self.api_key
        secret = self.api_secret
        candidates: List[str] = []

        if key.startswith("Basic ") or key.startswith("Bearer "):
            return [key]

        if secret:
            combo = f"{key}:{secret}"
            encoded = base64.b64encode(combo.encode("utf-8")).decode("utf-8")
            candidates.append(f"Basic {encoded}")

        if ":" in key:
            encoded = base64.b64encode(key.encode("utf-8")).decode("utf-8")
            candidates.append(f"Basic {encoded}")

        if not secret:
            # Try raw key first, then Basic variations
            candidates.append(key)
            encoded_colon = base64.b64encode(f"{key}:".encode("utf-8")).decode("utf-8")
            candidates.append(f"Basic {encoded_colon}")
            encoded_just = base64.b64encode(key.encode("utf-8")).decode("utf-8")
            candidates.append(f"Basic {encoded_just}")

        return candidates

    def _headers(self, token: Optional[str] = None) -> Dict[str, str]:
        auth_val = token or self._active_auth_token
        if not auth_val:
            auth_val = self._build_auth_candidates()[0]
        return {
            "Authorization": auth_val,
            "Accept": "application/json",
            "User-Agent": "DivYield-Tracker/1.0",
        }

    def _validate_path_security(self, method: str, path: str) -> None:
        """Enforce strict read-only allowlist before network call."""
        if method.upper() != "GET":
            raise Trading212SecurityError(
                f"Security violation: Method '{method}' is forbidden. DivYield Trading 212 provider is strictly GET read-only."
            )

        clean_path = path.split("?")[0]
        # Verify the path is strictly in the allowlist
        if clean_path not in TRADING212_READ_ALLOWLIST:
            raise Trading212SecurityError(
                f"Security violation: Endpoint '{clean_path}' is not in TRADING212_READ_ALLOWLIST."
            )

        # Ensure no forbidden operation keyword is contained in the path or query
        lower_full = path.lower()
        for forbidden in FORBIDDEN_OPERATIONS:
            # We match forbidden keywords as distinct segments or verbs
            if f"/{forbidden}" in lower_full or f"_{forbidden}" in lower_full or f"{forbidden}_" in lower_full:
                raise Trading212SecurityError(
                    f"Security violation: Forbidden operation '{forbidden}' detected in Trading 212 request."
                )

    async def _request(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Execute a validated, rate-limit-aware read request."""
        self._validate_path_security("GET", path)

        url = f"{self.base_host}{path}"
        retries = 0

        while True:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, headers=self._headers(), params=params)

                if response.status_code == 429:
                    retries += 1
                    if retries > self.max_retries:
                        response.raise_for_status()
                    retry_hdr = response.headers.get("Retry-After")
                    try:
                        retry_after = float(retry_hdr) if retry_hdr else 2.0 * retries
                    except (ValueError, TypeError):
                        retry_after = 2.0 * retries
                    await asyncio.sleep(max(1.5, min(retry_after, 10.0)))
                    continue

                response.raise_for_status()
                return response.json() if response.content else {}

            except httpx.HTTPStatusError:
                raise
            except (httpx.ConnectError, httpx.TimeoutException):
                retries += 1
                if retries > self.max_retries:
                    raise
                await asyncio.sleep(1.0 * retries)

    async def test_connection(self) -> Dict[str, Any]:
        """Verify API key authenticity and permissions via read-only endpoints."""
        path = "/api/v0/equity/account/cash"
        self._validate_path_security("GET", path)
        url = f"{self.base_host}{path}"
        candidates = self._build_auth_candidates()
        last_status = None

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                for candidate in candidates:
                    try:
                        response = await client.get(url, headers=self._headers(token=candidate))
                        last_status = response.status_code

                        if response.status_code == 200:
                            self._active_auth_token = candidate
                            data = response.json() if response.content else {}
                            return {
                                "status": "connected",
                                "environment": self.environment,
                                "account_currency": data.get("currency", "EUR") if isinstance(data, dict) else "EUR",
                                "permissions": {
                                    "account_data": True,
                                    "metadata": True,
                                    "orders_execute": False,  # strictly off / unneeded
                                },
                                "message": f"Successfully connected to Trading 212 ({self.environment.upper()})! Read-only mode verified.",
                            }
                        elif response.status_code == 403:
                            break  # credentials recognized but access forbidden (IP or permissions)
                        elif response.status_code == 401:
                            continue  # try other header format
                        else:
                            break
                    except (httpx.ConnectError, httpx.TimeoutException):
                        raise
                    except Exception:
                        continue

            if last_status == 401:
                secret_hint = (
                    " Note: If your Trading 212 account generated an API Secret alongside your Key, both Key and Secret are required for Basic authentication."
                    if not self.api_secret
                    else ""
                )
                env_hint = f" Make sure the environment ('{self.environment.upper()}') matches where you generated the API key in Trading 212."
                return {
                    "status": "invalid_credentials",
                    "environment": self.environment,
                    "message": f"Invalid API credentials (HTTP 401).{secret_hint}{env_hint} Verify 'Account data' is toggled ON.",
                }
            elif last_status == 403:
                return {
                    "status": "access_denied",
                    "environment": self.environment,
                    "message": "Access denied (HTTP 403). Check that 'Account data' permission is enabled and any IP restrictions allow your connection in Trading 212.",
                }
            elif last_status == 429:
                return {
                    "status": "rate_limited",
                    "environment": self.environment,
                    "message": "Rate limit reached. Please wait before retrying.",
                }
            elif last_status and last_status >= 500:
                return {
                    "status": "provider_unavailable",
                    "environment": self.environment,
                    "message": f"Trading 212 service unavailable ({last_status})",
                }
            else:
                return {
                    "status": "error",
                    "environment": self.environment,
                    "message": f"Trading 212 returned HTTP {last_status or 'unknown'}",
                }
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            return {
                "status": "network_failure",
                "environment": self.environment,
                "message": f"Network failure connecting to Trading 212: {str(exc)}",
            }
        except Exception as exc:
            return {
                "status": "error",
                "environment": self.environment,
                "message": f"Connection error: {str(exc)}",
            }

    async def get_account_info(self) -> Dict[str, Any]:
        """Fetch general account metadata (read-only)."""
        return await self._request("/api/v0/equity/account/info")

    async def get_account_cash(self) -> Dict[str, Any]:
        """Fetch cash balance details (read-only)."""
        return await self._request("/api/v0/equity/account/cash")

    async def get_portfolio(self) -> List[Dict[str, Any]]:
        """Fetch open positions in the portfolio (read-only)."""
        res = await self._request("/api/v0/equity/portfolio")
        return res if isinstance(res, list) else []

    async def get_instruments_metadata(self) -> List[Dict[str, Any]]:
        """Fetch instrument metadata catalog (read-only)."""
        res = await self._request("/api/v0/equity/metadata/instruments")
        return res if isinstance(res, list) else []

    async def get_order_history(
        self, cursor: Optional[str] = None, limit: int = 50
    ) -> Dict[str, Any]:
        """Fetch a single page of order history (read-only)."""
        params: Dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        return await self._request("/api/v0/equity/history/orders", params=params)

    async def get_all_orders(self, limit_per_page: int = 50, max_pages: int = 100) -> List[Dict[str, Any]]:
        """Fetch all historical orders across pagination pages (read-only)."""
        all_items: List[Dict[str, Any]] = []
        cursor: Optional[str] = None

        for i in range(max_pages):
            if i > 0:
                await asyncio.sleep(1.0)
            try:
                page_data = await self.get_order_history(cursor=cursor, limit=limit_per_page)
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    break
                raise

            items = page_data.get("items", [])
            all_items.extend(items)

            next_page = page_data.get("nextPagePath")
            if not next_page or not items:
                break

            if "cursor=" in next_page:
                cursor = next_page.split("cursor=")[-1].split("&")[0]
            else:
                break

        return all_items

    async def get_dividends_history(
        self, cursor: Optional[str] = None, limit: int = 50
    ) -> Dict[str, Any]:
        """Fetch a single page of historical received dividends (read-only)."""
        params: Dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        return await self._request("/api/v0/equity/history/dividends", params=params)

    async def get_all_dividends(self, limit_per_page: int = 50, max_pages: int = 100) -> List[Dict[str, Any]]:
        """Fetch all historical received dividends across pagination pages (read-only)."""
        all_items: List[Dict[str, Any]] = []
        cursor: Optional[str] = None

        for i in range(max_pages):
            if i > 0:
                await asyncio.sleep(1.0)
            try:
                page_data = await self.get_dividends_history(cursor=cursor, limit=limit_per_page)
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    break
                raise

            items = page_data.get("items", [])
            all_items.extend(items)

            next_page = page_data.get("nextPagePath")
            if not next_page or not items:
                break

            if "cursor=" in next_page:
                cursor = next_page.split("cursor=")[-1].split("&")[0]
            else:
                break

        return all_items

    async def get_transactions_history(
        self, cursor: Optional[str] = None, limit: int = 50
    ) -> Dict[str, Any]:
        """Fetch a single page of historical cash transactions / deposits / interest (read-only)."""
        if cursor and cursor.startswith("/"):
            return await self._request(cursor)
        params: Dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        return await self._request("/api/v0/equity/history/transactions", params=params)

    async def get_all_transactions(self, limit_per_page: int = 50, max_pages: int = 100) -> List[Dict[str, Any]]:
        """Fetch all historical cash transactions across pagination pages (read-only)."""
        all_items: List[Dict[str, Any]] = []
        cursor: Optional[str] = None

        for i in range(max_pages):
            if i > 0:
                await asyncio.sleep(1.0)
            try:
                page_data = await self.get_transactions_history(cursor=cursor, limit=limit_per_page)
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    break
                raise

            items = page_data.get("items", [])
            all_items.extend(items)

            next_page = page_data.get("nextPagePath")
            if not next_page or not items:
                break

            # Preserve full nextPagePath for transactions (includes required cursor and time)
            cursor = next_page

        return all_items
