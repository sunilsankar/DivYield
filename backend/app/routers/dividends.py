"""Dividends Router for Received (Trading 212) and Expected (EODHD) Dividends."""
from typing import Optional
from fastapi import APIRouter, Query
from app.database import get_db, get_setting
from app.schemas import DividendsResponse, DividendItem, CalendarItem, CalendarResponse

router = APIRouter(tags=["dividends"])


@router.get("/dividends", response_model=DividendsResponse)
async def get_received_dividends():
    """Retrieve all confirmed received dividends (Trading 212 authoritative source)."""
    currency = get_setting("account_currency", "EUR")
    items = []
    total_amount = 0.0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                de.id, de.ticker, de.declaration_date, de.ex_dividend_date, de.record_date,
                de.payment_date, de.amount, de.currency, de.source, de.status, de.external_id, de.updated_at,
                h.name as company_name
            FROM dividend_events de
            LEFT JOIN holdings h ON de.ticker = h.ticker
            WHERE de.status = 'RECEIVED'
            ORDER BY de.payment_date DESC, de.id DESC;
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            amt = float(r["amount"] or 0.0)
            total_amount += amt
            items.append(
                DividendItem(
                    id=r["id"],
                    ticker=r["ticker"],
                    company_name=r["company_name"] or r["ticker"],
                    declaration_date=r["declaration_date"],
                    ex_dividend_date=r["ex_dividend_date"],
                    record_date=r["record_date"],
                    payment_date=r["payment_date"],
                    amount=round(amt, 2),
                    currency=r["currency"] or currency,
                    source=r["source"],
                    status=r["status"],
                    external_id=r["external_id"],
                    updated_at=r["updated_at"],
                )
            )

    return DividendsResponse(
        dividends=items,
        total_amount=round(total_amount, 2),
        currency=currency,
        count=len(items),
    )


@router.get("/dividends/expected", response_model=DividendsResponse)
async def get_expected_dividends():
    """Retrieve upcoming expected dividends (EODHD scheduled events). Never marked as received."""
    currency = get_setting("account_currency", "EUR")
    items = []
    total_amount = 0.0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                de.id, de.ticker, de.declaration_date, de.ex_dividend_date, de.record_date,
                de.payment_date, de.amount, de.currency, de.source, de.status, de.external_id, de.updated_at,
                h.name as company_name
            FROM dividend_events de
            LEFT JOIN holdings h ON de.ticker = h.ticker
            WHERE de.status = 'EXPECTED'
            ORDER BY de.payment_date ASC, de.id ASC;
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            amt = float(r["amount"] or 0.0)
            total_amount += amt
            items.append(
                DividendItem(
                    id=r["id"],
                    ticker=r["ticker"],
                    company_name=r["company_name"] or r["ticker"],
                    declaration_date=r["declaration_date"],
                    ex_dividend_date=r["ex_dividend_date"],
                    record_date=r["record_date"],
                    payment_date=r["payment_date"],
                    amount=round(amt, 2),
                    currency=r["currency"] or currency,
                    source=r["source"],
                    status=r["status"],
                    external_id=r["external_id"],
                    updated_at=r["updated_at"],
                )
            )

    return DividendsResponse(
        dividends=items,
        total_amount=round(total_amount, 2),
        currency=currency,
        count=len(items),
    )


@router.get("/calendar", response_model=CalendarResponse)
async def get_dividend_calendar(
    year: Optional[int] = Query(None, description="Filter by year (e.g. 2026)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (1-12)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    ticker: Optional[str] = Query(None, description="Filter by ticker symbol"),
    status: Optional[str] = Query(None, description="Filter by status (RECEIVED or EXPECTED)"),
):
    """Unified dividend calendar endpoint returning chronological received and expected events."""
    currency = get_setting("account_currency", "EUR")
    events = []
    total_received = 0.0
    total_expected = 0.0

    query = """
        SELECT
            de.id, de.ticker, de.declaration_date, de.ex_dividend_date,
            de.record_date, de.payment_date, de.amount, de.currency,
            de.source, de.status, de.updated_at,
            h.name as company_name
        FROM dividend_events de
        LEFT JOIN holdings h ON de.ticker = h.ticker
        WHERE 1=1
    """
    params = []

    if status and status.upper() in ("RECEIVED", "EXPECTED"):
        query += " AND de.status = ?"
        params.append(status.upper())

    if ticker:
        query += " AND de.ticker LIKE ?"
        params.append(f"%{ticker.strip().upper()}%")

    if year:
        query += " AND (strftime('%Y', de.payment_date) = ? OR strftime('%Y', de.ex_dividend_date) = ?)"
        params.extend([str(year), str(year)])

    if month:
        m_str = f"{month:02d}"
        query += " AND (strftime('%m', de.payment_date) = ? OR strftime('%m', de.ex_dividend_date) = ?)"
        params.extend([m_str, m_str])

    if from_date:
        query += " AND COALESCE(de.payment_date, de.ex_dividend_date) >= ?"
        params.append(from_date)

    if to_date:
        query += " AND COALESCE(de.payment_date, de.ex_dividend_date) <= ?"
        params.append(to_date)

    query += " ORDER BY COALESCE(de.payment_date, de.ex_dividend_date) ASC, de.id ASC;"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        for r in rows:
            amt = float(r["amount"] or 0.0)
            st = r["status"] or "EXPECTED"
            if st == "RECEIVED":
                total_received += amt
            else:
                total_expected += amt

            date_val = r["payment_date"] or r["ex_dividend_date"] or r["declaration_date"]
            events.append(
                CalendarItem(
                    id=r["id"],
                    ticker=r["ticker"],
                    company_name=r["company_name"] or r["ticker"],
                    date=date_val,
                    ex_date=r["ex_dividend_date"],
                    payment_date=r["payment_date"],
                    amount=round(amt, 2),
                    currency=r["currency"] or currency,
                    status=st,
                    source=r["source"],
                    updated_at=r["updated_at"],
                )
            )

    return CalendarResponse(
        events=events,
        total_received=round(total_received, 2),
        total_expected=round(total_expected, 2),
        total_amount=round(total_received + total_expected, 2),
        currency=currency,
        count=len(events),
    )
