"""Portfolio and Holdings Router."""
from fastapi import APIRouter
from app.database import get_db, get_setting
from app.schemas import PortfolioSummaryResponse, HoldingsResponse, HoldingItem

router = APIRouter(tags=["portfolio"])


@router.get("/portfolio", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary():
    """Retrieve aggregate portfolio valuation, cash balances, and overall performance."""
    currency = get_setting("account_currency", "EUR")
    free_cash = float(get_setting("account_free_cash", "0.0") or 0.0)
    total_cash = float(get_setting("account_total_cash", "0.0") or 0.0)
    last_synced = get_setting("trading212_last_synced")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                COUNT(*) as count,
                COALESCE(SUM(market_value), 0.0) as total_market_value,
                COALESCE(SUM(quantity * average_price), 0.0) as total_invested
            FROM holdings
            WHERE quantity > 0;
            """
        )
        row = cursor.fetchone()
        holdings_count = row["count"] if row else 0
        holdings_val = float(row["total_market_value"]) if row else 0.0
        invested_val = float(row["total_invested"]) if row else 0.0

    unrealized_pnl = holdings_val - invested_val
    unrealized_pnl_percent = (unrealized_pnl / invested_val * 100.0) if invested_val > 0 else 0.0
    total_portfolio_value = holdings_val + free_cash

    return PortfolioSummaryResponse(
        total_value=round(total_portfolio_value, 2),
        holdings_value=round(holdings_val, 2),
        total_invested=round(invested_val, 2),
        unrealized_pnl=round(unrealized_pnl, 2),
        unrealized_pnl_percent=round(unrealized_pnl_percent, 2),
        free_cash=round(free_cash, 2),
        total_cash=round(total_cash, 2),
        currency=currency,
        holdings_count=holdings_count,
        last_synced=last_synced,
    )


@router.get("/holdings", response_model=HoldingsResponse)
async def get_holdings():
    """Retrieve all synchronized portfolio holdings sorted by market value descending."""
    currency = get_setting("account_currency", "EUR")
    holdings_list = []
    total_market_val = 0.0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                id, provider, external_id, ticker, name, isin, currency,
                quantity, average_price, current_price, market_value, updated_at
            FROM holdings
            WHERE quantity > 0
            ORDER BY market_value DESC;
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            qty = float(r["quantity"] or 0.0)
            avg = float(r["average_price"] or 0.0)
            cur = float(r["current_price"] or 0.0)
            mv = float(r["market_value"] or (qty * cur))
            total_market_val += mv

            invested = qty * avg
            gain = mv - invested
            gain_percent = (gain / invested * 100.0) if invested > 0 else 0.0

            holdings_list.append(
                HoldingItem(
                    id=r["id"],
                    provider=r["provider"],
                    external_id=r["external_id"],
                    ticker=r["ticker"] or "",
                    name=r["name"] or r["ticker"] or "",
                    isin=r["isin"],
                    currency=r["currency"] or currency,
                    quantity=round(qty, 4),
                    average_price=round(avg, 4),
                    current_price=round(cur, 4),
                    market_value=round(mv, 2),
                    unrealized_gain=round(gain, 2),
                    unrealized_gain_percent=round(gain_percent, 2),
                    updated_at=r["updated_at"],
                )
            )

    return HoldingsResponse(
        holdings=holdings_list,
        count=len(holdings_list),
        total_market_value=round(total_market_val, 2),
        currency=currency,
    )
