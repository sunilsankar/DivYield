"""Yahoo Finance Enrichment Service.
Enriches portfolio holdings with sector, industry, yield, and projects
upcoming expected dividends for the next 12 months completely free.
Includes a thread-safe rate limiter and exponential backoff retry to prevent 429 errors.
"""
import asyncio
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from typing import Any, Callable, Dict, List, Optional
import sqlite3

import yfinance as yf
from app.database import get_db

logger = logging.getLogger(__name__)


class YahooRateLimiter:
    """Thread-safe minimum-interval rate limiter with exponential backoff on 429."""

    def __init__(self, calls_per_second: float = 3.0, min_interval: Optional[float] = None):
        if min_interval is not None:
            self.interval = min_interval
        else:
            self.interval = 1.0 / max(0.1, calls_per_second)
        self.last_call = 0.0
        self.lock = threading.Lock()
        self._consecutive_429s = 0
        self._backoff_until = 0.0

    def acquire(self) -> None:
        """Pace requests to ensure we do not exceed calls_per_second and honor backoff."""
        with self.lock:
            now = time.time()
            if now < self._backoff_until:
                time.sleep(self._backoff_until - now)
                now = time.time()

            elapsed = now - self.last_call
            if elapsed < self.interval:
                time.sleep(self.interval - elapsed)
            self.last_call = time.time()

    def on_429_rate_limit(self) -> None:
        with self.lock:
            self._consecutive_429s += 1
            backoff_delay = min(30.0, 2.0 ** min(self._consecutive_429s, 5))
            logger.warning("Yahoo Finance 429 rate limit. Backing off for %.1fs (streak %d)", backoff_delay, self._consecutive_429s)
            self._backoff_until = time.time() + backoff_delay

    def on_success(self) -> None:
        with self.lock:
            self._consecutive_429s = 0

    def handle_rate_limit(self, attempt: int) -> None:
        """Back off when Yahoo Finance responds with HTTP 429."""
        self.on_429_rate_limit()


# Global rate limiter instance (3 calls/sec max across threads)
_global_rate_limiter = YahooRateLimiter(calls_per_second=3.0)


def resolve_yahoo_symbol(ticker: str, conn: Optional[sqlite3.Connection] = None) -> str:
    """Resolve a Trading 212 ticker to its exact Yahoo Finance ticker."""
    clean = ticker.strip()

    # Special ticker mappings
    if clean.upper() == "FB":
        return "META"

    # 1. Check custom user mapping in DB if connection provided
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT yahoo_ticker FROM instrument_mappings WHERE trading212_ticker = ?;",
                (clean,),
            )
            row = cursor.fetchone()
            if row and row["yahoo_ticker"]:
                return row["yahoo_ticker"].strip()
        except Exception:
            pass

    # 2. If already contains dot (like ASML.AS), return as-is
    if "." in clean:
        return clean

    # 3. Check explicit T212 underscore suffixes (e.g. AAPL_US_EQ, ASML_NL_EQ)
    if "_" in clean:
        parts = clean.split("_")
        base = parts[0]
        if len(parts) >= 2:
            suf = parts[1].upper()
            if suf == "US":
                return base.upper()
            elif suf == "NL":
                return f"{base}.AS"
            elif suf in ("GB", "UK"):
                return f"{base}.L"
            elif suf == "DE":
                return f"{base}.DE"
            elif suf == "FR":
                return f"{base}.PA"
            elif suf == "BE":
                return f"{base}.BR"
            elif suf == "IT":
                return f"{base}.MI"
            elif suf == "ES":
                return f"{base}.MC"
            elif suf == "CH":
                return f"{base}.SW"

    # 4. Check lowercase trailing character for exchange
    # E.g. ASMLa -> ASML.AS, RHMd -> RHM.DE, NESFl -> NESF.L, MCp -> MC.PA
    if len(clean) >= 2 and clean[-1].islower():
        char = clean[-1]
        base = clean[:-1]
        if char == "d":
            return f"{base}.DE"
        elif char == "a":
            return f"{base}.AS"
        elif char == "l":
            return f"{base}.L"
        elif char == "p":
            return f"{base}.PA"
        elif char == "e":
            return f"{base}.MC"

    # 5. Default: remove any trailing tags, uppercase
    return clean.split("_")[0].upper()


