from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.credentials import (
    save_trading212_credentials,
    get_trading212_credentials,
    delete_trading212_credentials,
    save_eodhd_credentials,
    get_eodhd_credentials,
    delete_eodhd_credentials,
    mask_secret,
)
from app.database import get_setting, set_setting, delete_setting
from app.providers.trading212 import Trading212Client
from app.providers.eodhd import EODHDClient
from app.schemas import (
    Trading212CredentialsRequest,
    Trading212TestRequest,
    EODHDCredentialsRequest,
    EODHDTestRequest,
    Trading212Status,
    EODHDStatus,
    ConnectionsResponse,
    GenericActionResponse,
)

router = APIRouter(tags=["Credentials & Connections"])


@router.get("/connections", response_model=ConnectionsResponse)
def get_connections() -> ConnectionsResponse:
    """Get masked connection status for Trading 212 and EODHD. Never returns secrets."""
    # 1. Trading 212
    t212_creds = get_trading212_credentials()
    t212_configured = t212_creds is not None and bool(t212_creds.get("api_key"))
    t212_masked = mask_secret(t212_creds["api_key"]) if t212_configured else None
    t212_env = (t212_creds.get("environment") if t212_creds else None) or get_setting("trading212_environment", "live")
    t212_status = get_setting("trading212_status", "disconnected" if not t212_configured else "untested")
    t212_last_checked = get_setting("trading212_last_checked")
    t212_error = get_setting("trading212_error_message")
    t212_currency = get_setting("trading212_account_currency")

    # 2. EODHD
    eodhd_creds = get_eodhd_credentials()
    eodhd_configured = eodhd_creds is not None and bool(eodhd_creds.get("api_token"))
    eodhd_masked = mask_secret(eodhd_creds["api_token"]) if eodhd_configured else None
    eodhd_status = get_setting("eodhd_status", "disconnected" if not eodhd_configured else "untested")
    eodhd_has_calendar_str = get_setting("eodhd_has_calendar")
    eodhd_has_calendar = eodhd_has_calendar_str == "true" if eodhd_has_calendar_str is not None else None
    eodhd_last_checked = get_setting("eodhd_last_checked")
    eodhd_error = get_setting("eodhd_error_message")

    return ConnectionsResponse(
        trading212=Trading212Status(
            configured=t212_configured,
            environment=t212_env,
            masked_key=t212_masked,
            status=t212_status,
            last_checked=t212_last_checked,
            error_message=t212_error,
            account_currency=t212_currency,
        ),
        eodhd=EODHDStatus(
            configured=eodhd_configured,
            masked_token=eodhd_masked,
            status=eodhd_status,
            has_dividend_calendar=eodhd_has_calendar,
            last_checked=eodhd_last_checked,
            error_message=eodhd_error,
        ),
    )


# Trading 212 Endpoints

@router.post("/credentials/trading212", response_model=GenericActionResponse)
def save_trading212(req: Trading212CredentialsRequest) -> GenericActionResponse:
    """Save Trading 212 API credentials securely in OS keychain / encrypted store."""
    save_trading212_credentials(
        api_key=req.api_key,
        api_secret=req.api_secret,
        environment=req.environment,
    )
    set_setting("trading212_status", "untested")
    set_setting("trading212_environment", req.environment)
    delete_setting("trading212_error_message")

    return GenericActionResponse(
        success=True,
        message="Trading 212 credentials saved securely. Raw secrets are never stored in browser or SQLite.",
        details={"environment": req.environment, "masked_key": mask_secret(req.api_key)},
    )


@router.post("/credentials/trading212/test", response_model=Dict[str, Any])
async def test_trading212(req: Trading212TestRequest = Trading212TestRequest()) -> Dict[str, Any]:
    """Test Trading 212 API connectivity and permissions using read-only endpoints."""
    # Determine which credentials to test: from payload or stored
    if req.api_key:
        api_key = req.api_key
        api_secret = req.api_secret
        env = req.environment or "live"
    else:
        creds = get_trading212_credentials()
        if not creds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Trading 212 credentials found to test. Provide credentials or save them first.",
            )
        api_key = creds["api_key"]
        api_secret = creds.get("api_secret")
        env = creds.get("environment", "live")

    client = Trading212Client(api_key=api_key, api_secret=api_secret, environment=env)
    result = await client.test_connection()

    now_iso = datetime.now(timezone.utc).isoformat()
    set_setting("trading212_last_checked", now_iso)
    set_setting("trading212_status", result["status"])
    if result["status"] == "connected":
        delete_setting("trading212_error_message")
        if "account_currency" in result:
            set_setting("trading212_account_currency", result["account_currency"])
    else:
        set_setting("trading212_error_message", result.get("message", "Unknown error"))

    return result


@router.delete("/credentials/trading212", response_model=GenericActionResponse)
def delete_trading212() -> GenericActionResponse:
    """Disconnect and delete Trading 212 credentials."""
    delete_trading212_credentials()
    set_setting("trading212_status", "disconnected")
    delete_setting("trading212_last_checked")
    delete_setting("trading212_error_message")
    delete_setting("trading212_account_currency")

    return GenericActionResponse(
        success=True,
        message="Trading 212 credentials disconnected and removed from secure storage.",
    )


# EODHD Endpoints

@router.post("/credentials/eodhd", response_model=GenericActionResponse)
def save_eodhd(req: EODHDCredentialsRequest) -> GenericActionResponse:
    """Save EODHD API token securely in OS keychain / encrypted store."""
    save_eodhd_credentials(api_token=req.api_token)
    set_setting("eodhd_status", "untested")
    delete_setting("eodhd_error_message")

    return GenericActionResponse(
        success=True,
        message="EODHD credentials saved securely.",
        details={"masked_token": mask_secret(req.api_token)},
    )


@router.post("/credentials/eodhd/test", response_model=Dict[str, Any])
async def test_eodhd(req: EODHDTestRequest = EODHDTestRequest()) -> Dict[str, Any]:
    """Test EODHD API connectivity and dividend calendar access."""
    if req.api_token:
        api_token = req.api_token
    else:
        creds = get_eodhd_credentials()
        if not creds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No EODHD credentials found to test. Provide token or save it first.",
            )
        api_token = creds["api_token"]

    client = EODHDClient(api_token=api_token)
    result = await client.test_connection()

    now_iso = datetime.now(timezone.utc).isoformat()
    set_setting("eodhd_last_checked", now_iso)
    set_setting("eodhd_status", result["status"])
    set_setting("eodhd_has_calendar", "true" if result.get("has_dividend_calendar") else "false")
    if result["status"] == "connected":
        if result.get("warning"):
            set_setting("eodhd_error_message", result["warning"])
        else:
            delete_setting("eodhd_error_message")
    else:
        set_setting("eodhd_error_message", result.get("message", "Unknown error"))

    return result


@router.delete("/credentials/eodhd", response_model=GenericActionResponse)
def delete_eodhd() -> GenericActionResponse:
    """Disconnect and delete EODHD credentials."""
    delete_eodhd_credentials()
    set_setting("eodhd_status", "disconnected")
    delete_setting("eodhd_last_checked")
    delete_setting("eodhd_error_message")
    delete_setting("eodhd_has_calendar")

    return GenericActionResponse(
        success=True,
        message="EODHD credentials disconnected and removed from secure storage.",
    )
