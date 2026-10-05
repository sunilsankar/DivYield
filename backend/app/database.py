import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Generator
from app.config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL DEFAULT 'trading212',
    external_id TEXT,
    ticker TEXT,
    name TEXT,
    isin TEXT,
    currency TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    average_price REAL DEFAULT 0,
    current_price REAL DEFAULT 0,
    market_value REAL DEFAULT 0,
    sector TEXT,
    industry TEXT,
    dividend_yield REAL DEFAULT 0,
    annual_dividend REAL DEFAULT 0,
    payout_frequency TEXT,
    fx_rate REAL DEFAULT 1.0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, external_id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    ticker TEXT,
    type TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    price REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    fees REAL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    external_id TEXT UNIQUE,
    source TEXT NOT NULL DEFAULT 'TRADING212',
    notes TEXT,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);

CREATE TABLE IF NOT EXISTS dividend_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    declaration_date TEXT,
    ex_dividend_date TEXT,
    record_date TEXT,
    payment_date TEXT,
    amount REAL,
    currency TEXT,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'EXPECTED',
    external_id TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, external_id)
);
CREATE INDEX IF NOT EXISTS idx_dividend_events_ticker ON dividend_events(ticker);
CREATE INDEX IF NOT EXISTS idx_dividend_events_payment_date ON dividend_events(payment_date);
CREATE INDEX IF NOT EXISTS idx_dividend_events_status_date ON dividend_events(status, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_qty_market_val ON holdings(quantity, market_value DESC);

CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'SYNC_RUN',
    external_id TEXT,
    status TEXT DEFAULT 'SUCCESS',
    items_synced INTEGER DEFAULT 0,
    error_message TEXT,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, entity_type, external_id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cash_interest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    average_balance REAL NOT NULL,
    annual_rate REAL NOT NULL,
    interest_earned REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'TRADING212',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_cash_interest_period_end ON cash_interest(period_end);

CREATE TABLE IF NOT EXISTS instrument_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trading212_ticker TEXT UNIQUE NOT NULL,
    yahoo_ticker TEXT NOT NULL,
    confidence TEXT DEFAULT 'AUTO',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mappings_t212 ON instrument_mappings(trading212_ticker);
"""

DEFAULT_SETTINGS = [
    ("base_currency", "EUR"),
    ("tax_jurisdiction", "NL"),
    ("sync_frequency", "manual"),
]


def init_db(db_path: Path | None = None) -> None:
    target_path = db_path or settings.db_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(target_path) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.executescript(SCHEMA_SQL)

        cursor = conn.cursor()

        # Migrations for holdings enrichment columns
        cursor.execute("PRAGMA table_info(holdings);")
        existing_cols = {col[1] for col in cursor.fetchall()}
        for col_name, col_def in [
            ("sector", "TEXT"),
            ("industry", "TEXT"),
            ("dividend_yield", "REAL DEFAULT 0"),
            ("annual_dividend", "REAL DEFAULT 0"),
            ("payout_frequency", "TEXT"),
            ("fx_rate", "REAL DEFAULT 1.0"),
        ]:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE holdings ADD COLUMN {col_name} {col_def};")

        # Migrations for sync_log columns
        cursor.execute("PRAGMA table_info(sync_log);")
        existing_sync_cols = {col[1] for col in cursor.fetchall()}
        for col_name, col_def in [
            ("status", "TEXT DEFAULT 'SUCCESS'"),
            ("items_synced", "INTEGER DEFAULT 0"),
            ("error_message", "TEXT"),
        ]:
            if col_name not in existing_sync_cols:
                cursor.execute(f"ALTER TABLE sync_log ADD COLUMN {col_name} {col_def};")

        # Ensure ticker column on transactions is nullable for cash/interest rows
        cursor.execute("PRAGMA table_info(transactions);")
        tx_cols = {col[1]: col for col in cursor.fetchall()}
        if "ticker" in tx_cols and tx_cols["ticker"][3] == 1:
            cursor.execute("ALTER TABLE transactions RENAME COLUMN ticker TO ticker_old;")
            cursor.execute(
                """
                CREATE TABLE transactions_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    ticker TEXT,
                    type TEXT NOT NULL,
                    quantity REAL DEFAULT 0,
                    price REAL DEFAULT 0,
                    amount REAL DEFAULT 0,
                    fees REAL DEFAULT 0,
                    currency TEXT DEFAULT 'EUR',
                    external_id TEXT UNIQUE,
                    source TEXT NOT NULL DEFAULT 'TRADING212',
                    notes TEXT,
                    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cursor.execute(
                """
                INSERT INTO transactions_new
                  (id, date, ticker, type, quantity, price, amount, fees, currency, external_id, source, notes, synced_at)
                SELECT id, date, ticker_old, type, quantity, price, amount, fees, currency, external_id, source, notes, synced_at
                FROM transactions;
                """
            )
            cursor.execute("DROP TABLE transactions;")
            cursor.execute("ALTER TABLE transactions_new RENAME TO transactions;")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);")

        for key, value in DEFAULT_SETTINGS:
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);",
                (key, value),
            )
        conn.commit()


@contextmanager
def get_db(db_path: Path | None = None) -> Generator[sqlite3.Connection, None, None]:
    target_path = db_path or settings.db_path
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


get_db_connection = get_db


def get_setting(key: str, default: str | None = None, db_path: Path | None = None) -> str | None:
    with get_db(db_path) as conn:
        cursor = conn.execute("SELECT value FROM settings WHERE key = ?;", (key,))
        row = cursor.fetchone()
        return row["value"] if row else default


def set_setting(key: str, value: str, db_path: Path | None = None) -> None:
    with get_db(db_path) as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
            (key, value),
        )
        conn.commit()


def delete_setting(key: str, db_path: Path | None = None) -> None:
    with get_db(db_path) as conn:
        conn.execute("DELETE FROM settings WHERE key = ?;", (key,))
        conn.commit()