def _fetch_ticker_enrichment(
    item: Dict[str, Any],
    rate_limiter: YahooRateLimiter,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """Worker function to fetch data from Yahoo Finance for a single holding with rate limiting & retries."""
    t212_ticker = item["ticker"]
    yahoo_symbol = item["yahoo_symbol"]
    quantity = float(item["quantity"] or 0.0)
    fx_rate = float(item["fx_rate"] or 1.0)

    res: Dict[str, Any] = {
        "ticker": t212_ticker,
        "yahoo_symbol": yahoo_symbol,
        "sector": None,
        "industry": None,
        "dividend_yield": 0.0,
        "annual_dividend": 0.0,
        "payout_frequency": None,
        "projected_dividends": [],
    }

    for attempt in range(max_retries):
        rate_limiter.acquire()
        try:
            t = yf.Ticker(yahoo_symbol)
            info = t.info or {}

            res["sector"] = info.get("sector")
            res["industry"] = info.get("industry")

            # Yield and Annual Dividend
            div_rate = float(info.get("dividendRate") or 0.0)
            div_yield = float(info.get("dividendYield") or 0.0)
            if div_yield > 0 and div_yield < 1.0:
                div_yield = round(div_yield * 100.0, 2)

            res["dividend_yield"] = div_yield
            # Store annual dividend per share in EUR
            res["annual_dividend"] = round(div_rate * fx_rate, 4)

            # Historical dividends analysis for frequency & projections
            divs = t.dividends
            if divs is not None and not divs.empty and len(divs) > 0:
                last_date = divs.index[-1].date()
                last_amt = float(divs.iloc[-1])

                # Determine frequency from diff between recent payments
                frequency = "QUARTERLY"
                step_days = 91
                if len(divs) >= 4:
                    avg_diff = (divs.index[-1] - divs.index[-4]).days / 3.0
                    if avg_diff < 45:
                        frequency = "MONTHLY"
                        step_days = 30
                    elif avg_diff < 120:
                        frequency = "QUARTERLY"
                        step_days = 91
                    elif avg_diff < 240:
                        frequency = "SEMI_ANNUAL"
                        step_days = 182
                    else:
                        frequency = "ANNUAL"
                        step_days = 365
                elif len(divs) >= 2:
                    avg_diff = (divs.index[-1] - divs.index[-2]).days
                    if avg_diff < 45:
                        frequency = "MONTHLY"
                        step_days = 30
                    elif avg_diff < 120:
                        frequency = "QUARTERLY"
                        step_days = 91
                    elif avg_diff < 240:
                        frequency = "SEMI_ANNUAL"
                        step_days = 182
                    else:
                        frequency = "ANNUAL"
                        step_days = 365

                res["payout_frequency"] = frequency

                # Project upcoming dividend dates for the next 365 days
                today = date.today()
                step = timedelta(days=step_days)

                # Check if official announced date exists in calendar
                cal_date = None
                try:
                    cal = t.calendar
                    if isinstance(cal, dict):
                        cal_date = cal.get("Dividend Date") or cal.get("Ex-Dividend Date")
                        if isinstance(cal_date, datetime):
                            cal_date = cal_date.date()
                except Exception:
                    pass

                projected_dates: List[date] = []
                if cal_date and cal_date >= today:
                    projected_dates.append(cal_date)
                    next_d = cal_date + step
                else:
                    next_d = last_date + step

                # Advance next_d to future if it is in the past
                while next_d < today:
                    next_d += step

                while next_d <= today + timedelta(days=365):
                    if not projected_dates or (next_d - projected_dates[-1]).days > 20:
                        projected_dates.append(next_d)
                    next_d += step

                # Payout amount per share in EUR
                payout_eur = last_amt * fx_rate
                total_holding_payout = round(payout_eur * quantity, 2)

                for p_date in projected_dates:
                    if total_holding_payout > 0:
                        res["projected_dividends"].append(
                            {
                                "date": p_date.isoformat(),
                                "amount": total_holding_payout,
                            }
                        )

            # Success! Break retry loop
            break

        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "Too Many Requests" in err_msg or "Rate limit" in err_msg:
                rate_limiter.handle_rate_limit(attempt)
                if attempt == max_retries - 1:
                    logger.warning("Rate limit exceeded for %s after %d retries.", yahoo_symbol, max_retries)
            else:
                # 404 or other non-rate-limit error: don't retry
                logger.debug("Failed Yahoo Finance lookup for %s (%s): %s", t212_ticker, yahoo_symbol, e)
                break

    return res


class YahooFinanceEnrichmentService:
    """Orchestrates enrichment for all active holdings using rate limiting."""

    @staticmethod
    async def enrich_portfolio(
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        max_workers: int = 4,
    ) -> Dict[str, Any]:
        """Enrich all active holdings with Yahoo Finance data using rate limiting."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT ticker, external_id, quantity, fx_rate
                FROM holdings
                WHERE quantity > 0
                ORDER BY market_value DESC;
                """
            )
            raw_holdings = cursor.fetchall()

        if not raw_holdings:
            # ponytail: clear stale expected YFINANCE events when no holdings exist
            with get_db() as conn:
                conn.execute(
                    "DELETE FROM dividend_events WHERE status = 'EXPECTED' AND source = 'YFINANCE';"
                )
                conn.commit()
            return {"enriched_count": 0, "projected_events": 0, "status": "no_holdings"}

        # Prepare items with resolved Yahoo symbols
        items: List[Dict[str, Any]] = []
        with get_db() as conn:
            for r in raw_holdings:
                t212_tick = r["ticker"]
                lookup_sym = r["external_id"] or t212_tick
                yf_sym = resolve_yahoo_symbol(lookup_sym, conn)
                if not yf_sym or yf_sym == lookup_sym:
                    yf_sym = resolve_yahoo_symbol(t212_tick, conn)
                items.append(
                    {
                        "ticker": t212_tick,
                        "yahoo_symbol": yf_sym,
                        "quantity": r["quantity"],
                        "fx_rate": r["fx_rate"],
                    }
                )

        total = len(items)
        if progress_callback:
            progress_callback(1, total, f"Connecting to Yahoo Finance for {total} holdings...")

        # Run rate-limited concurrent worker fetches
        loop = asyncio.get_running_loop()
        limiter = _global_rate_limiter

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            enrichment_results = await loop.run_in_executor(
                executor,
                lambda: list(executor.map(lambda it: _fetch_ticker_enrichment(it, limiter), items)),
            )

        # Batch database updates
        enriched_count = 0
        projected_events_count = 0

        with get_db() as conn:
            # ponytail: clear prior forecast events so sold holdings or changed dates leave no phantom rows
            conn.execute(
                "DELETE FROM dividend_events WHERE status = 'EXPECTED' AND source = 'YFINANCE';"
            )

            # 1. Update holdings sector, industry, yield, annual dividend
            for r in enrichment_results:
                tick = r["ticker"]
                sector = r["sector"]
                industry = r["industry"]
                div_yield = r["dividend_yield"]
                ann_div = r["annual_dividend"]
                payout_freq = r["payout_frequency"]

                conn.execute(
                    """
                    UPDATE holdings
                    SET sector = COALESCE(?, sector),
                        industry = COALESCE(?, industry),
                        dividend_yield = CASE WHEN ? > 0 THEN ? ELSE dividend_yield END,
                        annual_dividend = CASE WHEN ? > 0 THEN ? ELSE annual_dividend END,
                        payout_frequency = COALESCE(?, payout_frequency),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE ticker = ?;
                    """,
                    (sector, industry, div_yield, div_yield, ann_div, ann_div, payout_freq, tick),
                )
                enriched_count += 1

                # 2. Insert or update projected EXPECTED dividends
                for proj in r["projected_dividends"]:
                    p_date = proj["date"]
                    p_amount = proj["amount"]
                    ext_id = f"yf-{tick}-{p_date}"

                    conn.execute(
                        """
                        INSERT INTO dividend_events (
                            ticker, payment_date, amount, currency, source, status, external_id, updated_at
                        ) VALUES (?, ?, ?, 'EUR', 'YFINANCE', 'EXPECTED', ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(source, external_id) DO UPDATE SET
                            amount = excluded.amount,
                            payment_date = excluded.payment_date,
                            status = 'EXPECTED',
                            updated_at = CURRENT_TIMESTAMP;
                        """,
                        (tick, p_date, p_amount, ext_id),
                    )
                    projected_events_count += 1

            # 3. Clean up stale past EXPECTED events
            today_str = date.today().isoformat()
            conn.execute(
                """
                DELETE FROM dividend_events
                WHERE status = 'EXPECTED' AND payment_date < ?;
                """,
                (today_str,),
            )
            conn.commit()

        if progress_callback:
            progress_callback(
                total, total, f"Completed enrichment: {enriched_count} holdings, {projected_events_count} upcoming dividends"
            )

        return {
            "enriched_count": enriched_count,
            "projected_events": projected_events_count,
            "status": "success",
        }
