"""Daily background synchronization scheduler for Windows / desktop backend.

Handles:
1. In-process timer loop while DivYield is running.
2. Windows Task Scheduler (schtasks.exe) registration for background execution when the app is closed.
"""
import asyncio
import logging
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.database import get_setting, set_setting
from app.services.combined_sync import run_combined_sync

logger = logging.getLogger(__name__)


def sync_windows_task_scheduler(freq: str) -> bool:
    # ponytail: schtasks.exe native Windows CLI; upgrade to COM API (win32com) if elevation prompts occur
    if sys.platform != "win32":
        return False

    task_name = "DivYieldDailySync"
    try:
        if freq == "daily":
            if getattr(sys, "frozen", False):
                cmd_tr = f'"{sys.executable}" --worker-once'
            else:
                desktop_py = Path(__file__).resolve().parents[2] / "desktop.py"
                cmd_tr = f'"{sys.executable}" "{desktop_py}" --worker-once'

            cmd = ["schtasks", "/Create", "/TN", task_name, "/SC", "DAILY", "/ST", "03:00", "/TR", cmd_tr, "/F"]
            res = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if res.returncode == 0:
                logger.info("Registered Windows scheduled task: %s", task_name)
                return True
            else:
                logger.warning("schtasks create returned %d: %s", res.returncode, res.stderr)
        elif freq == "manual":
            cmd = ["schtasks", "/Delete", "/TN", task_name, "/F"]
            res = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if res.returncode == 0:
                logger.info("Removed Windows scheduled task: %s", task_name)
                return True
    except Exception as exc:
        logger.warning("Failed to configure Windows Task Scheduler: %s", exc)

    return False


async def check_and_run_auto_sync() -> bool:
    """Checks if daily auto-sync is enabled and due (>24h since last_synced)."""
    freq = get_setting("sync_frequency", "manual")
    if freq != "daily":
        return False

    last_synced = get_setting("last_synced")
    is_due = True
    if last_synced:
        try:
            last_dt = datetime.fromisoformat(last_synced.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            if (now_dt - last_dt).total_seconds() < 24 * 3600:
                is_due = False
        except Exception:
            pass

    if is_due:
        logger.info("Daily auto-sync is due, running combined sync in background...")
        result = await run_combined_sync(source="AUTO")
        logger.info("Daily auto-sync finished: %s", result.get("status"))
        return True

    return False


async def run_scheduler_loop(interval_seconds: int = 1800) -> None:
    """Periodic loop running during app runtime to trigger auto-sync if due."""
    logger.info("Background auto-sync scheduler loop started (interval=%ds).", interval_seconds)
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await check_and_run_auto_sync()
        except asyncio.CancelledError:
            logger.info("Background auto-sync scheduler loop cancelled.")
            break
        except Exception as exc:
            logger.warning("Error in background auto-sync scheduler loop: %s", exc)
