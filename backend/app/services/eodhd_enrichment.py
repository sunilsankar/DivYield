"""EODHD Portfolio Enrichment Service.

Enriches Trading 212 holdings with:
- Sector and Industry classification
- Dividend yield and annual dividend estimates
- Historical and upcoming dividend calendar events
- Symbol mapping resolution
"""
import asyncio
from datetime import datetime, date
import sqlite3
from typing import Dict, Any, List, Optional, Tuple
from app.config import settings
from app.credentials import get_eodhd_credentials
from app.database import get_db_connection
from app.providers.eodhd import EODHDClient, EODHDError, EODHDAuthError


def resolve_eodhd_symbol(ticker: str, conn: sqlite3.Connection) -> Tuple[str, str]:
    """Resolve a Trading 212 ticker to an EODHD symbol.
    
    Returns:
        (eodhd_symbol, confidence)
    """
    clean_ticker = ticker.strip().upper()

    # 1. Check existing mapping in SQLite
    cursor = conn.cursor()
    cursor.execute(
        "SELECT eodhd_symbol, confidence FROM instrument_mappings WHERE trading212_identifier = ?",
        (clean_ticker,),
    )
    row = cursor.fetchone()
    if row and row["eodhd_symbol"]:
        return row["eodhd_symbol"], row["confidence"]

    # 2. If already formatted as SYMBOL.EXCHANGE (e.g. ASML.AS, SHEL.AS, ALV.DE)
    if "." in clean_ticker:
        return clean_ticker, "EXACT_TICKER"

    # 3. Known Trading 212 suffixes heuristic
    if clean_ticker.endswith("_NL_EQ"):
        sym = clean_ticker.replace("_NL_EQ", "") + ".AS"
        return sym, "EXCHANGE_QUALIFIED"
    elif clean_ticker.endswith("_US_EQ"):
        sym = clean_ticker.replace("_US_EQ", "") + ".US"
        return sym, "EXCHANGE_QUALIFIED"
    elif clean_ticker.endswith("_DE_EQ"):
        sym = clean_ticker.replace("_DE_EQ", "") + ".XETRA"
        return sym, "EXCHANGE_QUALIFIED"
    elif clean_ticker.endswith("_UK_EQ"):
        sym = clean_ticker.replace("_UK_EQ", "") + ".LSE"
        return sym, "EXCHANGE_QUALIFIED"
    elif clean_ticker.endswith("_FR_EQ"):
        sym = clean_ticker.replace("_FR_EQ", "") + ".PA"
        return sym, "EXCHANGE_QUALIFIED"

    # 4. Single word ticker (like O, AAPL, MSFT) -> Default to US market
    if clean_ticker.isalpha():
        return f"{clean_ticker}.US", "HEURISTIC"

    return clean_ticker, "RAW"


