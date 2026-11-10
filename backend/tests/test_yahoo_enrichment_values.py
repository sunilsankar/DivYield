"""Yahoo symbol resolution for Trading 212 ids and dividend values stored by enrichment."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pandas as pd
import pytest

from app.database import get_db_connection
from app.services import yfinance_enrichment as ye


@pytest.mark.parametrize(
    "t212_id,expected",
    [
        ("JEPQl_EQ", "JEPQ.L"),   # was JEPQL (404)
        ("RHMd_EQ", "RHM.DE"),    # was RHMD
        ("AMp_EQ", "AM.PA"),      # was AMP (Ameriprise, a different company)
        ("ENVIa_EQ", "ENVI.AS"),
        ("AMZN_US_EQ", "AMZN"),
        ("ASML_NL_EQ", "ASML.AS"),
    ],
)
def test_trading212_ids_resolve_to_the_right_yahoo_listing(t212_id, expected):
    with get_db_connection() as conn:
        assert ye.resolve_yahoo_symbol(t212_id, conn) == expected


def test_mapping_keyed_on_short_ticker_applies_to_full_id():
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO instrument_mappings (trading212_ticker, yahoo_ticker, confidence) "
            "VALUES ('ZZZQl', 'ZZZQ-X.L', 'MANUAL') "
            "ON CONFLICT(trading212_ticker) DO UPDATE SET yahoo_ticker = excluded.yahoo_ticker"
        )
        conn.commit()
        assert ye.resolve_yahoo_symbol("ZZZQl_EQ", conn) == "ZZZQ-X.L"


def _divs(amounts, tz="Europe/London", every_days=30):
    now = datetime.now(timezone.utc)
    idx = pd.DatetimeIndex(
        [now - timedelta(days=every_days * (len(amounts) - i)) for i in range(len(amounts))]
    ).tz_convert(tz)
    return pd.Series(amounts, index=idx)


class _FakeTicker:
    def __init__(self, info, dividends):
        self.info = info
        self.dividends = dividends
        self.calendar = {}


def _enrich(info, dividends, quantity, holding_price, fx_rate=1.0):
    item = {"ticker": "X", "yahoo_symbol": "X", "quantity": quantity,
            "fx_rate": fx_rate, "current_price": holding_price}
    with patch.object(ye.yf, "Ticker", return_value=_FakeTicker(info, dividends)):
        return ye._fetch_ticker_enrichment(item, ye.YahooRateLimiter(min_interval=0))


def test_etf_without_dividend_rate_uses_trailing_payouts_converted_by_price_ratio():
    # JEPQ.L: Yahoo quotes USD 25.00, no dividendRate; Trading 212 price is GBP 18.75.
    info = {"currency": "USD", "regularMarketPrice": 25.0, "dividendRate": None, "dividendYield": 10.5}
    res = _enrich(info, _divs([0.25] * 12), quantity=100, holding_price=18.75)
    assert res["dividend_yield"] == pytest.approx(12.0, abs=0.01)   # 3.00 / 25.00
    # 3.00 USD/share * (18.75 / 25.00) * 100 shares = 225 GBP for the position
    assert res["annual_dividend"] == pytest.approx(225.0, abs=0.01)
    assert res["payout_frequency"] == "MONTHLY"
    assert res["projected_dividends"][0]["amount"] == pytest.approx(18.75, abs=0.01)


def test_pence_quoted_line_scales_pound_dividend_rate():
    # BA.L: price 1880 GBp, dividendRate 0.376 GBP, history in pence.
    info = {"currency": "GBp", "regularMarketPrice": 1880.0, "dividendRate": 0.376, "dividendYield": 2.0}
    res = _enrich(info, _divs([22.8, 15.0], every_days=180), quantity=10, holding_price=18.80)
    assert res["dividend_yield"] == pytest.approx(2.0, abs=0.01)
    assert res["annual_dividend"] == pytest.approx(3.76, abs=0.01)   # 0.376 GBP * 10


def test_yield_is_not_multiplied_by_100_when_yahoo_reports_percent():
    # GOOG: yfinance >= 0.2.54 reports dividendYield 0.31 meaning 0.31 %.
    info = {"currency": "USD", "regularMarketPrice": 270.0, "dividendRate": 0.84, "dividendYield": 0.31}
    res = _enrich(info, _divs([0.21] * 4, every_days=91), quantity=8, holding_price=200.0)
    assert res["dividend_yield"] == pytest.approx(0.31, abs=0.01)
    assert res["annual_dividend"] == pytest.approx(0.84 * 200.0 / 270.0 * 8, abs=0.01)


def test_falls_back_to_fx_rate_without_prices():
    info = {"currency": "USD", "dividendRate": 1.0, "dividendYield": 4.0}
    res = _enrich(info, _divs([0.25] * 4, every_days=91), quantity=10, holding_price=0.0, fx_rate=0.8)
    assert res["dividend_yield"] == pytest.approx(4.0)
    assert res["annual_dividend"] == pytest.approx(8.0)
