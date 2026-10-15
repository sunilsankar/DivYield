import React, { useState, useEffect } from "react";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Calendar,
  Coins,
  TrendingUp,
  Layers,
} from "lucide-react";
import { fetchIncomePlanner } from "../../lib/api";
import { IncomePlannerResponse, PlannerMonth } from "../../types";
import { StockLogo } from "../ui/StockLogo";

interface IncomePlannerViewProps {
  onNavigateToHoldings?: () => void;
  onNavigateToCalendar?: () => void;
}

export const IncomePlannerView: React.FC<IncomePlannerViewProps> = () => {
  const [data, setData] = useState<IncomePlannerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchIncomePlanner();
      setData(res);
      // Default selection to the first gap month, or month 0
      const firstGapIdx = res.months.findIndex((m) => m.is_gap);
      setSelectedMonthIndex(firstGapIdx >= 0 ? firstGapIdx : 0);
    } catch (err: any) {
      setError(err.message || "Failed to load income planner analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number, cur: string = "EUR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-sm min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Analyzing dividend calendar and income gaps...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
        <h3 className="text-base font-semibold">Unable to load Income Planner</h3>
        <p className="text-xs mt-1 text-rose-600">{error || "No data received"}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const selectedMonth: PlannerMonth | undefined = data.months[selectedMonthIndex];
  const maxMonthlyVal = Math.max(...data.months.map((m) => m.total_amount), data.monthly_average, 1);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Target className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Income Equalizer & Planner</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Identify low-dividend months and find which existing portfolio holdings can bridge the gap.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              12M Average Target
            </span>
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(data.monthly_average, data.currency)}
              <span className="text-xs text-slate-400 font-normal"> / mo</span>
            </span>
          </div>
          <button
            onClick={loadData}
            title="Refresh Income Analysis"
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Forward Annual Income</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(data.total_annual_income, data.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Based on next 12 months</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Monthly Target</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-600">
            {formatCurrency(data.monthly_average, data.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Equalized benchmark</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Low Months (Gaps)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {data.gap_months_count}{" "}
            <span className="text-xs font-normal text-slate-500">of 12 months</span>
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">
            {data.gap_months_count === 0
              ? "All months at or above target"
              : `${data.gap_months_count} months below average`}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Distribution Stability</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {data.gap_months_count <= 2
              ? "High"
              : data.gap_months_count <= 5
              ? "Moderate"
              : "Lumpy"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data.gap_months_count <= 2
              ? "Consistent monthly flow"
              : "Concentrated payout quarters"}
          </div>
        </div>
      </div>

      {/* 12-Month Matrix & Bar Visualization */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">12-Month Cashflow Matrix</h2>
            <p className="text-xs text-slate-500">
              Click any month to view targeted holding recommendations to bridge that month's gap.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              On Target
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              Below Target
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 border-l border-slate-200 pl-3">
              <span className="w-3 h-0.5 bg-indigo-400 inline-block" />
              Avg Target ({formatCurrency(data.monthly_average, data.currency)})
            </span>
          </div>
        </div>

        {/* 12 Month Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.months.map((m, idx) => {
            const isSelected = selectedMonthIndex === idx;
            const pctOfMax = Math.min(100, Math.round((m.total_amount / maxMonthlyVal) * 100));
            const pctOfTarget =
              data.monthly_average > 0
                ? Math.min(200, Math.round((m.total_amount / data.monthly_average) * 100))
                : 100;

            return (
              <button
                key={m.month}
                onClick={() => setSelectedMonthIndex(idx)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between relative ${
                  isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30"
                    : m.is_gap
                    ? "border-amber-200/80 hover:border-amber-300 bg-amber-50/20 hover:bg-amber-50/40"
                    : "border-slate-200/80 hover:border-slate-300 bg-white"
                }`}
              >
                {/* Month Name & Year */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-slate-800">
                    {m.month_name.slice(0, 3)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {m.month.slice(0, 4)}
                  </span>
                </div>

                {/* Amount */}
                <div className="mb-2">
                  <span
                    className={`text-sm font-bold block ${
                      m.is_gap ? "text-amber-700" : "text-slate-900"
                    }`}
                  >
                    {formatCurrency(m.total_amount, data.currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {pctOfTarget}% of target
                  </span>
                </div>

                {/* Relative Visual Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${
                      m.is_gap ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pctOfMax}%` }}
                  />
                </div>

                {/* Gap or Ok Badge */}
                {m.is_gap ? (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded text-center block">
                    - {formatCurrency(m.gap_amount, data.currency)} gap
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded text-center block">
                    Target Met
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Month Detail & Recommendations */}
      {selectedMonth && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {selectedMonth.month_name} ({selectedMonth.month}) Plan
                </h3>
                {selectedMonth.is_gap ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Gap: {formatCurrency(selectedMonth.gap_amount, data.currency)} below target
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Target Achieved ({formatCurrency(selectedMonth.total_amount, data.currency)})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedMonth.is_gap
                  ? `Invest in your existing holdings that pay dividends in ${selectedMonth.month_name} to lift this month to the €${data.monthly_average.toFixed(2)} target.`
                  : `This month already meets or exceeds your 12-month average dividend target.`}
              </p>
            </div>

            {selectedMonth.is_gap && (
              <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-200/70 text-right">
                <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">
                  Gap to Close
                </span>
                <span className="text-lg font-black text-amber-900">
                  {formatCurrency(selectedMonth.gap_amount, data.currency)}
                </span>
              </div>
            )}
          </div>

          {/* Recommendations Content */}
          {selectedMonth.recommendations.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Recommended Existing Holdings for {selectedMonth.month_name}
                  </h4>
                </div>
                <span className="text-xs text-slate-400">
                  Sorted by dividend yield & capital efficiency
                </span>
              </div>

              {/* Recommendations Table / Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Holding</th>
                      <th className="py-2.5 px-3">Current Position</th>
                      <th className="py-2.5 px-3">Yield / Frequency</th>
                      <th className="py-2.5 px-3">Est. Payout/Share</th>
                      <th className="py-2.5 px-3 text-right">Shares to Add</th>
                      <th className="py-2.5 px-3 text-right">Capital Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMonth.recommendations.map((rec) => (
                      <tr
                        key={rec.ticker}
                        className="hover:bg-slate-50/80 transition-colors duration-100"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <StockLogo ticker={rec.ticker} name={rec.name} size="sm" />
                            <div>
                              <span className="font-bold text-slate-900 block">{rec.ticker}</span>
                              <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[180px]">
                                {rec.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800 block">
                            {rec.current_shares.toFixed(2)} shares
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatCurrency(rec.current_price, data.currency)} / sh
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-emerald-600 block">
                            {rec.dividend_yield.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                            {rec.payout_frequency}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 block">
                            {formatCurrency(rec.payout_amount_per_share, data.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400">per share in {selectedMonth.month_name.slice(0, 3)}</span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded text-xs inline-block">
                            +{rec.shares_to_fill_gap.toFixed(2)} sh
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-slate-900 block text-xs">
                            {formatCurrency(rec.capital_needed, data.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400">to fill €{selectedMonth.gap_amount.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-2">
                <Layers className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>How this works:</strong> Each recommendation calculates the estimated dividend per share expected in {selectedMonth.month_name} based on your scheduled payouts, historical payout months, or frequency. Purchasing the indicated additional shares would generate enough cash flow to lift {selectedMonth.month_name} to your portfolio's €{data.monthly_average.toFixed(2)} average.
                </span>
              </div>
            </div>
          ) : selectedMonth.is_gap ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200/60 text-center text-slate-500">
              <p className="text-xs">
                No existing holdings currently pay dividends in {selectedMonth.month_name}. Consider adding a stock or ETF that pays in {selectedMonth.month_name} or a monthly dividend payer.
              </p>
            </div>
          ) : (
            <div className="p-6 bg-emerald-50/40 rounded-xl border border-emerald-200/50 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-emerald-800">
                No gap to fill in {selectedMonth.month_name}!
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                Total projected income of {formatCurrency(selectedMonth.total_amount, data.currency)} exceeds your target of {formatCurrency(data.monthly_average, data.currency)}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
