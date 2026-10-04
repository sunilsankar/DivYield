"""Transactions and Order History Router."""
from typing import Optional
from fastapi import APIRouter, Query
from app.database import get_db
from app.schemas import TransactionsResponse, TransactionItem

router = APIRouter(tags=["transactions"])


@router.get("/transactions", response_model=TransactionsResponse)
async def get_transactions(
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    offset: int = Query(0, ge=0, description="Page offset"),
    ticker: Optional[str] = Query(None, description="Filter by ticker"),
    type: Optional[str] = Query(None, description="Filter by transaction type (BUY, SELL, DIVIDEND, CASH, etc.)"),
):
    """Retrieve historical transactions and orders with optional filters and pagination."""
    conditions = []
    params = []

    ticker_val = ticker if isinstance(ticker, str) and ticker.strip() else None
    type_val = type if isinstance(type, str) and type.strip() else None
    limit_val = limit if isinstance(limit, int) else 50
    offset_val = offset if isinstance(offset, int) else 0

    if ticker_val:
        conditions.append("ticker LIKE ?")
        params.append(f"%{ticker_val}%")

    if type_val:
        conditions.append("type = ?")
        params.append(type_val.upper())

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_db() as conn:
        cursor = conn.cursor()

        # Count total matching rows
        cursor.execute(f"SELECT COUNT(*) as cnt FROM transactions {where_clause};", params)
        row = cursor.fetchone()
        total_count = row["cnt"] if row else 0

        # Query paginated rows
        query_sql = f"""
            SELECT
                id, date, ticker, type, quantity, price, amount, fees,
                currency, external_id, source, notes, synced_at
            FROM transactions
            {where_clause}
            ORDER BY date DESC, id DESC
            LIMIT ? OFFSET ?;
        """
        cursor.execute(query_sql, params + [limit_val, offset_val])
        rows = cursor.fetchall()

        items = [
            TransactionItem(
                id=r["id"],
                date=r["date"],
                ticker=r["ticker"],
                type=r["type"],
                quantity=round(float(r["quantity"] or 0.0), 4),
                price=round(float(r["price"] or 0.0), 4),
                amount=round(float(r["amount"] or 0.0), 2),
                fees=round(float(r["fees"] or 0.0), 2),
                currency=r["currency"] or "EUR",
                external_id=r["external_id"],
                source=r["source"],
                notes=r["notes"],
                synced_at=r["synced_at"],
            )
            for r in rows
        ]

    return TransactionsResponse(
        transactions=items,
        total_count=total_count,
        limit=limit_val,
        offset=offset_val,
    )
