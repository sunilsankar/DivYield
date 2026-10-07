import math
from typing import List, Optional
from fastapi import APIRouter, Query
from app.database import get_db, get_setting
from app.schemas import (
    AnalyticsOverviewResponse,
    ConcentrationItem,
    SectorConcentrationItem,
    FrequencyItem,
    IncomeByHoldingItem,
    ProjectionsResponse,
    ProjectionYearItem,
    DividendGrowthResponse,
    HistoricalAnnualGrowthItem,
    AnalyticsAllocationResponse,
    AnalyticsDividendsResponse,
    AnalyticsValueResponse,
    DiversificationResponse,
    DiversificationMetric,
    GeographicExposureItem,
    ExposureHolding,
    IncomeRiskItem,
    DiversificationRecommendation,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview():
    """Calculates comprehensive portfolio yield, concentration risk, frequency, and income breakdown."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ticker, name, quantity, average_price, current_price, market_value,
                   sector, dividend_yield, annual_dividend, payout_frequency
            FROM holdings
            """
        )
        rows = cursor.fetchall()

    if not rows:
        return AnalyticsOverviewResponse(
            total_portfolio_value=0.0,
            total_invested=0.0,
            total_unrealized_pnl=0.0,
            total_unrealized_pnl_percent=0.0,
            total_annual_dividend=0.0,
            portfolio_yield=0.0,
            yield_on_cost=0.0,
            top1_concentration=0.0,
            top3_concentration=0.0,
            top5_concentration=0.0,
            single_stock_warnings=[],
            sector_warnings=[],
            holdings_concentration=[],
            sector_breakdown=[],
            frequency_breakdown=[],
            income_by_holding=[],
        )

    total_value = 0.0
    total_invested = 0.0
    total_annual_dividend = 0.0
    holdings_list = []

    for r in rows:
        qty = float(r["quantity"] or 0)
        avg_price = float(r["average_price"] or 0)
        mkt_val = float(r["market_value"] or 0)
        div_yield = float(r["dividend_yield"] or 0)
        
        # Calculate annual dividend
        ann_div = float(r["annual_dividend"] or 0)
        if ann_div <= 0 and div_yield > 0:
            ann_div = mkt_val * (div_yield / 100.0)

        total_value += mkt_val
        total_invested += (qty * avg_price)
        total_annual_dividend += ann_div

        holdings_list.append({
            "ticker": r["ticker"],
            "name": r["name"] or r["ticker"],
            "market_value": mkt_val,
            "annual_dividend": ann_div,
            "dividend_yield": div_yield,
            "sector": r["sector"] or "Unclassified",
            "frequency": r["payout_frequency"] or "Quarterly",
        })

    total_unrealized_pnl = total_value - total_invested
    total_unrealized_pnl_percent = (total_unrealized_pnl / total_invested * 100.0) if total_invested > 0 else 0.0
    portfolio_yield = (total_annual_dividend / total_value * 100.0) if total_value > 0 else 0.0
    yield_on_cost = (total_annual_dividend / total_invested * 100.0) if total_invested > 0 else 0.0

    # Sort holdings by market value descending
    holdings_list.sort(key=lambda x: x["market_value"], reverse=True)

    holdings_concentration: List[ConcentrationItem] = []
    single_stock_warnings: List[str] = []
    percentages = []

    for h in holdings_list:
        pct = (h["market_value"] / total_value * 100.0) if total_value > 0 else 0.0
        percentages.append(pct)
        has_warning = pct > 15.0
        if has_warning:
            single_stock_warnings.append(
                f"{h['ticker']} represents {pct:.1f}% of total portfolio (exceeds 15% concentration safety guideline)"
            )
        holdings_concentration.append(
            ConcentrationItem(
                ticker=h["ticker"],
                name=h["name"],
                value=round(h["market_value"], 2),
                percentage=round(pct, 2),
                warning=has_warning,
            )
        )

    top1 = percentages[0] if len(percentages) > 0 else 0.0
    top3 = sum(percentages[:3]) if len(percentages) >= 3 else sum(percentages)
    top5 = sum(percentages[:5]) if len(percentages) >= 5 else sum(percentages)

    # Sector breakdown
    sectors_map = {}
    for h in holdings_list:
        sec = h["sector"]
        if sec not in sectors_map:
            sectors_map[sec] = {"value": 0.0, "count": 0}
        sectors_map[sec]["value"] += h["market_value"]
        sectors_map[sec]["count"] += 1

    sector_breakdown: List[SectorConcentrationItem] = []
    sector_warnings: List[str] = []

    for sec, data in sorted(sectors_map.items(), key=lambda x: x[1]["value"], reverse=True):
        sec_pct = (data["value"] / total_value * 100.0) if total_value > 0 else 0.0
        has_warning = sec_pct > 25.0
        if has_warning:
            sector_warnings.append(
                f"{sec} represents {sec_pct:.1f}% of total portfolio (exceeds 25% sector concentration guideline)"
            )
        sector_breakdown.append(
            SectorConcentrationItem(
                sector=sec,
                value=round(data["value"], 2),
                percentage=round(sec_pct, 2),
                count=data["count"],
                warning=has_warning,
            )
        )

    # Frequency breakdown
    freq_map = {}
    for h in holdings_list:
        fq = h["frequency"].capitalize()
        if fq not in freq_map:
            freq_map[fq] = {"count": 0, "annual_amount": 0.0}
        freq_map[fq]["count"] += 1
        freq_map[fq]["annual_amount"] += h["annual_dividend"]

    frequency_breakdown: List[FrequencyItem] = []
    for fq, data in sorted(freq_map.items(), key=lambda x: x[1]["annual_amount"], reverse=True):
        fq_pct = (data["annual_amount"] / total_annual_dividend * 100.0) if total_annual_dividend > 0 else 0.0
        frequency_breakdown.append(
            FrequencyItem(
                frequency=fq,
                count=data["count"],
                annual_amount=round(data["annual_amount"], 2),
                percentage=round(fq_pct, 2),
            )
        )

    # Income by holding
    income_by_holding: List[IncomeByHoldingItem] = []
    for h in sorted(holdings_list, key=lambda x: x["annual_dividend"], reverse=True):
        inc_pct = (h["annual_dividend"] / total_annual_dividend * 100.0) if total_annual_dividend > 0 else 0.0
        income_by_holding.append(
            IncomeByHoldingItem(
                ticker=h["ticker"],
                name=h["name"],
                annual_dividend=round(h["annual_dividend"], 2),
                yield_percent=round(h["dividend_yield"], 2),
                percentage_of_total_income=round(inc_pct, 2),
            )
        )

    return AnalyticsOverviewResponse(
        total_portfolio_value=round(total_value, 2),
        total_invested=round(total_invested, 2),
        total_unrealized_pnl=round(total_unrealized_pnl, 2),
        total_unrealized_pnl_percent=round(total_unrealized_pnl_percent, 2),
        total_annual_dividend=round(total_annual_dividend, 2),
        portfolio_yield=round(portfolio_yield, 2),
        yield_on_cost=round(yield_on_cost, 2),
        top1_concentration=round(top1, 2),
        top3_concentration=round(top3, 2),
        top5_concentration=round(top5, 2),
        single_stock_warnings=single_stock_warnings,
        sector_warnings=sector_warnings,
        holdings_concentration=holdings_concentration,
        sector_breakdown=sector_breakdown,
        frequency_breakdown=frequency_breakdown,
        income_by_holding=income_by_holding,
    )


