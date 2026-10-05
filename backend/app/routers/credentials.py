from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.credentials import (
    save_trading212_credentials,
    get_trading212_credentials,
    delete_trading212_credentials,
    mask_secret,
)
from app.database import get_setting, set_setting, delete_setting
from app.providers.trading212 import Trading212Client
from app.schemas import (
    Trading212CredentialsRequest,
    Trading212TestRequest,
    Trading212Status,
    ConnectionsResponse,
    GenericActionResponse,
)

router = APIRouter(tags=["Credentials & Connections"])


@router.get("/connections", response_model=ConnectionsResponse)
def get_connections() -> ConnectionsResponse:
    """Return configured status of Trading 212 with masked secrets."""
    t212_creds = get_trading212_credentials()
    t212_configured = t212_creds is not None and bool(t212_creds.get("api_key"))
    t212_masked = mask_secret(t212_creds["api_key"]) if t212_configured else None
    t212_env = (t212_creds.get("environment") if t212_creds else None) or get_setting("trading212_environment", "live")
    t212_status = get_setting("trading212_status", "disconnected" if not t212_configured else "untested")
    t212_last_checked = get_setting("trading212_last_checked")
    t212_error = get_setting("trading212_error_message")
    t212_currency = get_setting("trading212_account_currency")

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
        eodhd=None,
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
    delete_setting("trading212_error_message")

    return GenericActionResponse(
        success=True,
        message="Trading 212 credentials saved securely.",
        details={"masked_key": mask_secret(req.api_key), "environment": req.environment},
    )


@router.post("/credentials/trading212/test", response_model=Dict[str, Any])
async def test_trading212(req: Trading212TestRequest = Trading212TestRequest()) -> Dict[str, Any]:
    """Test Trading 212 connection using read-only endpoints."""
    if req.api_key:
        api_key = req.api_key
        api_secret = req.api_secret
        env = req.environment or "live"
    else:
        creds = get_trading212_credentials()
        if not creds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Trading 212 credentials found to test. Provide keys or save them first.",
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
