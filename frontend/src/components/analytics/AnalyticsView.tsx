import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Calculator,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AnalyticsOverview,
  ProjectionsResponse,
  DividendGrowthResponse,
} from "../../types";
import {
  fetchAnalyticsOverview,
  fetchProjections,
  fetchDividendGrowth,
} from "../../lib/api";
import { formatCurrency, formatPercent } from "../../lib/utils";
import { SketchTape } from "../ui/SketchIcons";

export const AnalyticsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [growth, setGrowth] = useState<DividendGrowthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Projection Simulator Parameters
  const [projYears, setProjYears] = useState<number>(10);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(5.0);
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);
  const [annualContribution, setAnnualContribution] = useState<number>(0);
  const [expectedPriceGrowth, setExpectedPriceGrowth] = useState<number>(3.0);
  const [projections, setProjections] = useState<ProjectionsResponse | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, gwRes] = await Promise.all([
        fetchAnalyticsOverview(),
        fetchDividendGrowth(),
      ]);
      setOverview(ovRes);
      setGrowth(gwRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    try {
      const proj = await fetchProjections({
        years: projYears,
        dividend_growth_rate: dividendGrowthRate,
        dividend_reinvestment: reinvestDividends,
        annual_contribution: annualContribution,
        expected_price_growth: expectedPriceGrowth,
      });
      setProjections(proj);
    } catch {
      // Keep existing projections on simulation error
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    runSimulation();
  }, [projYears, dividendGrowthRate, reinvestDividends, annualContribution, expectedPriceGrowth]);

  const finalYearProj = useMemo(() => {
    if (!projections || projections.projections.length === 0) return null;
    return projections.projections[projections.projections.length - 1];
  }, [projections]);

  const hasWarnings = overview && (overview.single_stock_warnings.length > 0 || overview.sector_warnings.length > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI strip */}
      <div className="sketch-card p-6 bg-white relative">
        <SketchTape className="w-16 absolute -top-1 right-6 z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b-2 border-ink-900 border-dashed gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-amber-600" />
              <h2 className="font-sketch text-2xl font-bold text-ink-900">
                Planning & Yield Analytics
              </h2>
            </div>
            <p className="text-xs font-hand text-ink-muted mt-1">
              Yield on Cost (YOC), forward dividend compounding simulator, and concentration risk analysis
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="sketch-btn px-3 py-1.5 font-sketch text-xs font-bold bg-paper-100 hover:bg-paper-200 border-2 border-ink-900 rounded-sketch flex items-center gap-1.5 self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border-2 border-rose-900 rounded-sketch text-xs font-mono text-rose-900">
            {error}
          </div>
        )}

        {/* 4 Analytics KPI Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Portfolio Yield</span>
            <span className="font-sketch text-2xl font-bold text-blue-700">
              {formatPercent(overview?.portfolio_yield || 0)}
            </span>
            <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
              Annual: {formatCurrency(overview?.total_annual_dividend || 0)}
            </span>
          </div>

          <div className="p-3 bg-emerald-50 border-2 border-emerald-950 rounded-sketch">
            <span className="text-[10px] font-mono text-emerald-800 uppercase block font-semibold">Yield on Cost (YOC)</span>
            <span className="font-sketch text-2xl font-bold text-emerald-950">
              {formatPercent(overview?.yield_on_cost || 0)}
            </span>
            <span className="text-[11px] font-mono text-emerald-800 block mt-0.5">
              Cost: {formatCurrency(overview?.total_invested || 0)}
            </span>
          </div>

          <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Top 5 Concentration</span>
            <span className="font-sketch text-2xl font-bold text-ink-900">
              {formatPercent(overview?.top5_concentration || 0)}
            </span>
            <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
              Top 1: {formatPercent(overview?.top1_concentration || 0)}
            </span>
          </div>

          <div className={`p-3 border-2 rounded-sketch ${hasWarnings ? "bg-amber-50 border-amber-900" : "bg-emerald-50 border-emerald-900"}`}>
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Diversification Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {hasWarnings ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="font-sketch text-lg font-bold text-amber-900">Review Flags</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <span className="font-sketch text-lg font-bold text-emerald-900">Balanced</span>
                </>
              )}
            </div>
            <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
              {(overview?.single_stock_warnings.length || 0) + (overview?.sector_warnings.length || 0)} warnings
            </span>
          </div>
        </div>
      </div>

      {/* Safety & Concentration Alerts Banner if any */}
      {hasWarnings && (
        <div className="sketch-card p-4 bg-amber-50 border-2 border-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-sketch font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Concentration Risk Guidelines</span>
          </div>
          <div className="space-y-1 text-xs font-mono text-amber-950">
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
      <div className="sketch-card p-6 bg-white space-y-6">
        <div className="pb-3 border-b-2 border-ink-900 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              <h3 className="font-sketch text-xl font-bold text-ink-900">
                Forward Dividend Compounding Simulator
              </h3>
            </div>
            <p className="text-xs font-hand text-ink-muted mt-0.5">
              Model long-term dividend growth, automatic reinvestment (DRIP), and cash contributions
            </p>
          </div>

          {/* Time Horizon Pills */}
          <div className="flex items-center gap-1.5 self-start">
            {[3, 5, 10, 15, 20].map((yr) => (
              <button
                key={yr}
                onClick={() => setProjYears(yr)}
                className={`px-2.5 py-1 text-xs font-mono rounded-sketch border ${
                  projYears === yr
                    ? "bg-ink-900 text-white border-ink-900 font-bold"
                    : "bg-paper-100 hover:bg-paper-200 text-ink-800 border-ink-300"
                }`}
              >
                {yr}Y
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Control Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-paper-50 border-2 border-ink-900 rounded-sketch text-xs font-mono">
          <div>
            <label className="block text-ink-900 font-bold mb-1 flex items-center justify-between">
              <span>Dividend Growth CAGR</span>
              <span className="text-amber-700">{dividendGrowthRate.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={dividendGrowthRate}
              onChange={(e) => setDividendGrowthRate(parseFloat(e.target.value))}
              className="w-full accent-ink-900"
            />
          </div>

          <div>
            <label className="block text-ink-900 font-bold mb-1 flex items-center justify-between">
              <span>Annual Contribution</span>
              <span className="text-amber-700">€{annualContribution}</span>
            </label>
            <input
              type="number"
              min="0"
              step="250"
              value={annualContribution}
              onChange={(e) => setAnnualContribution(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-1.5 bg-white border border-ink-900 rounded text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-ink-900 font-bold mb-1 flex items-center justify-between">
              <span>Capital Growth Rate</span>
              <span className="text-blue-700">{expectedPriceGrowth.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="-5"
              max="12"
              step="0.5"
              value={expectedPriceGrowth}
              onChange={(e) => setExpectedPriceGrowth(parseFloat(e.target.value))}
              className="w-full accent-ink-900"
            />
          </div>

          <div className="flex flex-col justify-center">
            <label className="text-ink-900 font-bold mb-1 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reinvestDividends}
                onChange={(e) => setReinvestDividends(e.target.checked)}
                className="w-4 h-4 rounded border-ink-900 text-amber-500 focus:ring-amber-400"
              />
              <span>Reinvest Dividends (DRIP)</span>
            </label>
            <span className="text-[10px] text-ink-muted block pl-6">
              Compounds new shares automatically
            </span>
          </div>
        </div>

        {/* Simulator KPI Result Banner */}
        {finalYearProj && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-amber-50 border-2 border-amber-900 rounded-sketch">
              <span className="text-[10px] font-mono text-amber-800 uppercase block font-semibold">
                Year {projYears} Annual Dividend
              </span>
              <span className="font-sketch text-2xl font-bold text-amber-950">
                {formatCurrency(finalYearProj.annual_dividend)}
              </span>
              <span className="text-[11px] font-mono text-amber-800 block mt-0.5">
                ~{formatCurrency(finalYearProj.monthly_dividend)} / month
              </span>
            </div>

            <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
              <span className="text-[10px] font-mono text-ink-muted uppercase block">
                Year {projYears} Portfolio Value
              </span>
              <span className="font-sketch text-2xl font-bold text-ink-900">
                {formatCurrency(finalYearProj.portfolio_value)}
              </span>
              <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
                Projected assets
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border-2 border-emerald-950 rounded-sketch">
              <span className="text-[10px] font-mono text-emerald-800 uppercase block font-semibold">
                Projected Yield on Cost
              </span>
              <span className="font-sketch text-2xl font-bold text-emerald-950">
                {formatPercent(finalYearProj.yield_on_cost)}
              </span>
              <span className="text-[11px] font-mono text-emerald-800 block mt-0.5">
                On total capital invested
              </span>
            </div>

            <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
              <span className="text-[10px] font-mono text-ink-muted uppercase block">
                Total Dividends Paid
              </span>
              <span className="font-sketch text-2xl font-bold text-ink-900">
                {formatCurrency(finalYearProj.cumulative_dividends)}
              </span>
              <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
                Over {projYears} years
              </span>
            </div>
          </div>
        )}

        {/* Projection Area Chart */}
        {projections && projections.projections.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={projections.projections}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="projDivGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="year"
                  tickFormatter={(yr) => `Yr ${yr}`}
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                />
                <YAxis
                  yAxisId="div"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(val) => `€${val}`}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    formatCurrency(Number(val)),
                    name === "annual_dividend" ? "Annual Dividend" : "Portfolio Value",
                  ]}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{
                    backgroundColor: "#fffdfa",
                    border: "2px solid #1e1e1e",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                />
                <Area
                  yAxisId="div"
                  type="monotone"
                  dataKey="annual_dividend"
                  stroke="#b45309"
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
        <div className="lg:col-span-5 sketch-card p-6 bg-white space-y-4">
          <div className="pb-3 border-b-2 border-ink-900 border-dashed">
            <h3 className="font-sketch text-lg font-bold text-ink-900">
              Sector Distribution & Weight
            </h3>
            <p className="text-xs font-hand text-ink-muted">
              Portfolio exposure across industries (threshold: max 25%)
            </p>
          </div>

          <div className="space-y-3">
            {overview?.sector_breakdown.map((sec) => (
              <div key={sec.sector} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-ink-900">{sec.sector}</span>
                    <span className="text-[10px] text-ink-muted">({sec.count})</span>
                    {sec.warning && (
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-1 rounded border border-amber-300">
                        &gt;25%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-muted">{formatCurrency(sec.value)}</span>
                    <span className="font-bold text-ink-900 w-12 text-right">{sec.percentage.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-paper-100 h-2.5 rounded-full overflow-hidden border border-ink-300">
                  <div
                    className={`h-full rounded-full ${
                      sec.warning ? "bg-amber-500" : "bg-ink-900"
                    }`}
                    style={{ width: `${Math.min(100, sec.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Income by Holding Ranking */}
        <div className="lg:col-span-7 sketch-card p-6 bg-white space-y-4">
          <div className="pb-3 border-b-2 border-ink-900 border-dashed">
            <h3 className="font-sketch text-lg font-bold text-ink-900">
              Income Generation by Holding
            </h3>
            <p className="text-xs font-hand text-ink-muted">
              Ranking of positions driving your dividend income stream
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-ink-900 font-bold text-ink-muted uppercase">
                  <th className="pb-2">Holding</th>
                  <th className="pb-2 text-right">Yield</th>
                  <th className="pb-2 text-right">Annual Dividend</th>
                  <th className="pb-2 text-right">Income Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {overview?.income_by_holding.map((h) => (
                  <tr key={h.ticker} className="hover:bg-amber-50/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-900">{h.ticker}</span>
                        <span className="text-[11px] text-ink-muted truncate max-w-[150px]">{h.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-bold text-blue-700">
                      {formatPercent(h.yield_percent)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-amber-700">
                      {formatCurrency(h.annual_dividend)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 bg-paper-100 rounded border border-ink-200 font-bold text-ink-900">
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
        <div className="sketch-card p-6 bg-white space-y-4">
          <div className="pb-3 border-b-2 border-ink-900 border-dashed flex items-center justify-between">
            <div>
              <h3 className="font-sketch text-lg font-bold text-ink-900">
                Annual Dividend Growth Trajectory
              </h3>
              <p className="text-xs font-hand text-ink-muted">
                Historical received dividend cash flows by calendar year
              </p>
            </div>
            {growth.cagr_percent !== null && growth.cagr_percent !== undefined && (
              <span className="text-xs font-mono font-bold px-3 py-1 bg-emerald-100 border border-emerald-900 rounded-sketch text-emerald-950">
                CAGR: {growth.cagr_percent > 0 ? "+" : ""}{growth.cagr_percent}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {growth.years.map((yr) => (
              <div key={yr.year} className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
                <span className="text-xs font-mono text-ink-muted uppercase block">{yr.year}</span>
                <span className="font-sketch text-xl font-bold text-ink-900">
                  {formatCurrency(yr.received_amount)}
                </span>
                {yr.growth_rate_percent !== null && yr.growth_rate_percent !== undefined && (
                  <span
                    className={`block text-[11px] font-mono font-bold mt-0.5 ${
                      yr.growth_rate_percent >= 0 ? "text-emerald-700" : "text-rose-700"
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