@router.get("/allocation", response_model=AnalyticsAllocationResponse)
def get_analytics_allocation():
    """Returns sector and holding concentration allocations."""
    overview = get_analytics_overview()
    currency = get_setting("account_currency", "EUR")
    return AnalyticsAllocationResponse(
        total_value=overview.total_portfolio_value,
        currency=currency,
        sectors=overview.sector_breakdown,
        top_holdings=overview.holdings_concentration,
        single_stock_warnings=overview.single_stock_warnings,
        sector_warnings=overview.sector_warnings,
    )


@router.get("/dividends", response_model=AnalyticsDividendsResponse)
def get_analytics_dividends():
    """Returns dividend yield, yield on cost, frequency and income breakdown."""
    overview = get_analytics_overview()
    currency = get_setting("account_currency", "EUR")
    return AnalyticsDividendsResponse(
        annual_dividend_income=overview.total_annual_dividend,
        current_portfolio_yield=overview.portfolio_yield,
        yield_on_cost=overview.yield_on_cost,
        currency=currency,
        frequency_breakdown=overview.frequency_breakdown,
        income_by_holding=overview.income_by_holding,
    )


@router.get("/value", response_model=AnalyticsValueResponse)
def get_analytics_value():
    """Returns overall portfolio value, cash, and unrealized performance."""
    overview = get_analytics_overview()
    currency = get_setting("account_currency", "EUR")
    free_cash = float(get_setting("account_free_cash", "0.0") or 0.0)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM holdings")
        row = cursor.fetchone()
        holdings_count = row["count"] if row else 0

    return AnalyticsValueResponse(
        total_portfolio_value=round(overview.total_portfolio_value + free_cash, 2),
        holdings_value=overview.total_portfolio_value,
        uninvested_cash=round(free_cash, 2),
        total_invested=overview.total_invested,
        unrealized_pnl=overview.total_unrealized_pnl,
        pnl_percent=overview.total_unrealized_pnl_percent,
        holdings_count=holdings_count,
        currency=currency,
    )


