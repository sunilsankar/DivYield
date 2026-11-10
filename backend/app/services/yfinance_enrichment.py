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

    # 1. Check custom user mapping in DB if connection provided. Holdings pass
    #    the full Trading 212 id (JEPQl_EQ), while mappings are often keyed on
    #    the short ticker (JEPQl), so try both.
    if conn:
        keys = [clean]
        if "_" in clean and clean.split("_")[0]:
            keys.append(clean.split("_")[0])
        try:
            cursor = conn.cursor()
            for key in keys:
                cursor.execute(
                    "SELECT yahoo_ticker FROM instrument_mappings WHERE trading212_ticker = ?;",
                    (key,),
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
        # No country code (e.g. JEPQl_EQ, RHMd_EQ): the exchange is the
        # lowercase letter on the base ticker, handled below.
        clean = base

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


# Yahoo quotes these in 1/100 of the currency (pence, cents, agorot).
_MINOR_UNIT_CURRENCIES = {"GBp", "GBX", "ZAc", "ILA"}


def _yahoo_price(info: Dict[str, Any]) -> float:
    for key in ("regularMarketPrice", "currentPrice", "previousClose", "navPrice"):
        try:
            value = float(info.get(key) or 0.0)
        except (TypeError, ValueError):
            continue
        if value > 0:
            return value
    return 0.0


def _account_converter(yahoo_price: float, holding_price: float, fx_rate: float) -> Callable[[float], float]:
    """Convert an amount quoted like Yahoo's price into the account currency."""
    if yahoo_price > 0 and holding_price > 0:
        ratio = holding_price / yahoo_price
        return lambda amount: amount * ratio
    return lambda amount: amount * fx_rate


def _annual_dividend_per_share(info: Dict[str, Any], divs: Any) -> float:
    """Forward rate if Yahoo has one, else the trailing 12 months of payouts.

    ETFs (e.g. JEPQ.L, VUSA.L) usually have no dividendRate. Returned in the
    same unit as Yahoo's price: for lines quoted in minor units (London GBp),
    Yahoo gives the rate fields in major units (BA.L: price 1883 GBp, rate
    0.38 GBP) but the payout history in minor units, so the rates are scaled.
    """
    minor_unit = str(info.get("currency") or "") in _MINOR_UNIT_CURRENCIES
    for key in ("dividendRate", "trailingAnnualDividendRate"):
        try:
            value = float(info.get(key) or 0.0)
        except (TypeError, ValueError):
            value = 0.0
        if value > 0:
            return value * 100.0 if minor_unit else value
    if divs is None or getattr(divs, "empty", True):
        return 0.0
    try:
        idx = divs.index
        now = datetime.now(idx.tz) if getattr(idx, "tz", None) is not None else datetime.now()
        recent = divs[idx >= now - timedelta(days=365)]
        return float(recent.sum())
    except Exception:
        return 0.0


def _info_yield_percent(info: Dict[str, Any]) -> float:
    """Yield in percent when no price is available to compute it.

    yfinance >= 0.2.54 reports dividendYield in percent (0.31 = 0.31%), while
    the ETF `yield` field stays a fraction (0.105 = 10.5%).
    """
    try:
        value = float(info.get("dividendYield") or 0.0)
        if value > 0:
            return value
        value = float(info.get("yield") or 0.0)
        return value * 100.0 if value > 0 else 0.0
    except (TypeError, ValueError):
        return 0.0


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
    holding_price = float(item.get("current_price") or 0.0)

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

            divs = t.dividends
            yahoo_price = _yahoo_price(info)
            to_account = _account_converter(yahoo_price, holding_price, fx_rate)

            # Yield and annual dividend. Yahoo quotes an instrument in its own
            # currency (JEPQ.L in USD, many London lines in pence), which need
            # not match Trading 212's instrument currency, so fx_rate alone can
            # be wrong. Dividend / Yahoo price is unitless; apply it to the
            # Trading 212 price (account currency) instead.
            annual_per_share = _annual_dividend_per_share(info, divs)
            if yahoo_price > 0 and annual_per_share > 0:
                div_yield = annual_per_share / yahoo_price * 100.0
                if div_yield > 50.0:
                    # Dividends in pence against a price in pounds (or similar).
                    annual_per_share /= 100.0
                    div_yield /= 100.0
            else:
                div_yield = _info_yield_percent(info)

            res["dividend_yield"] = round(div_yield, 2)
            # Annual income of the whole position, in account currency (what
            # the analytics, projections and planner read).
            res["annual_dividend"] = round(to_account(annual_per_share) * quantity, 2)

            # Historical dividends analysis for frequency & projections
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

                # Payout of the whole position, in account currency
                if yahoo_price > 0 and last_amt / yahoo_price > 0.5:
                    last_amt /= 100.0
                total_holding_payout = round(to_account(last_amt) * quantity, 2)

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
                SELECT ticker, external_id, quantity, fx_rate, current_price
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
                        "current_price": r["current_price"],
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