class EODHDEnrichmentService:
    """Enriches holdings and updates dividend schedules using EODHD."""

    def __init__(self, client: Optional[EODHDClient] = None):
        self._client = client
        self._has_fundamentals: bool = True

    def _get_client(self) -> EODHDClient:
        if self._client:
            return self._client
        creds = get_eodhd_credentials()
        if not creds or not creds.get("api_token"):
            raise ValueError("EODHD API token is not configured.")
        return EODHDClient(api_token=creds["api_token"])

    async def enrich_portfolio(
        self, progress_cb: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Fetch enrichment metadata and dividend schedules for all owned holdings."""
        client = self._get_client()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, ticker, quantity, market_value, currency, sector, COALESCE(fx_rate, 1.0) as fx_rate FROM holdings WHERE quantity > 0")
            holdings = cursor.fetchall()

        if not holdings:
            return {
                "success": True,
                "message": "No active holdings to enrich",
                "instruments_enriched": 0,
                "dividend_events_added": 0,
                "errors": [],
            }

        total_holdings = len(holdings)
        completed_count = 0
        instruments_enriched = 0
        dividend_events_added = 0
        errors: List[str] = []
        today_str = date.today().isoformat()
        sem = asyncio.Semaphore(5)
        lock = asyncio.Lock()

        async def _enrich_one(h: Any) -> None:
            nonlocal instruments_enriched, dividend_events_added, completed_count
            holding_id = h["id"]
            ticker = h["ticker"]
            quantity = float(h["quantity"] or 0.0)
            market_val = float(h["market_value"] or 0.0)
            currency = h["currency"] or "EUR"
            fx_rate = float(h["fx_rate"] or 1.0)
            existing_sector = h["sector"]

            async with sem:
                try:
                    with get_db_connection() as conn:
                        eodhd_symbol, confidence = resolve_eodhd_symbol(ticker, conn)
                        conn.execute(
                            """
                            INSERT OR IGNORE INTO instrument_mappings
                            (trading212_identifier, trading212_ticker, eodhd_symbol, confidence)
                            VALUES (?, ?, ?, ?)
                            """,
                            (ticker, ticker, eodhd_symbol, confidence),
                        )
                        conn.commit()

                    sector = existing_sector
                    industry = None
                    div_yield = 0.0
                    annual_div = 0.0
                    payout_freq = None

                    # 1. Attempt fundamentals if tier supports it
                    if self._has_fundamentals:
                        try:
                            fundamentals = await client.get_fundamentals(eodhd_symbol)
                            if fundamentals:
                                general = fundamentals.get("General", {})
                                sector = general.get("Sector") or existing_sector
                                industry = general.get("Industry")
                                highlights = fundamentals.get("Highlights", {})

                                raw_yield = highlights.get("DividendYield")
                                if raw_yield is not None:
                                    try:
                                        div_yield = float(raw_yield)
                                        if 0 < div_yield < 1.0:
                                            div_yield = div_yield * 100.0
                                    except (ValueError, TypeError):
                                        div_yield = 0.0

                                div_share = highlights.get("DividendShare")
                                if div_share is not None:
                                    try:
                                        annual_div = float(div_share) * quantity * fx_rate
                                    except (ValueError, TypeError):
                                        annual_div = market_val * (div_yield / 100.0)
                                elif div_yield > 0:
                                    annual_div = market_val * (div_yield / 100.0)
                            else:
                                # Subscription does not include fundamentals
                                self._has_fundamentals = False
                        except Exception:
                            self._has_fundamentals = False

                    # 2. Fetch dividend history & schedule from EODHD
                    dividends = await client.get_dividends(eodhd_symbol)
                    events_added_this_holding = 0

                    if dividends:
                        # Extract payout frequency and calculate forward yield if not already known
                        valid_divs = [d for d in dividends if float(d.get("value") or d.get("unadjustedValue") or 0.0) > 0]
                        if valid_divs:
                            sorted_divs = sorted(valid_divs, key=lambda d: d.get("date") or "")
                            latest_div = sorted_divs[-1]
                            latest_val = float(latest_div.get("value") or latest_div.get("unadjustedValue") or 0.0)
                            period_raw = (latest_div.get("period") or "").lower()

                            freq_mult = 4
                            if "month" in period_raw:
                                freq_mult = 12
                                payout_freq = "Monthly"
                            elif "semi" in period_raw or "half" in period_raw:
                                freq_mult = 2
                                payout_freq = "Semi-Annual"
                            elif "ann" in period_raw or "year" in period_raw:
                                freq_mult = 1
                                payout_freq = "Annual"
                            else:
                                freq_mult = 4
                                payout_freq = "Quarterly"

                            if annual_div <= 0.0 and latest_val > 0:
                                calc_annual_per_share = latest_val * freq_mult
                                annual_div = calc_annual_per_share * quantity * fx_rate
                                if market_val > 0:
                                    div_yield = round((annual_div / market_val) * 100.0, 2)

                        # Store upcoming scheduled dividend events
                        for div in dividends:
                            pay_date = div.get("paymentDate") or div.get("date")
                            ex_date = div.get("date")
                            record_date = div.get("recordDate")
                            dec_date = div.get("declarationDate")
                            amount = float(div.get("value") or div.get("unadjustedValue") or 0.0)
                            div_curr = "EUR"

                            relevant_date = pay_date or ex_date
                            if relevant_date and relevant_date >= today_str and amount > 0:
                                total_expected_amount = amount * quantity * fx_rate
                                external_id = f"eodhd_{eodhd_symbol}_{relevant_date}_{amount}"

                                with get_db_connection() as conn:
                                    conn.execute(
                                        """
                                        INSERT INTO dividend_events
                                        (ticker, declaration_date, ex_dividend_date, record_date,
                                         payment_date, amount, currency, source, status, external_id)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, 'EODHD', 'EXPECTED', ?)
                                        ON CONFLICT(source, external_id) DO UPDATE SET
                                            declaration_date = excluded.declaration_date,
                                            ex_dividend_date = excluded.ex_dividend_date,
                                            record_date = excluded.record_date,
                                            payment_date = excluded.payment_date,
                                            amount = excluded.amount,
                                            currency = excluded.currency,
                                            updated_at = CURRENT_TIMESTAMP
                                        """,
                                        (
                                            ticker,
                                            dec_date,
                                            ex_date,
                                            record_date,
                                            pay_date,
                                            total_expected_amount,
                                            div_curr,
                                            external_id,
                                        ),
                                    )
                                    conn.commit()
                                events_added_this_holding += 1

                    # 3. Update holding with enriched data
                    with get_db_connection() as conn:
                        conn.execute(
                            """
                            UPDATE holdings
                            SET sector = COALESCE(?, sector, 'Other'),
                                industry = COALESCE(?, industry),
                                dividend_yield = ?,
                                annual_dividend = ?,
                                payout_frequency = COALESCE(?, payout_frequency),
                                eodhd_symbol = ?
                            WHERE id = ?
                            """,
                            (sector, industry, div_yield, annual_div, payout_freq, eodhd_symbol, holding_id),
                        )
                        conn.commit()

                    async with lock:
                        instruments_enriched += 1
                        dividend_events_added += events_added_this_holding

                except Exception as exc:
                    async with lock:
                        errors.append(f"Error enriching {ticker}: {str(exc)}")

                finally:
                    async with lock:
                        completed_count += 1
                        if progress_cb:
                            progress_cb(
                                7,
                                8,
                                f"Enriching instruments with EODHD ({completed_count}/{total_holdings})...",
                            )

        # Run concurrent enrichment tasks
        tasks = [_enrich_one(h) for h in holdings]
        await asyncio.gather(*tasks)

        return {
            "success": len(errors) == 0,
            "message": f"Enriched {instruments_enriched} instruments; added/updated {dividend_events_added} expected dividend events.",
            "instruments_enriched": instruments_enriched,
            "dividend_events_added": dividend_events_added,
            "errors": errors,
        }
