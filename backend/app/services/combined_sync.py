"""Combined Synchronization Pipeline.

Unifies Trading 212 read-only sync and EODHD enrichment into an idempotent,
non-blocking pipeline adhering to the DivYield specifications.
"""
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any

from app.credentials import get_trading212_credentials, get_eodhd_credentials
from app.services.trading212_sync import sync_trading212, _sync_lock as _t212_lock
from app.services.eodhd_enrichment import EODHDEnrichmentService
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
    2. EODHD: instrument enrichment, fundamentals, expected future dividends
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
            eodhd_creds = get_eodhd_credentials()

            if not t212_creds and not eodhd_creds:
                return {
                    "success": False,
                    "status": "not_configured",
                    "message": "Neither Trading 212 nor EODHD credentials are configured.",
                    "holdings_count": 0,
                    "orders_count": 0,
                    "transactions_count": 0,
                    "dividends_count": 0,
                    "instruments_enriched": 0,
                    "expected_dividends_added": 0,
                    "last_synced": None,
                    "eodhd_status": "not_configured",
                }

            t212_res: Dict[str, Any] = {
                "success": True,
                "status": "skipped",
                "holdings_count": 0,
                "orders_count": 0,
                "transactions_count": 0,
                "dividends_count": 0,
                "account_currency": get_setting("account_currency", "EUR"),
                "free_cash": float(get_setting("account_free_cash", "0.0") or 0.0),
                "total_cash": float(get_setting("account_total_cash", "0.0") or 0.0),
                "last_synced": get_setting("trading212_last_synced"),
            }

            # Step 1: Trading 212 Sync
            if t212_creds:
                t212_res = await sync_trading212(progress_cb=update_sync_progress)

            # Step 2: EODHD Enrichment
            enrich_res: Dict[str, Any] = {
                "success": True,
                "instruments_enriched": 0,
                "dividend_events_added": 0,
                "errors": [],
            }

            eodhd_status_str = "not_configured"
            if eodhd_creds and eodhd_creds.get("api_token"):
                update_sync_progress(7, 8, "Enriching instruments with EODHD...")
                try:
                    enrich_service = EODHDEnrichmentService()
                    enrich_res = await enrich_service.enrich_portfolio(progress_cb=update_sync_progress)
                    if enrich_res.get("quota_exceeded"):
                        eodhd_status_str = "quota_limited"
                    else:
                        eodhd_status_str = "connected" if enrich_res.get("success") else "partial_error"
                    set_setting("eodhd_last_enriched", now_iso)
                    set_setting("eodhd_sync_status", eodhd_status_str)
                except Exception as exc:
                    eodhd_status_str = "error"
                    set_setting("eodhd_sync_status", "error")
                    set_setting("eodhd_sync_error", str(exc))
                    enrich_res = {
                        "success": False,
                        "instruments_enriched": 0,
                        "dividend_events_added": 0,
                        "errors": [str(exc)],
                    }

            # Step 3: Record combined sync in sync_log
            update_sync_progress(8, 8, "Finalizing combined sync...")
            overall_success = t212_res.get("success", False) and (
                eodhd_status_str in ("connected", "quota_limited", "not_configured", "skipped")
            )
            total_items = (
                t212_res.get("holdings_count", 0)
                + t212_res.get("orders_count", 0)
                + t212_res.get("transactions_count", 0)
                + t212_res.get("dividends_count", 0)
                + enrich_res.get("instruments_enriched", 0)
                + enrich_res.get("dividend_events_added", 0)
            )

            with get_db_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO sync_log (provider, status, items_synced, error_message)
                    VALUES ('COMBINED', ?, ?, ?)
                    """,
                    (
                        "SUCCESS" if overall_success else "PARTIAL_OR_FAILED",
                        total_items,
                        (
                            str(t212_res.get("error") or enrich_res.get("errors") or "")
                            if not enrich_res.get("quota_exceeded")
                            else "Note: EODHD HTTP 402 quota reached; Trading 212 sync succeeded."
                        )[:250],
                    ),
                )
                conn.commit()

            set_setting("last_synced", now_iso)

            message_parts = []
            if t212_creds:
                message_parts.append(
                    f"Trading 212: {t212_res.get('holdings_count', 0)} holdings, "
                    f"{t212_res.get('dividends_count', 0)} received dividends"
                )
            if eodhd_creds:
                message_parts.append(
                    f"EODHD: {enrich_res.get('instruments_enriched', 0)} enriched, "
                    f"{enrich_res.get('dividend_events_added', 0)} expected dividends"
                )

            summary_msg = "; ".join(message_parts) if message_parts else "Sync completed successfully."

            return {
                "success": overall_success,
                "status": "completed" if overall_success else "partial",
                "message": summary_msg,
                "holdings_count": t212_res.get("holdings_count", 0),
                "orders_count": t212_res.get("orders_count", 0),
                "transactions_count": t212_res.get("transactions_count", 0),
                "dividends_count": t212_res.get("dividends_count", 0),
                "instruments_enriched": enrich_res.get("instruments_enriched", 0),
                "expected_dividends_added": enrich_res.get("dividend_events_added", 0),
                "account_currency": t212_res.get("account_currency", "EUR"),
                "free_cash": t212_res.get("free_cash", 0.0),
                "total_cash": t212_res.get("total_cash", 0.0),
                "last_synced": now_iso,
                "eodhd_status": eodhd_status_str,
                "error": t212_res.get("error") or (", ".join(enrich_res.get("errors", [])) if enrich_res.get("errors") else None),
            }
        finally:
            clear_sync_progress()
