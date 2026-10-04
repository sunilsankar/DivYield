"""Cash interest tracking service.

Computes interest on uninvested cash balances from Trading 212 INTEREST
cash transactions or manual rates. The service pulls all INTEREST-typed
transactions from the transactions table, derives simple interest earned
for each period, and stores the aggregate into cash_interest.
"""
from __future__ import annotations
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from app.database import get_db, set_setting


def compute_periods_from_transactions() -> List[Dict]:
    """Return monthly interest periods derived from INTEREST transactions.

    Each row in the result represents a (period_start, period_end, amount, currency)
    tuple derived from a single INTEREST transaction, used for displaying
    monthly cash interest history.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, date, amount, currency, external_id
            FROM transactions
            WHERE type = 'INTEREST'
            ORDER BY date ASC
            """
        )
        rows = cursor.fetchall()
    results: List[Dict] = []
    for r in rows:
        d = _parse_date(str(r["date"]))
        if d is None:
            continue
        period_end = d
        period_start = (d.replace(day=1)).isoformat()
        results.append(
            {
                "id": r["id"],
                "period_start": period_start,
                "period_end": period_end.isoformat(),
                "interest_earned": float(r["amount"] or 0.0),
                "currency": r["currency"] or "EUR",
                "external_id": r["external_id"],
            }
        )
    return results


def estimate_cash_interest(
    average_balance: float,
    annual_rate_percent: float,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    notes: Optional[str] = None,
    source: str = "MANUAL",
) -> Dict:
    """Compute simple interest for a single period and persist it.

    Returns a summary dict with period dates, computed interest, and the
    estimated daily accrual.
    """
    if annual_rate_percent < 0:
        raise ValueError("annual_rate_percent must be >= 0")
    if average_balance < 0:
        raise ValueError("average_balance must be >= 0")

    today = date.today()
    ps = _parse_date(period_start) if period_start else today.replace(day=1)
    pe = _parse_date(period_end) if period_end else today

    if ps is None or pe is None:
        raise ValueError("period_start and period_end must be valid dates")

    if pe < ps:
        raise ValueError("period_end must be on or after period_start")

    days = (pe - ps).days + 1
    interest = round(average_balance * (annual_rate_percent / 100.0) * (days / 365.0), 4)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO cash_interest
              (source, period_start, period_end, average_balance, annual_rate, interest_earned, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (source, ps.isoformat(), pe.isoformat(), average_balance, annual_rate_percent, interest, notes),
        )
        conn.commit()

    return {
        "source": source,
        "period_start": ps.isoformat(),
        "period_end": pe.isoformat(),
        "days": days,
        "average_balance": round(average_balance, 2),
        "annual_rate": annual_rate_percent,
        "interest_earned": interest,
        "daily_accrual": round(interest / days, 6) if days > 0 else 0.0,
    }


def list_cash_interest(limit: int = 100) -> List[Dict]:
    """Return recently recorded cash interest periods (newest first)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, source, period_start, period_end, average_balance,
                   annual_rate, interest_earned, notes, created_at
            FROM cash_interest
            ORDER BY period_end DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()
    out: List[Dict] = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "source": r["source"],
                "period_start": r["period_start"],
                "period_end": r["period_end"],
                "average_balance": float(r["average_balance"] or 0.0),
                "annual_rate": float(r["annual_rate"] or 0.0),
                "interest_earned": float(r["interest_earned"] or 0.0),
                "notes": r["notes"],
                "created_at": r["created_at"],
            }
        )
    return out


def total_interest_ytd(year: Optional[int] = None) -> float:
    """Return the total interest earned YTD across both persisted cash_interest
    and INTEREST-typed transactions from Trading 212."""
    target_year = year or date.today().year
    total = 0.0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COALESCE(SUM(interest_earned), 0) AS total FROM cash_interest WHERE strftime('%Y', period_end) = ?",
            (str(target_year),),
        )
        row = cursor.fetchone()
        total += float(row["total"] or 0.0)
        cursor.execute(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'INTEREST' AND strftime('%Y', date) = ?",
            (str(target_year),),
        )
        row = cursor.fetchone()
        total += float(row["total"] or 0.0)
    return round(total, 2)


def _parse_date(value: str) -> Optional[date]:
    """Parse an ISO date string. Returns None on failure."""
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None