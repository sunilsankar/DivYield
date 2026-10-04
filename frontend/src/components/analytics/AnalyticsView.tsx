import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Calculator,
  RefreshCw,
} from "lucide-react";
import {
  fetchAnalyticsOverview,
  fetchProjections,
  fetchDividendGrowth,
} from "../../lib/api";
import {
  AnalyticsOverview,
  ProjectionsResult,
  DividendGrowthResult,
  HistoricalAnnualGrowthItem,
} from "../../types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { StockLogo } from "../ui/StockLogo";

export const AnalyticsView: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [projections, setProjections] = useState<ProjectionsResult | null>(null);
  const [growth, setGrowth] = useState<DividendGrowthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Projection Controls
  const [projYears, setProjYears] = useState<number>(10);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(6.0);
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);
  const [annualContribution, setAnnualContribution] = useState<number>(1000);
  const [expectedPriceGrowth, setExpectedPriceGrowth] = useState<number>(4.0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ovData, grData] = await Promise.all([
        fetchAnalyticsOverview(),
        fetchDividendGrowth(),
      ]);
      setOverview(ovData);
      setGrowth(grData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const updateProjections = async () => {
    try {
      const projData = await fetchProjections({
        years: projYears,
        dividend_growth_rate: dividendGrowthRate / 100,
        dividend_reinvestment: reinvestDividends,
        annual_contribution: annualContribution,
        expected_price_growth: expectedPriceGrowth / 100,
      });
      setProjections(projData);
    } catch (err) {
      console.error("Failed to calculate projections:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    updateProjections();
  }, [projYears, dividendGrowthRate, reinvestDividends, annualContribution, expectedPriceGrowth]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  const finalYearProj = projections?.projections[projections.projections.length - 1];
  const hasWarnings = overview && (overview.single_stock_warnings.length > 0 || overview.sector_warnings.length > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI strip */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-xl text-slate-900 tracking-tight">
                Planning & Yield Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Yield on Cost (YOC), forward dividend compounding simulator, and concentration risk analysis
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* 4 Analytics KPI Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Portfolio Yield</span>
            <span className="text-2xl font-bold text-indigo-600 mt-0.5 block">
              {formatPercent(overview?.portfolio_yield || 0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Annual: {formatCurrency(overview?.total_annual_dividend || 0)}
            </span>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
            <span className="text-[10px] font-medium text-emerald-800 uppercase tracking-wider block">Yield on Cost (YOC)</span>
            <span className="text-2xl font-bold text-emerald-800 mt-0.5 block">
              {formatPercent(overview?.yield_on_cost || 0)}
            </span>
            <span className="text-[11px] text-emerald-700 block mt-1">
              Cost: {formatCurrency(overview?.total_invested || 0)}
            </span>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Top 5 Concentration</span>
            <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
              {formatPercent(overview?.top5_concentration || 0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Top 1: {formatPercent(overview?.top1_concentration || 0)}
            </span>
          </div>

          <div className={`p-4 border rounded-xl ${hasWarnings ? "bg-amber-50/60 border-amber-200" : "bg-emerald-50/60 border-emerald-200"}`}>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Diversification</span>
            <div className="flex items-center gap-1.5 mt-1">
              {hasWarnings ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="text-lg font-bold text-amber-900">Review Flags</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-lg font-bold text-emerald-900">Balanced</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              {(overview?.single_stock_warnings.length || 0) + (overview?.sector_warnings.length || 0)} warnings
            </span>
          </div>
        </div>
      </div>

      {/* Safety & Concentration Alerts Banner if any */}
      {hasWarnings && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 font-semibold text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Concentration Risk Guidelines</span>
          </div>
          <div className="space-y-1 text-xs text-amber-800">
            {overview?.single_stock_warnings.map((w, i) => (
              <p key={`sw-${i}`}>• ⚠️ {w}</p>
            ))}
            {overview?.sector_warnings.map((w, i) => (
              <p key={`secw-${i}`}>• ⚠️ {w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Forward Dividend & Wealth Projection Simulator */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-lg text-slate-900">
                Forward Dividend Compounding Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Model long-term dividend growth, automatic reinvestment (DRIP), and cash contributions
            </p>
          </div>

          {/* Time Horizon Pills */}
          <div className="flex items-center gap-1.5 self-start bg-slate-50 p-1 rounded-xl border border-slate-200">
            {[3, 5, 10, 15, 20].map((yr) => (
              <button
                key={yr}
                onClick={() => setProjYears(yr)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  projYears === yr
                    ? "bg-white text-indigo-600 font-semibold shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {yr}Y
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Control Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1.5 flex items-center justify-between">
              <span>Dividend Growth CAGR</span>
              <span className="font-semibold text-amber-700">{dividendGrowthRate.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={dividendGrowthRate}
              onChange={(e) => setDividendGrowthRate(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1.5 flex items-center justify-between">
              <span>Annual Contribution</span>
              <span className="font-semibold text-indigo-600">€{annualContribution}</span>
            </label>
            <input
              type="number"
              min="0"
              step="250"
              value={annualContribution}
              onChange={(e) => setAnnualContribution(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1.5 flex items-center justify-between">
              <span>Capital Growth Rate</span>
              <span className="font-semibold text-emerald-700">{expectedPriceGrowth.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="-5"
              max="12"
              step="0.5"
              value={expectedPriceGrowth}
              onChange={(e) => setExpectedPriceGrowth(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="flex flex-col justify-center">
            <label className="text-slate-800 font-medium mb-1 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reinvestDividends}
                onChange={(e) => setReinvestDividends(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Reinvest Dividends (DRIP)</span>
            </label>
            <span className="text-[11px] text-slate-500 block pl-6">
              Compounds new shares automatically
            </span>
          </div>
        </div>

        {/* Simulator KPI Result Banner */}
        {finalYearProj && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
              <span className="text-[10px] font-medium text-amber-800 uppercase tracking-wider block">
                Year {projYears} Annual Dividend
              </span>
              <span className="text-2xl font-bold text-amber-950 mt-0.5 block">
                {formatCurrency(finalYearProj.annual_dividend)}
              </span>
              <span className="text-[11px] text-amber-700 block mt-1">
                ~{formatCurrency(finalYearProj.monthly_dividend)} / month
              </span>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                Year {projYears} Portfolio Value
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
                {formatCurrency(finalYearProj.portfolio_value)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Projected assets
              </span>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <span className="text-[10px] font-medium text-emerald-800 uppercase tracking-wider block">
                Projected Yield on Cost
              </span>
              <span className="text-2xl font-bold text-emerald-800 mt-0.5 block">
                {formatPercent(finalYearProj.yield_on_cost)}
              </span>
              <span className="text-[11px] text-emerald-700 block mt-1">
                On total capital invested
              </span>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                Total Dividends Paid
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
                {formatCurrency(finalYearProj.cumulative_dividends)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Over {projYears} years
              </span>
            </div>
          </div>
        )}

        {/* Projection Area Chart */}
        {projections && projections.projections.length > 0 && (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={projections.projections}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="projDivGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="year"
                  tickFormatter={(yr) => `Yr ${yr}`}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="div"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(val) => `€${val}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    formatCurrency(Number(val)),
                    name === "annual_dividend" ? "Annual Dividend" : "Portfolio Value",
                  ]}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  itemStyle={{ color: "#ffffff" }}
                />
                <Area
                  yAxisId="div"
                  type="monotone"
                  dataKey="annual_dividend"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#projDivGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2-Column Section: Sector Concentration & Income by Holding */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sector Allocation Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-semibold text-base text-slate-900">
              Sector Distribution & Weight
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Portfolio exposure across industries (threshold: max 25%)
            </p>
          </div>

          <div className="space-y-3.5">
            {overview?.sector_breakdown.map((sec) => (
              <div key={sec.sector} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-800">{sec.sector}</span>
                    <span className="text-[10px] text-slate-400">({sec.count})</span>
                    {sec.warning && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        &gt;25%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">{formatCurrency(sec.value)}</span>
                    <span className="font-semibold text-slate-900 w-12 text-right">{sec.percentage.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sec.warning ? "bg-amber-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${Math.min(100, sec.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Income by Holding Ranking */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-semibold text-base text-slate-900">
              Income Generation by Holding
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranking of positions driving your dividend income stream
            </p>
          </div>

          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Holding</th>
                  <th className="pb-3 text-right">Yield</th>
                  <th className="pb-3 text-right">Annual Dividend</th>
                  <th className="pb-3 text-right">Income Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview?.income_by_holding.map((h) => (
                  <tr key={h.ticker} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <StockLogo ticker={h.ticker} size="sm" />
                        <div>
                          <span className="font-semibold text-slate-900 block">{h.ticker}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[150px] block">{h.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-medium text-indigo-600">
                      {formatPercent(h.yield_percent)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {formatCurrency(h.annual_dividend)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-slate-700 text-[11px] font-medium">
                        {h.percentage_of_total_income.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historical Dividend Growth (YoY & CAGR) */}
      {growth && growth.years.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-slate-900">
                Annual Dividend Growth Trajectory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Historical received dividend cash flows by calendar year
              </p>
            </div>
            {growth.cagr_percent !== null && growth.cagr_percent !== undefined && (
              <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                CAGR: {growth.cagr_percent > 0 ? "+" : ""}{growth.cagr_percent}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {growth.years.map((yr: HistoricalAnnualGrowthItem) => (
              <div key={yr.year} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">{yr.year}</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                  {formatCurrency(yr.received_amount)}
                </span>
                {yr.growth_rate_percent !== null && yr.growth_rate_percent !== undefined && (
                  <span
                    className={`block text-[11px] font-medium mt-1 ${
                      yr.growth_rate_percent >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {yr.growth_rate_percent >= 0 ? "+" : ""}
                    {yr.growth_rate_percent}% YoY
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
