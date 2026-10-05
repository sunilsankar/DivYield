"""Synchronization Pipeline for DivYield.

Coordinates Trading 212 read-only sync into an idempotent, non-blocking pipeline.
"""
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any

from app.credentials import get_trading212_credentials
from app.services.trading212_sync import sync_trading212, _sync_lock as _t212_lock
from app.services.yfinance_enrichment import YahooFinanceEnrichmentService
from app.database import get_db_connection, set_setting, get_setting

_combined_sync_lock = asyncio.Lock()

_sync_progress: Dict[str, Any] = {
    "current_step": 0,
    "total_steps": 8,
    "step_message": None,
}


def get_sync_progress() -> Dict[str, Any]:
    return dict(_sync_progress)


def update_sync_progress(step: int, total: int, message: str) -> None:
    _sync_progress["current_step"] = step
    _sync_progress["total_steps"] = total
    _sync_progress["step_message"] = message


def clear_sync_progress() -> None:
    _sync_progress["current_step"] = 0
    _sync_progress["total_steps"] = 8
    _sync_progress["step_message"] = None


async def run_combined_sync() -> Dict[str, Any]:
    """Execute the full synchronization pipeline:
    1. Trading 212: holdings, transactions, received dividends (Read-Only)
    2. Yahoo Finance: sector, yield, projected upcoming dividends (Free Enrichment)
    3. Update sync logs and status settings.
    """
    if _combined_sync_lock.locked() or _t212_lock.locked():
        return {
            "success": False,
            "status": "already_running",
            "message": "A synchronization job is already actively running.",
            "error": "concurrent_sync_blocked",
        }

    async with _combined_sync_lock:
        update_sync_progress(1, 8, "Initializing synchronization...")
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            t212_creds = get_trading212_credentials()

            if not t212_creds:
                return {
                    "success": False,
                    "status": "not_configured",
                    "message": "Trading 212 API credentials are not configured.",
                    "holdings_count": 0,
                    "orders_count": 0,
                    "transactions_count": 0,
                    "dividends_count": 0,
                    "instruments_enriched": 0,
                    "expected_dividends_added": 0,
                    "last_synced": None,
                }

            # 1. Run Trading 212 sync (Steps 1-7)
            t212_res = await sync_trading212(progress_cb=update_sync_progress)
            overall_success = t212_res.get("success", False)

            # 2. Run Yahoo Finance Enrichment & Future Dividend Projections (Step 8)
            enriched_count = 0
            projected_count = 0
            if overall_success and t212_res.get("holdings_count", 0) > 0:
                update_sync_progress(8, 8, "Enriching holdings & projecting upcoming dividends via Yahoo Finance...")
                try:
                    yf_res = await YahooFinanceEnrichmentService.enrich_portfolio(
                        progress_callback=update_sync_progress,
                        max_workers=4,
                    )
                    enriched_count = yf_res.get("enriched_count", 0)
                    projected_count = yf_res.get("projected_events", 0)
                except Exception as e:
                    # Non-fatal if Yahoo Finance enrichment encounters an issue
                    update_sync_progress(8, 8, f"Yahoo Finance enrichment completed with notice: {e}")

            total_items = (
                t212_res.get("holdings_count", 0)
                + t212_res.get("orders_count", 0)
                + t212_res.get("transactions_count", 0)
                + t212_res.get("dividends_count", 0)
                + projected_count
            )

            with get_db_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO sync_log (provider, status, items_synced, error_message)
                    VALUES ('COMBINED', ?, ?, ?)
                    """,
                    (
                        "SUCCESS" if overall_success else "FAILED",
                        total_items,
                        str(t212_res.get("error") or "")[:250],
                    ),
                )
                conn.commit()

            set_setting("last_synced", now_iso)

            summary_msg = (
                f"Trading 212: {t212_res.get('holdings_count', 0)} holdings, "
                f"{t212_res.get('dividends_count', 0)} received dividends. "
                f"Yahoo Finance: {projected_count} upcoming dividends projected."
            )

            return {
                "success": overall_success,
                "status": "completed" if overall_success else "error",
                "message": summary_msg,
                "holdings_count": t212_res.get("holdings_count", 0),
                "orders_count": t212_res.get("orders_count", 0),
                "transactions_count": t212_res.get("transactions_count", 0),
                "dividends_count": t212_res.get("dividends_count", 0),
                "instruments_enriched": enriched_count,
                "expected_dividends_added": projected_count,
                "account_currency": t212_res.get("account_currency", "EUR"),
                "free_cash": t212_res.get("free_cash", 0.0),
                "total_cash": t212_res.get("total_cash", 0.0),
                "last_synced": now_iso,
                "error": t212_res.get("error"),
            }
        finally:
            clear_sync_progress()
