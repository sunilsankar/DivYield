from datetime import datetime, timezone
import time
from typing import Optional
from fastapi import APIRouter
import httpx
from pydantic import BaseModel
from app.config import settings
from app.database import get_db

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    database: str
    timestamp: str


class UpdateCheckResponse(BaseModel):
    current_version: str
    latest_version: Optional[str] = None
    update_available: bool = False
    release_url: Optional[str] = None
    release_name: Optional[str] = None


_cached_update: Optional[UpdateCheckResponse] = None
_last_update_check_time: float = 0.0
UPDATE_CACHE_TTL = 3600.0  # 1 hour


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    db_status = "ok"
    try:
        with get_db() as conn:
            conn.execute("SELECT 1;").fetchone()
    except Exception as exc:
        db_status = f"error: {exc}"

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        app=settings.app_name,
        version=settings.app_version,
        database=db_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/updates", response_model=UpdateCheckResponse)
async def check_for_updates() -> UpdateCheckResponse:
    global _cached_update, _last_update_check_time
    now = time.time()
    if _cached_update is not None and (now - _last_update_check_time) < UPDATE_CACHE_TTL:
        return _cached_update

    curr = settings.app_version.lstrip("v")
    res = UpdateCheckResponse(current_version=settings.app_version)

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                "https://api.github.com/repos/sunilsankar/DivYield/releases/latest",
                headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "DivYield-App"},
            )
            if resp.status_code == 200:
                data = resp.json()
                latest_tag = data.get("tag_name", "").strip()
                latest_clean = latest_tag.lstrip("v")

                is_newer = bool(latest_clean and latest_clean != curr)

                res = UpdateCheckResponse(
                    current_version=settings.app_version,
                    latest_version=latest_tag,
                    update_available=is_newer,
                    release_url=data.get("html_url") or "https://github.com/sunilsankar/DivYield/releases",
                    release_name=data.get("name") or latest_tag,
                )
    except Exception:
        # Gracefully handle network timeouts or rate limits
        pass

    _cached_update = res
    _last_update_check_time = now
    return res