@router.get("/projections", response_model=ProjectionsResponse)
def get_dividend_projections(
    years: int = Query(10, ge=1, le=30, description="Projection duration in years"),
    dividend_growth_rate: float = Query(5.0, ge=0.0, le=50.0, description="Annual dividend CAGR percentage"),
    dividend_reinvestment: bool = Query(True, description="Enable DRIP (automatic dividend reinvestment)"),
    annual_contribution: float = Query(0.0, ge=0.0, description="Annual additional cash invested"),
    expected_price_growth: float = Query(3.0, ge=-20.0, le=30.0, description="Annual capital appreciation percentage"),
):
    """Calculates year-by-year forward portfolio and dividend projections with reinvestment and growth modeling."""
    # Obtain current portfolio stats
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT market_value, dividend_yield, annual_dividend FROM holdings")
        rows = cursor.fetchall()

    curr_value = sum(float(r["market_value"] or 0) for r in rows)
    curr_dividend = sum(float(r["annual_dividend"] or 0) for r in rows)

    # If DB is empty, use standard baseline for demonstration
    if curr_value <= 0:
        curr_value = 10000.0
        curr_dividend = 350.0

    initial_invested = curr_value
    cumulative_dividends = 0.0
    projections: List[ProjectionYearItem] = []

    port_val = curr_value
    ann_div = curr_dividend

    d_growth = dividend_growth_rate / 100.0
    p_growth = expected_price_growth / 100.0

    for yr in range(1, years + 1):
        # Current baseline dividend for this year grows by dividend growth rate
        ann_div = ann_div * (1.0 + d_growth)

        # Dividends generated this year
        cumulative_dividends += ann_div

        # Capital appreciation on current assets
        port_val = port_val * (1.0 + p_growth)

        # DRIP (Dividend Reinvestment)
        if dividend_reinvestment:
            port_val += ann_div
            # Reinvested dividends purchase new shares yielding the current baseline yield
            reinvest_yield = ann_div / port_val if port_val > 0 else 0.035
            ann_div += ann_div * reinvest_yield

        # Annual cash contribution
        if annual_contribution > 0:
            port_val += annual_contribution
            # Contribution yields average portfolio yield
            contrib_yield = ann_div / port_val if port_val > 0 else 0.035
            ann_div += annual_contribution * contrib_yield
            initial_invested += annual_contribution

        yoc = (ann_div / initial_invested * 100.0) if initial_invested > 0 else 0.0

        projections.append(
            ProjectionYearItem(
                year=yr,
                portfolio_value=round(port_val, 2),
                annual_dividend=round(ann_div, 2),
                monthly_dividend=round(ann_div / 12.0, 2),
                cumulative_dividends=round(cumulative_dividends, 2),
                yield_on_cost=round(yoc, 2),
            )
        )

    return ProjectionsResponse(
        initial_value=round(curr_value, 2),
        initial_annual_dividend=round(curr_dividend, 2),
        dividend_growth_rate=dividend_growth_rate,
        dividend_reinvestment=dividend_reinvestment,
        annual_contribution=annual_contribution,
        years=years,
        projections=projections,
    )


