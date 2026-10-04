"""Trading 212 Synchronization Service.

Strict read-only synchronization of holdings, transactions, and dividends into SQLite.
Enforces idempotency, duplicate prevention via external_id, and single-execution locking.
"""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone
import asyncio
from app.credentials import get_trading212_credentials
from app.providers.trading212 import Trading212Client
from app.database import get_db, set_setting

# Concurrency lock to prevent overlapping sync runs
_sync_lock = asyncio.Lock()


def derive_fx_rates(
    portfolio_items: List[Dict[str, Any]],
    metadata_map: Dict[str, Dict[str, Any]],
    account_currency: str = "EUR",
) -> Dict[str, float]:
    """Derive live FX rates to account_currency from positions' local vs EUR PnL."""
    currency_buckets: Dict[str, Dict[str, float]] = {}
    for pos in portfolio_items:
        ext_id = pos.get("ticker", "")
        meta = metadata_map.get(ext_id, {})
        curr = meta.get("currencyCode") or account_currency
        if curr == account_currency:
            continue

        qty = float(pos.get("quantity") or 0.0)
        avg = float(pos.get("averagePrice") or 0.0)
        cur = float(pos.get("currentPrice") or 0.0)
        ppl = float(pos.get("ppl") or 0.0)
        fx_ppl = float(pos.get("fxPpl") or 0.0)

        local_pnl = (cur - avg) * qty
        eur_pnl = ppl - fx_ppl

        if curr not in currency_buckets:
            currency_buckets[curr] = {"local": 0.0, "eur": 0.0}
        currency_buckets[curr]["local"] += local_pnl
        currency_buckets[curr]["eur"] += eur_pnl

    rates: Dict[str, float] = {account_currency: 1.0}
    for curr, totals in currency_buckets.items():
        if abs(totals["local"]) > 0.01:
            rates[curr] = totals["eur"] / totals["local"]

    if "GBP" in rates and "GBX" not in rates:
        rates["GBX"] = rates["GBP"] / 100.0
    elif "GBX" in rates and "GBP" not in rates:
        rates["GBP"] = rates["GBX"] * 100.0

    defaults = {"USD": 0.90, "GBP": 1.17, "GBX": 0.0117, "EUR": 1.0}
    for c, default_rate in defaults.items():
        if c not in rates:
            rates[c] = default_rate

    return rates


