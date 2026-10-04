"""CSV import / export utilities for holdings, transactions and dividends."""
from __future__ import annotations
import csv
import io
from typing import List

from app.database import get_db


HOLDINGS_HEADERS = [
    "ticker", "name", "quantity", "average_price", "current_price",
    "market_value", "currency", "sector", "annual_dividend",
    "dividend_yield", "payout_frequency",
]

TRANSACTIONS_HEADERS = [
    "date", "type", "ticker", "price", "quantity", "amount", "currency", "notes",
]

DIVIDENDS_HEADERS = [
    "ticker", "declaration_date", "ex_dividend_date", "record_date",
    "payment_date", "amount", "currency", "status", "source",
]

YAHOO_PORTFOLIO_HEADERS = [
    "Symbol", "Current Price", "Date", "Time", "Change", "Open", "High", "Low",
    "Volume", "Trade Date", "Purchase Price", "Quantity", "Commission", "High Limit", "Low Limit", "Comment"
]


def holdings_csv() -> str:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ticker, name, quantity, average_price, current_price,
                   market_value, currency, sector, annual_dividend,
                   dividend_yield, payout_frequency
            FROM holdings
            ORDER BY ticker ASC
            """
        )
        rows = cursor.fetchall()
    return _to_csv(HOLDINGS_HEADERS, rows)


def transactions_csv() -> str:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT date, type, ticker, price, quantity, amount, currency, notes
            FROM transactions
            ORDER BY date DESC
            """
        )
        rows = cursor.fetchall()
    return _to_csv(TRANSACTIONS_HEADERS, rows)


def dividends_csv() -> str:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ticker, declaration_date, ex_dividend_date, record_date,
                   payment_date, amount, currency, status, source
            FROM dividend_events
            ORDER BY payment_date DESC
            """
        )
        rows = cursor.fetchall()
    return _to_csv(DIVIDENDS_HEADERS, rows)


def yahoo_portfolio_csv() -> str:
    """Exports portfolio holdings in standard Yahoo Finance portfolio import CSV format."""
    import datetime
    today = datetime.date.today().strftime("%Y-%m-%d")
    today_num = datetime.date.today().strftime("%Y%m%d")
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(YAHOO_PORTFOLIO_HEADERS)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ticker, current_price, average_price, quantity, eodhd_symbol
            FROM holdings
            ORDER BY ticker ASC
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            symbol = r["eodhd_symbol"] or r["ticker"]
            cur_price = round(float(r["current_price"] or 0), 2)
            avg_price = round(float(r["average_price"] or 0), 2)
            qty = float(r["quantity"] or 0)
            writer.writerow([
                symbol, cur_price, today, "16:00", 0.0, cur_price, cur_price, cur_price,
                0, today_num, avg_price, qty, 0.0, "", "", "DivYield Export"
            ])
    return output.getvalue()



def _to_csv(headers: List[str], rows) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([_coerce(row[idx]) for idx in range(len(headers))])
    return output.getvalue()


def _coerce(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def import_holdings_csv(body: str) -> int:
    reader = csv.DictReader(io.StringIO(body))
    missing = [h for h in HOLDINGS_HEADERS if h not in (reader.fieldnames or [])]
    if missing:
        raise ValueError(f"Missing required headers: {missing}")

    count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        for idx, row in enumerate(reader):
            ticker = (row.get("ticker") or "").strip().upper()
            if not ticker:
                continue
            try:
                quantity = float(row.get("quantity") or 0)
                avg_price = float(row.get("average_price") or 0)
                cur_price = float(row.get("current_price") or avg_price)
                market_value = float(row.get("market_value") or quantity * avg_price)
                annual_div = float(row.get("annual_dividend") or 0)
                div_yield = float(row.get("dividend_yield") or 0)
            except ValueError:
                continue
            cursor.execute(
                """
                INSERT OR REPLACE INTO holdings
                  (provider, external_id, ticker, name, quantity, average_price, current_price,
                   market_value, currency, sector, annual_dividend, dividend_yield, payout_frequency)
                VALUES ('CSV_IMPORT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"CSV_H_{idx}_{ticker}",
                    ticker,
                    row.get("name") or ticker,
                    quantity,
                    avg_price,
                    cur_price,
                    market_value,
                    (row.get("currency") or "EUR").upper(),
                    row.get("sector"),
                    annual_div,
                    div_yield,
                    row.get("payout_frequency"),
                ),
            )
            count += 1
        conn.commit()
    return count


def import_transactions_csv(body: str) -> int:
    reader = csv.DictReader(io.StringIO(body))
    missing = [h for h in TRANSACTIONS_HEADERS if h not in (reader.fieldnames or [])]
    if missing:
        raise ValueError(f"Missing required headers: {missing}")

    count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        for idx, row in enumerate(reader):
            tx_type = (row.get("type") or "").upper()
            if tx_type not in {"BUY", "SELL", "DIVIDEND", "CASH", "INTEREST"}:
                continue
            try:
                amount = float(row.get("amount") or 0)
            except ValueError:
                continue
            cursor.execute(
                """
                INSERT OR IGNORE INTO transactions
                  (date, type, ticker, price, quantity, amount, currency, source, external_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'CSV_IMPORT', ?, ?)
                """,
                (
                    row.get("date") or "",
                    tx_type,
                    (row.get("ticker") or "").upper() or None,
                    float(row.get("price") or 0),
                    float(row.get("quantity") or 0),
                    amount,
                    (row.get("currency") or "EUR").upper(),
                    f"CSV_TX_{idx}_{row.get('date')}_{tx_type}",
                    row.get("notes"),
                ),
            )
            count += 1
        conn.commit()
    return count


def import_dividends_csv(body: str) -> int:
    reader = csv.DictReader(io.StringIO(body))
    missing = [h for h in DIVIDENDS_HEADERS if h not in (reader.fieldnames or [])]
    if missing:
        raise ValueError(f"Missing required headers: {missing}")

    count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        for idx, row in enumerate(reader):
            ticker = (row.get("ticker") or "").strip().upper()
            if not ticker:
                continue
            try:
                amount = float(row.get("amount") or 0)
            except ValueError:
                continue
            cursor.execute(
                """
                INSERT OR IGNORE INTO dividend_events
                  (ticker, declaration_date, ex_dividend_date, record_date,
                   payment_date, amount, currency, status, source, external_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ticker,
                    row.get("declaration_date"),
                    row.get("ex_dividend_date"),
                    row.get("record_date"),
                    row.get("payment_date"),
                    amount,
                    (row.get("currency") or "EUR").upper(),
                    (row.get("status") or "EXPECTED").upper(),
                    (row.get("source") or "CSV_IMPORT").upper(),
                    f"CSV_DIV_{idx}_{ticker}_{row.get('payment_date')}",
                ),
            )
            count += 1
        conn.commit()
    return count