@router.get("/growth", response_model=DividendGrowthResponse)
def get_dividend_growth():
    """Returns historical received dividends grouped by calendar year and calculates YoY growth rates and CAGR."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT strftime('%Y', payment_date) as yr, SUM(amount) as total
            FROM dividend_events
            WHERE status = 'RECEIVED' AND payment_date IS NOT NULL
            GROUP BY yr
            ORDER BY yr ASC
            """
        )
        rows = cursor.fetchall()

    if not rows:
        return DividendGrowthResponse(years=[], cagr_percent=None)

    items: List[HistoricalAnnualGrowthItem] = []
    prev_amt = None

    for r in rows:
        yr = int(r["yr"])
        amt = float(r["total"] or 0)
        growth_pct = None
        if prev_amt is not None and prev_amt > 0:
            growth_pct = round(((amt - prev_amt) / prev_amt) * 100.0, 2)
        prev_amt = amt

        items.append(
            HistoricalAnnualGrowthItem(
                year=yr,
                received_amount=round(amt, 2),
                growth_rate_percent=growth_pct,
            )
        )

    cagr = None
    if len(items) >= 2 and items[0].received_amount > 0:
        first_amt = items[0].received_amount
        last_amt = items[-1].received_amount
        n_years = len(items) - 1
        if last_amt > 0 and n_years > 0:
            cagr = round(((last_amt / first_amt) ** (1.0 / n_years) - 1.0) * 100.0, 2)

    return DividendGrowthResponse(years=items, cagr_percent=cagr)


