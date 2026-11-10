"""User Preferences Router (Base Currency)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_setting, set_setting

router = APIRouter(tags=["preferences"])

SUPPORTED_BASE_CURRENCIES = ("EUR", "USD", "GBP")


class PreferencesPayload(BaseModel):
    base_currency: str


def _current_preferences() -> dict:
    return {
        "base_currency": (get_setting("base_currency") or "EUR").upper(),
        "account_currency": (get_setting("account_currency") or "EUR").upper(),
        "account_currency_source": get_setting("account_currency_source") or "default",
        "supported_base_currencies": list(SUPPORTED_BASE_CURRENCIES),
    }


@router.get("/preferences")
def get_preferences():
    """Return the saved Base Currency and the account currency currently in use."""
    return _current_preferences()


@router.post("/preferences")
def update_preferences(payload: PreferencesPayload):
    """Save the Base Currency preference.

    Each sync uses the account currency Trading 212 reports. Until it reports
    one, the preference is the account currency, so it applies immediately
    instead of waiting for the next sync.
    """
    currency = payload.base_currency.strip().upper()
    if currency not in SUPPORTED_BASE_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail=f"base_currency must be one of {', '.join(SUPPORTED_BASE_CURRENCIES)}",
        )
    set_setting("base_currency", currency)
    if get_setting("account_currency_source") != "trading212":
        set_setting("account_currency", currency)
        set_setting("account_currency_source", "preference")
    return _current_preferences()
