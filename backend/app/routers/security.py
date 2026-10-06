"""Security and app password router for desktop app lock."""
from fastapi import APIRouter, HTTPException
from app.credentials import (
    has_app_password,
    verify_app_password,
    set_app_password,
    delete_app_password,
)
from app.schemas import (
    SecurityStatusResponse,
    PasswordVerifyRequest,
    PasswordVerifyResponse,
    PasswordSetRequest,
    PasswordRemoveRequest,
    GenericActionResponse,
)

router = APIRouter(prefix="/security", tags=["security"])


@router.get("/status", response_model=SecurityStatusResponse)
def get_security_status() -> SecurityStatusResponse:
    """Return whether an application lock password is set."""
    return SecurityStatusResponse(is_password_set=has_app_password())


@router.post("/verify", response_model=PasswordVerifyResponse)
def verify_password(req: PasswordVerifyRequest) -> PasswordVerifyResponse:
    """Verify application lock password."""
    is_valid = verify_app_password(req.password)
    return PasswordVerifyResponse(valid=is_valid)


@router.post("/set", response_model=GenericActionResponse)
def set_password(req: PasswordSetRequest) -> GenericActionResponse:
    """Set or update application lock password."""
    if has_app_password():
        if not req.current_password or not verify_app_password(req.current_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

    set_app_password(req.password)
    return GenericActionResponse(success=True, message="Application password set successfully.")


@router.post("/remove", response_model=GenericActionResponse)
def remove_password(req: PasswordRemoveRequest) -> GenericActionResponse:
    """Remove application lock password."""
    if not verify_app_password(req.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    delete_app_password()
    return GenericActionResponse(success=True, message="Application password removed successfully.")
