"""Trading 212 Portfolio and Dividend Synchronization Router."""
from fastapi import APIRouter
from app.services.combined_sync import run_combined_sync, _combined_sync_lock, get_sync_progress
from app.services.trading212_sync import _sync_lock as _t212_lock
from app.database import get_setting
from app.schemas import SyncResponse, SyncStatusResponse

router = APIRouter(tags=["sync"])


@router.post("/sync", response_model=SyncResponse)
async def run_sync():
    """Trigger one-click Trading 212 read-only synchronization.

    1. Synchronize Trading 212 holdings, cash, order history, and actual dividends
    2. Record sync logs and status
    """
    result = await run_combined_sync()

    return SyncResponse(
        success=result.get("success", False),
        status=result.get("status", "unknown"),
        message=result.get("message") or result.get("error", "Sync finished"),
        holdings_count=result.get("holdings_count", 0),
        orders_count=result.get("orders_count", 0),
        transactions_count=result.get("transactions_count", 0),
        dividends_count=result.get("dividends_count", 0),
        instruments_enriched=0,
        expected_dividends_added=0,
        account_currency=result.get("account_currency", "EUR"),
        free_cash=result.get("free_cash", 0.0),
        total_cash=result.get("total_cash", 0.0),
        last_synced=result.get("last_synced"),
        eodhd_status=None,
        error=result.get("error"),
    )


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status():
    """Check current synchronization status, concurrency lock, and last sync timestamp."""
    is_syncing = _combined_sync_lock.locked() or _t212_lock.locked()
    last_synced = get_setting("last_synced") or get_setting("trading212_last_synced")
    t212_status = get_setting("trading212_sync_status", "disconnected")
    t212_error = get_setting("trading212_sync_error")
    prog = get_sync_progress()

    return SyncStatusResponse(
        is_syncing=is_syncing,
        last_synced=last_synced,
        trading212_status=t212_status or "disconnected",
        trading212_error=t212_error,
        eodhd_status=None,
        eodhd_last_enriched=None,
        eodhd_error=None,
        current_step=prog.get("current_step", 0) if is_syncing else 0,
        total_steps=prog.get("total_steps", 7) if is_syncing else 0,
        step_message=prog.get("step_message") if is_syncing else None,
    )