@router.get("/diversification", response_model=DiversificationResponse)
def get_analytics_diversification():
    """Calculates comprehensive portfolio diversification score, HHI concentration, geographic spread, and recommendations."""
    overview = get_analytics_overview()
    total_val = overview.total_portfolio_value
    total_div = overview.total_annual_dividend
    holdings = overview.holdings_concentration
    sectors = overview.sector_breakdown
    income_by_holding = overview.income_by_holding

    if not holdings or total_val <= 0:
        return DiversificationResponse(
            overall_score=0,
            rating="Uninvested / No Holdings",
            hhi_index=0.0,
            effective_holdings=0.0,
            total_holdings_count=0,
            total_sectors_count=0,
            top1_concentration=0.0,
            top5_concentration=0.0,
            top10_concentration=0.0,
            metrics=[
                DiversificationMetric(name="Asset Concentration", score=0, status="poor", description="No holdings active"),
                DiversificationMetric(name="Sector Spread", score=0, status="poor", description="No sectors present"),
                DiversificationMetric(name="Income Balance", score=0, status="poor", description="No dividend income"),
                DiversificationMetric(name="Asset Count", score=0, status="poor", description="0 holdings"),
            ],
            sectors=[],
            geographic_exposure=[],
            income_risks=[],
            recommendations=[
                DiversificationRecommendation(
                    type="caution",
                    title="No Holdings Found",
                    message="Sync your Trading 212 account or add manual holdings to view diversification analysis."
                )
            ]
        )

    holdings_count = len(holdings)
    # HHI (Herfindahl-Hirschman Index) on scale 0 - 10000
    hhi_index = sum((h.percentage) ** 2 for h in holdings)
    effective_holdings = round(10000.0 / hhi_index, 1) if hhi_index > 0 else 0.0

    # 1. Asset Concentration Score (HHI based)
    if hhi_index <= 800:
        s_hhi = 100
        status_hhi = "excellent"
    elif hhi_index <= 1500:
        s_hhi = int(100 - (hhi_index - 800) * (20.0 / 700.0))
        status_hhi = "good"
    elif hhi_index <= 2500:
        s_hhi = int(80 - (hhi_index - 1500) * (30.0 / 1000.0))
        status_hhi = "moderate"
    else:
        s_hhi = max(10, int(50 - (hhi_index - 2500) * (40.0 / 7500.0)))
        status_hhi = "poor"

    # 2. Sector Spread Score
    sector_count = len(sectors)
    max_sec_pct = sectors[0].percentage if sectors else 100.0
    sec_count_comp = min(100.0, sector_count * 12.5)
    sec_penalty = (max_sec_pct - 25.0) * 1.5 if max_sec_pct > 25.0 else 0.0
    s_sec = max(10, min(100, int(sec_count_comp - sec_penalty)))
    status_sec = "excellent" if s_sec >= 85 else ("good" if s_sec >= 70 else ("moderate" if s_sec >= 50 else "poor"))

    # 3. Income Balance Score
    if total_div <= 0:
        s_inc = 75
        status_inc = "good"
        desc_inc = "No dividend payers; capital growth focused"
    else:
        top3_inc = sum(item.percentage_of_total_income for item in income_by_holding[:3])
        if top3_inc <= 30.0:
            s_inc = 100
            status_inc = "excellent"
        elif top3_inc <= 50.0:
            s_inc = int(100 - (top3_inc - 30.0) * 1.0)
            status_inc = "good"
        elif top3_inc <= 70.0:
            s_inc = int(80 - (top3_inc - 50.0) * 1.25)
            status_inc = "moderate"
        else:
            s_inc = max(10, int(55 - (top3_inc - 70.0) * 1.5))
            status_inc = "poor"
        desc_inc = f"Top 3 dividend payers account for {top3_inc:.1f}% of total payout"

    # 4. Asset Count Score
    if holdings_count >= 25:
        s_cnt = 100
        status_cnt = "excellent"
    elif holdings_count >= 15:
        s_cnt = min(99, int(80 + (holdings_count - 15) * 2))
        status_cnt = "good"
    elif holdings_count >= 8:
        s_cnt = min(79, int(55 + (holdings_count - 8) * 3.5))
        status_cnt = "moderate"
    else:
        s_cnt = max(15, holdings_count * 6)
        status_cnt = "poor"

    # Weighted Overall Score
    overall = int(round(0.35 * s_hhi + 0.30 * s_sec + 0.20 * s_inc + 0.15 * s_cnt))
    if overall >= 85:
        rating = "Highly Diversified"
    elif overall >= 70:
        rating = "Well Diversified"
    elif overall >= 50:
        rating = "Moderately Concentrated"
    else:
        rating = "High Risk / Concentrated"

    metrics = [
        DiversificationMetric(
            name="Holding Balance (HHI)",
            score=s_hhi,
            status=status_hhi,
            description=f"HHI index: {int(hhi_index)} ({effective_holdings} effective holdings)",
        ),
        DiversificationMetric(
            name="Sector Spread",
            score=s_sec,
            status=status_sec,
            description=f"{sector_count} sectors active (largest: {sectors[0].sector if sectors else 'None'} at {max_sec_pct:.1f}%)",
        ),
        DiversificationMetric(
            name="Dividend Income Balance",
            score=s_inc,
            status=status_inc,
            description=desc_inc,
        ),
        DiversificationMetric(
            name="Asset Count Adequacy",
            score=s_cnt,
            status=status_cnt,
            description=f"{holdings_count} active holdings in portfolio",
        ),
    ]

    # Geographic / Regional Exposure
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ticker, name, market_value, sector FROM holdings")
        raw_rows = cursor.fetchall()

    geo_map = {
        "United States": 0.0,
        "Netherlands & Euronext": 0.0,
        "United Kingdom": 0.0,
        "Germany & DAX": 0.0,
        "International / Other": 0.0,
    }
    geo_counts = {k: 0 for k in geo_map}
    sector_holdings = {}
    geo_holdings = {k: [] for k in geo_map}

    for r in raw_rows:
        t = (r["ticker"] or "").upper()
        mv = float(r["market_value"] or 0)
        detail = ExposureHolding(
            ticker=r["ticker"] or "",
            name=r["name"] or r["ticker"] or "Unknown holding",
            value=round(mv, 2),
            percentage=round((mv / total_val * 100.0) if total_val > 0 else 0.0, 2),
        )
        sector = (r["sector"] or "Unclassified").strip() or "Unclassified"
        sector_holdings.setdefault(sector, []).append(detail)
        # ponytail: heuristic ticker suffix mapping; upgrade to country/exchange column from provider sync when added
        if t.endswith("_US_EQ") or ".US" in t or (not "_" in t and not "." in t and len(t) <= 5 and not t.endswith("L") and not t.endswith("D") and not t.endswith("A")):
            reg = "United States"
        elif t.endswith("_NL_EQ") or ".AS" in t or t.endswith("A"):
            reg = "Netherlands & Euronext"
        elif t.endswith("_GB_EQ") or ".L" in t or t.endswith("L"):
            reg = "United Kingdom"
        elif t.endswith("_DE_EQ") or ".DE" in t or t.endswith("D") or ".XETRA" in t:
            reg = "Germany & DAX"
        else:
            reg = "International / Other"
        geo_map[reg] += mv
        geo_counts[reg] += 1
        geo_holdings[reg].append(detail)

    for sector in sectors:
        sector.holdings = sorted(sector_holdings.get(sector.sector, []), key=lambda h: h.value, reverse=True)

    geo_exposure: List[GeographicExposureItem] = []
    for reg, val in sorted(geo_map.items(), key=lambda x: x[1], reverse=True):
        if val > 0:
            pct = (val / total_val * 100.0) if total_val > 0 else 0.0
            geo_exposure.append(
                GeographicExposureItem(
                    region=reg,
                    value=round(val, 2),
                    percentage=round(pct, 2),
                    holdings_count=geo_counts[reg],
                    holdings=sorted(geo_holdings[reg], key=lambda h: h.value, reverse=True),
                )
            )

    # Top holdings concentration
    percentages = [h.percentage for h in holdings]
    top1 = percentages[0] if percentages else 0.0
    top5 = sum(percentages[:5]) if len(percentages) >= 5 else sum(percentages)
    top10 = sum(percentages[:10]) if len(percentages) >= 10 else sum(percentages)

    # Income Risks (capital % vs dividend % mismatch)
    income_risks: List[IncomeRiskItem] = []
    # Build map of capital pct
    cap_map = {h.ticker: h.percentage for h in holdings}
    for item in income_by_holding[:10]:
        cap_pct = cap_map.get(item.ticker, 0.0)
        inc_pct = item.percentage_of_total_income
        if inc_pct > 20.0 or (inc_pct - cap_pct > 12.0):
            risk_lvl = "high"
        elif inc_pct > 10.0 or (inc_pct - cap_pct > 6.0):
            risk_lvl = "moderate"
        else:
            risk_lvl = "balanced"

        income_risks.append(
            IncomeRiskItem(
                ticker=item.ticker,
                name=item.name,
                capital_percentage=round(cap_pct, 2),
                income_percentage=round(inc_pct, 2),
                risk_level=risk_lvl,
            )
        )

    # Intelligent Recommendations
    recommendations: List[DiversificationRecommendation] = []
    if top1 > 15.0:
        recommendations.append(
            DiversificationRecommendation(
                type="warning",
                title="Single-Stock Concentration",
                message=f"{holdings[0].ticker} represents {top1:.1f}% of total portfolio value. Consider rebalancing if it exceeds your target risk limit (recommended max: 10-15%).",
            )
        )

    if sectors and sectors[0].percentage > 25.0:
        recommendations.append(
            DiversificationRecommendation(
                type="warning",
                title="Sector Overweight",
                message=f"The {sectors[0].sector} sector accounts for {sectors[0].percentage:.1f}% of assets. Downturns in this sector could heavily impact overall performance (recommended max: 20-25%).",
            )
        )

    if income_risks and income_risks[0].risk_level == "high":
        recommendations.append(
            DiversificationRecommendation(
                type="caution",
                title="Dividend Reliance Warning",
                message=f"{income_risks[0].ticker} accounts for {income_risks[0].income_percentage:.1f}% of all dividend cashflow. A dividend cut by this company would noticeably reduce your passive income.",
            )
        )

    if effective_holdings < 15 and holdings_count >= 25:
        recommendations.append(
            DiversificationRecommendation(
                type="caution",
                title="Effective Holding Dispersion",
                message=f"While you have {holdings_count} positions, your top-heavy weighting results in an effective holding count of only {effective_holdings}. Smaller positions provide minimal diversification benefit.",
            )
        )

    if sector_count < 6:
        recommendations.append(
            DiversificationRecommendation(
                type="caution",
                title="Sector Expansion Opportunities",
                message=f"Your portfolio is distributed across only {sector_count} sectors. Consider researching quality companies in complementary sectors like Consumer Staples, Healthcare, or Utilities.",
            )
        )

    if overall >= 80:
        recommendations.append(
            DiversificationRecommendation(
                type="positive",
                title="Solid Portfolio Structure",
                message=f"Your portfolio achieves a strong {overall}/100 diversification score with healthy distribution across {sector_count} sectors and {holdings_count} positions.",
            )
        )

    return DiversificationResponse(
        overall_score=overall,
        rating=rating,
        hhi_index=round(hhi_index, 1),
        effective_holdings=effective_holdings,
        total_holdings_count=holdings_count,
        total_sectors_count=sector_count,
        top1_concentration=round(top1, 2),
        top5_concentration=round(top5, 2),
        top10_concentration=round(top10, 2),
        metrics=metrics,
        sectors=sectors,
        geographic_exposure=geo_exposure,
        income_risks=income_risks,
        recommendations=recommendations,
    )
