"""Manual data entry service for transactions and holdings.

Allows the user to record cash movements, manual holdings, and manual
dividend events that are not tracked by Trading 212 or EODHD. Manual
records use provider = 'MANUAL' and deduplicate via external_id.
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Dict, Optional

from app.database import get_db


def create_manual_holding(
    ticker: str,
    quantity: float,
    average_price: float,
    name: Optional[str] = None,
    currency: str = "EUR",
    sector: Optional[str] = None,
    annual_dividend: float = 0.0,
    dividend_yield: float = 0.0,
    payout_frequency: Optional[str] = None,
    external_id: Optional[str] = None,
) -> Dict:
    if quantity <= 0:
        raise ValueError("quantity must be > 0")
    if average_price < 0:
        raise ValueError("average_price must be >= 0")

    market_value = round(quantity * average_price, 2)
    ext = external_id or f"MANUAL_{ticker}_{datetime.utcnow().isoformat()}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO holdings
              (provider, external_id, ticker, name, quantity, average_price, current_price,
               market_value, currency, sector, annual_dividend, dividend_yield, payout_frequency, updated_at)
            VALUES ('MANUAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(provider, external_id) DO UPDATE SET
              ticker=excluded.ticker,
              name=excluded.name,
              quantity=excluded.quantity,
              average_price=excluded.average_price,
              current_price=excluded.current_price,
              market_value=excluded.market_value,
              currency=excluded.currency,
              sector=excluded.sector,
              annual_dividend=excluded.annual_dividend,
              dividend_yield=excluded.dividend_yield,
              payout_frequency=excluded.payout_frequency,
              updated_at=CURRENT_TIMESTAMP
            """,
            (
                ext,
                ticker.upper(),
                name or ticker.upper(),
                quantity,
                average_price,
                average_price,
                market_value,
                currency,
                sector,
                annual_dividend,
                dividend_yield,
                payout_frequency,
            ),
        )
        conn.commit()

    return {
        "ticker": ticker.upper(),
        "name": name or ticker.upper(),
        "quantity": quantity,
        "average_price": average_price,
        "current_price": average_price,
        "market_value": market_value,
        "currency": currency,
        "provider": "MANUAL",
        "external_id": ext,
        "annual_dividend": annual_dividend,
        "dividend_yield": dividend_yield,
    }


def create_manual_transaction(
    ticker: Optional[str],
    type_: str,
    amount: float,
    currency: str = "EUR",
    date_: Optional[str] = None,
    quantity: Optional[float] = None,
    price: Optional[float] = None,
    notes: Optional[str] = None,
    external_id: Optional[str] = None,
) -> Dict:
    type_upper = type_.upper()
    valid_types = {"BUY", "SELL", "DIVIDEND", "CASH", "INTEREST"}
    if type_upper not in valid_types:
        raise ValueError(f"type must be one of {sorted(valid_types)}")

    tx_date = date_ or date.today().isoformat()
    ext = external_id or f"MANUAL_TX_{type_upper}_{datetime.utcnow().isoformat()}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO transactions
              (date, type, ticker, price, quantity, amount, currency, source, external_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?)
            ON CONFLICT(external_id) DO UPDATE SET
              amount=excluded.amount,
              notes=excluded.notes,
              quantity=excluded.quantity,
              price=excluded.price
            """,
            (
                tx_date,
                type_upper,
                (ticker or "").upper() or None,
                price or 0.0,
                quantity or 0.0,
                amount,
                currency,
                ext,
                notes,
            ),
        )
        conn.commit()

    return {
        "date": tx_date,
        "type": type_upper,
        "ticker": (ticker or "").upper() or None,
        "amount": amount,
        "currency": currency,
        "quantity": quantity or 0.0,
        "price": price or 0.0,
        "source": "MANUAL",
        "external_id": ext,
        "notes": notes,
    }