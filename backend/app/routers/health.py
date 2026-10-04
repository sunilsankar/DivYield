from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from app.database import get_db

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    database: str
    timestamp: str


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
        app="DivYield",
        database=db_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