async def sync_trading212(progress_cb: Optional[Callable[[int, int, str], None]] = None) -> Dict[str, Any]:
    """Execute full read-only synchronization of Trading 212 data."""
    def _notify(step: int, total: int, msg: str):
        if progress_cb:
            progress_cb(step, total, msg)

    if _sync_lock.locked():
        return {
            "success": False,
            "error": "A synchronization job is already running. Concurrent sync is disallowed.",
            "status": "in_progress",
        }

    async with _sync_lock:
        creds = get_trading212_credentials()
        if not creds:
            return {
                "success": False,
                "error": "Trading 212 API credentials are not configured. Configure them in Settings -> Connections.",
                "status": "not_configured",
            }

        client = Trading212Client(
            api_key=creds["api_key"],
            api_secret=creds.get("api_secret"),
            environment=creds.get("environment", "live"),
        )

        now_iso = datetime.now(timezone.utc).isoformat()

        try:
            # 1. Fetch cash balances and account info
            _notify(1, 8, "Checking Trading 212 account info & cash...")
            cash_data = await client.get_account_cash()
            account_currency = cash_data.get("currency", "EUR") if isinstance(cash_data, dict) else "EUR"
            free_cash = float(cash_data.get("free", 0.0)) if isinstance(cash_data, dict) else 0.0
            total_cash = float(cash_data.get("total", 0.0)) if isinstance(cash_data, dict) else 0.0
            ppl = float(cash_data.get("ppl", 0.0)) if isinstance(cash_data, dict) else 0.0

            set_setting("account_currency", account_currency)
            set_setting("account_free_cash", str(free_cash))
            set_setting("account_total_cash", str(total_cash))
            set_setting("account_ppl", str(ppl))

            # 2. Fetch instrument metadata for company names, ISINs, currencies
            _notify(2, 8, "Fetching Trading 212 instruments metadata...")
            metadata_list = await client.get_instruments_metadata()
            metadata_map: Dict[str, Dict[str, Any]] = {}
            for item in metadata_list:
                ticker_key = item.get("ticker")
                if ticker_key:
                    metadata_map[ticker_key] = item

            # 3. Fetch current open portfolio positions (Holdings)
            _notify(3, 8, "Synchronizing open portfolio holdings...")
            portfolio_items = await client.get_portfolio()
            fx_rates = derive_fx_rates(portfolio_items, metadata_map, account_currency)
            synced_holdings = 0
            active_external_ids = set()

            with get_db() as conn:
                for pos in portfolio_items:
                    ext_id = pos.get("ticker", "")
                    if not ext_id:
                        continue
                    active_external_ids.add(ext_id)

                    meta = metadata_map.get(ext_id, {})
                    raw_ticker = ext_id.split("_")[0] if "_" in ext_id else ext_id
                    name = meta.get("name") or meta.get("shortName") or raw_ticker
                    isin = meta.get("isin", "")
                    local_currency = meta.get("currencyCode") or account_currency
                    fx_rate = float(fx_rates.get(local_currency, 1.0))

                    quantity = float(pos.get("quantity", 0.0))
                    avg_price_local = float(pos.get("averagePrice", 0.0))
                    current_price_local = float(pos.get("currentPrice", 0.0))
                    ppl_eur = float(pos.get("ppl", 0.0))

                    # Convert valuations natively into account_currency (EUR)
                    if current_price_local > 0:
                        market_value = quantity * current_price_local * fx_rate
                    else:
                        market_value = (quantity * avg_price_local * fx_rate) + ppl_eur

                    invested_eur = market_value - ppl_eur
                    average_price = (invested_eur / quantity) if quantity > 0 else (avg_price_local * fx_rate)
                    current_price = current_price_local * fx_rate

                    conn.execute(
                        """
                        INSERT INTO holdings (
                            provider, external_id, ticker, name, isin, currency,
                            quantity, average_price, current_price, market_value, fx_rate, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(provider, external_id) DO UPDATE SET
                            ticker = excluded.ticker,
                            name = excluded.name,
                            isin = excluded.isin,
                            currency = excluded.currency,
                            quantity = excluded.quantity,
                            average_price = excluded.average_price,
                            current_price = excluded.current_price,
                            market_value = excluded.market_value,
                            fx_rate = excluded.fx_rate,
                            updated_at = excluded.updated_at;
                        """,
                        (
                            "trading212",
                            ext_id,
                            raw_ticker,
                            name,
                            isin,
                            account_currency,
                            quantity,
                            average_price,
                            current_price,
                            market_value,
                            fx_rate,
                            now_iso,
                        ),
                    )
                    synced_holdings += 1

                # Clean up any previously stored positions no longer in portfolio
                if active_external_ids:
                    placeholders = ",".join("?" for _ in active_external_ids)
                    conn.execute(
                        f"DELETE FROM holdings WHERE provider = 'trading212' AND external_id NOT IN ({placeholders});",
                        list(active_external_ids),
                    )
                else:
                    conn.execute("DELETE FROM holdings WHERE provider = 'trading212';")

                conn.commit()

            # 4. Fetch orders history
            synced_orders = 0
            try:
                _notify(4, 8, "Synchronizing order history...")
                orders = await client.get_all_orders()

                with get_db() as conn:
                    for ord_item in orders:
                        # Support nested v0 structure {"order": {...}, "fill": {...}} or flat structure
                        inner_order = ord_item.get("order") if isinstance(ord_item.get("order"), dict) else ord_item
                        inner_fill = ord_item.get("fill") if isinstance(ord_item.get("fill"), dict) else ord_item

                        order_id = inner_order.get("id") or ord_item.get("id")
                        if not order_id:
                            continue
                        ext_order_id = f"t212-ord-{order_id}"
                        ticker_raw = inner_order.get("ticker") or ord_item.get("ticker", "")
                        base_ticker = ticker_raw.split("_")[0] if "_" in ticker_raw else ticker_raw

                        date_val = (
                            inner_fill.get("filledAt")
                            or inner_order.get("createdAt")
                            or ord_item.get("dateExecuted")
                            or ord_item.get("dateCreated")
                            or now_iso
                        )

                        fill_qty = float(inner_fill.get("quantity") or ord_item.get("fillQty") or 0.0)
                        fill_price = float(inner_fill.get("price") or ord_item.get("fillPrice") or 0.0)

                        wallet_impact = inner_fill.get("walletImpact") if isinstance(inner_fill.get("walletImpact"), dict) else {}
                        net_val = wallet_impact.get("netValue")
                        fill_cost = float(net_val if net_val is not None else ord_item.get("fillCost") or (abs(fill_qty) * fill_price))

                        side = (inner_order.get("side") or "").upper()
                        order_type = "SELL" if side == "SELL" or fill_qty < 0 else "BUY"
                        status = inner_order.get("status") or ord_item.get("status", "FILLED")

                        conn.execute(
                            """
                            INSERT INTO transactions (
                                date, ticker, type, quantity, price, amount, fees,
                                currency, external_id, source, notes, synced_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(external_id) DO UPDATE SET
                                date = excluded.date,
                                ticker = excluded.ticker,
                                type = excluded.type,
                                quantity = excluded.quantity,
                                price = excluded.price,
                                amount = excluded.amount,
                                notes = excluded.notes,
                                synced_at = excluded.synced_at;
                            """,
                            (
                                date_val,
                                base_ticker,
                                order_type,
                                abs(fill_qty),
                                fill_price,
                                fill_cost,
                                float(ord_item.get("taxes") or 0.0),
                                account_currency,
                                ext_order_id,
                                "TRADING212",
                                f"Order status: {status}",
                                now_iso,
                            ),
                        )
                        synced_orders += 1

                    conn.commit()
            except Exception as exc:
                print(f"[Trading212 Sync] Orders warning: {exc}")

            # 5. Fetch account cash transactions (deposits, interest, withdrawals)
            synced_transactions = 0
            try:
                _notify(5, 8, "Synchronizing cash transactions...")
                transactions = await client.get_all_transactions()

                with get_db() as conn:
                    for tx in transactions:
                        ref = tx.get("reference") or str(tx.get("id", ""))
                        if not ref:
                            continue
                        ext_tx_id = f"t212-tx-{ref}"
                        tx_type = tx.get("type", "CASH").upper()
                        date_val = tx.get("dateTime") or now_iso
                        amount = float(tx.get("amount") or 0.0)
                        currency = tx.get("currency") or account_currency

                        conn.execute(
                            """
                            INSERT INTO transactions (
                                date, ticker, type, quantity, price, amount, fees,
                                currency, external_id, source, notes, synced_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(external_id) DO UPDATE SET
                                date = excluded.date,
                                type = excluded.type,
                                amount = excluded.amount,
                                currency = excluded.currency,
                                synced_at = excluded.synced_at;
                            """,
                            (
                                date_val,
                                "CASH" if "INTEREST" not in tx_type else "INTEREST",
                                tx_type,
                                0.0,
                                0.0,
                                amount,
                                0.0,
                                currency,
                                ext_tx_id,
                                "TRADING212",
                                f"Trading 212 {tx_type}",
                                now_iso,
                            ),
                        )
                        synced_transactions += 1

                    conn.commit()
            except Exception as exc:
                print(f"[Trading212 Sync] Transactions warning: {exc}")

            # 6. Fetch actual received dividends
            synced_dividends = 0
            try:
                _notify(6, 8, "Synchronizing received dividends...")
                dividends = await client.get_all_dividends()

                with get_db() as conn:
                    for div in dividends:
                        ref = div.get("reference") or str(div.get("id", ""))
                        if not ref:
                            continue
                        ext_div_id = f"t212-div-{ref}"
                        ticker_raw = div.get("ticker", "")
                        base_ticker = ticker_raw.split("_")[0] if "_" in ticker_raw else ticker_raw
                        pay_date = div.get("paidOn") or now_iso
                        amount = float(div.get("amountInEuro") or div.get("amount") or div.get("grossAmount") or 0.0)
                        currency = account_currency if div.get("amountInEuro") is not None else (div.get("currency") or account_currency)

                        conn.execute(
                            """
                            INSERT INTO dividend_events (
                                ticker, payment_date, amount, currency, source, status,
                                external_id, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(source, external_id) DO UPDATE SET
                                ticker = excluded.ticker,
                                payment_date = excluded.payment_date,
                                amount = excluded.amount,
                                currency = excluded.currency,
                                status = 'RECEIVED',
                                updated_at = excluded.updated_at;
                            """,
                            (
                                base_ticker,
                                pay_date,
                                amount,
                                currency,
                                "TRADING212",
                                "RECEIVED",
                                ext_div_id,
                                now_iso,
                            ),
                        )
                        synced_dividends += 1

                    conn.commit()
            except Exception as exc:
                print(f"[Trading212 Sync] Dividends warning: {exc}")

            # 7. Update sync metadata in settings
            set_setting("trading212_last_synced", now_iso)
            set_setting("trading212_sync_status", "connected")
            set_setting("trading212_sync_error", "")

            # Log to sync_log
            with get_db() as conn:
                conn.execute(
                    """
                    INSERT INTO sync_log (provider, entity_type, external_id, synced_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(provider, entity_type, external_id) DO UPDATE SET
                        synced_at = excluded.synced_at;
                    """,
                    ("trading212", "full_sync", f"sync-{now_iso}", now_iso),
                )
                conn.commit()

            return {
                "success": True,
                "status": "completed",
                "message": "Trading 212 read-only sync completed successfully.",
                "holdings_count": synced_holdings,
                "orders_count": synced_orders,
                "transactions_count": synced_transactions,
                "dividends_count": synced_dividends,
                "account_currency": account_currency,
                "free_cash": free_cash,
                "total_cash": total_cash,
                "last_synced": now_iso,
            }

        except Exception as exc:
            set_setting("trading212_sync_status", "error")
            set_setting("trading212_sync_error", str(exc))
            return {
                "success": False,
                "status": "error",
                "error": f"Trading 212 synchronization failed: {str(exc)}",
            }
