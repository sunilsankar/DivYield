import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Globe2,
  PieChart as PieChartIcon,
  Coins,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { fetchDiversification } from "../../lib/api";
import { DiversificationResponse } from "../../types";
import { StockLogo } from "../ui/StockLogo";

interface DiversificationViewProps {
  onNavigateToHoldings?: () => void;
  onNavigateToSync?: () => void;
}

export const DiversificationView: React.FC<DiversificationViewProps> = ({
  onNavigateToHoldings,
  onNavigateToSync,
}) => {
  const [data, setData] = useState<DiversificationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDiversification();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load diversification analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 85) return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "stroke-emerald-500", badge: "bg-emerald-100 text-emerald-800" };
    if (score >= 70) return { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", ring: "stroke-blue-500", badge: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "stroke-amber-500", badge: "bg-amber-100 text-amber-800" };
    return { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", ring: "stroke-rose-500", badge: "bg-rose-100 text-rose-800" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Excellent</span>;
      case "good":
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Healthy</span>;
      case "moderate":
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Moderate</span>;
      default:
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Concentrated</span>;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-sm min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Calculating portfolio diversification metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 mb-1">Failed to Load Diversification</h3>
        <p className="text-sm text-slate-500 mb-4">{error || "No data returned"}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const scoreTheme = getScoreColor(data.overall_score);

  // If no holdings exist
  if (data.total_holdings_count === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Holdings Available</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Connect your Trading 212 account or add manual positions to inspect holding concentration, sector balance, and geographic exposure.
          </p>
          <div className="flex items-center justify-center gap-3">
            {onNavigateToSync && (
              <button
                onClick={onNavigateToSync}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Go to API Connections
              </button>
            )}
            {onNavigateToHoldings && (
              <button
                onClick={onNavigateToHoldings}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                View Holdings
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portfolio Diversification</h1>
            <span className="text-xs px-2.5 py-0.5 font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Risk Engine v1
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Herfindahl concentration analysis, sector balance, regional exposure, and passive income reliance.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Recalculate
        </button>
      </div>

      {/* Hero Card: Overall Diversification Score & Key Concentration Stats */}
      <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Score Ring */}
          <div className="lg:col-span-4 flex items-center gap-6 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={scoreTheme.ring}
                  strokeWidth="8"
                  strokeDasharray={`${(data.overall_score / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold ${scoreTheme.text}`}>{data.overall_score}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">/ 100</span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Diversification Rating</span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{data.rating}</h2>
              <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${scoreTheme.badge} self-start`}>
                {data.overall_score >= 70 ? "Healthy Balance" : "Needs Rebalancing"}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Assets</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{data.total_holdings_count}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">stocks & ETFs</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Effective Holdings</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{data.effective_holdings}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">weight-adjusted</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">HHI Index</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{data.hhi_index}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {data.hhi_index < 1000 ? "Low Risk (<1000)" : data.hhi_index < 1800 ? "Moderate (<1800)" : "High (>1800)"}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Top 5 Concentration</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{data.top5_concentration}%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">of total portfolio</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Diversification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.metrics.map((metric, idx) => {
          const mTheme = getScoreColor(metric.score);
          return (
            <div key={idx} className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-600 truncate">{metric.name}</span>
                  {getStatusBadge(metric.status)}
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-bold ${mTheme.text}`}>{metric.score}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      metric.score >= 85 ? "bg-emerald-500" : metric.score >= 70 ? "bg-blue-500" : metric.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, metric.score))}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{metric.description}</p>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Sector Allocation & Regional Exposure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Allocation */}
        <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sector Distribution</h3>
                <p className="text-xs text-slate-400">Recommended max weight per sector: 20-25%</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {data.total_sectors_count} Sectors
            </span>
          </div>

          <div className="flex flex-col gap-3.5 flex-1">
            {data.sectors.map((sec, idx) => {
              const isOver = sec.percentage > 25.0;
              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      {sec.sector}
                      {isOver && (
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/60 px-1.5 py-0.2 rounded">
                          Concentrated (&gt;25%)
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-slate-900">{sec.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                    {/* 25% guideline marker */}
                    <div className="absolute top-0 bottom-0 left-1/4 w-[1.5px] bg-slate-300 z-10" />
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? "bg-rose-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${Math.min(100, sec.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Geographic / Regional Exposure */}
        <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Geographic & Exchange Exposure</h3>
                <p className="text-xs text-slate-400">Capital distribution across global equity markets</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {data.geographic_exposure.length} Regions
            </span>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            {data.geographic_exposure.map((geo, idx) => (
              <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800">{geo.region}</span>
                  <span className="text-[11px] text-slate-400">{geo.holdings_count} position{geo.holdings_count !== 1 ? "s" : ""}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">{geo.percentage.toFixed(1)}%</div>
                  <div className="text-[11px] text-slate-500">€{geo.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Income Concentration vs Capital Mismatch */}
      <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Dividend Income Concentration Risk</h3>
              <p className="text-xs text-slate-400">Highlights positions where dividend reliance heavily outpaces invested capital</p>
            </div>
          </div>
          <span className="text-xs text-slate-400">Top 10 Income Contributors</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-2.5 pr-4">Holding</th>
                <th className="py-2.5 px-4 text-right">Capital Weight</th>
                <th className="py-2.5 px-4 text-right">Dividend Income Weight</th>
                <th className="py-2.5 px-4 text-center">Reliance Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.income_risks.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <StockLogo ticker={item.ticker} size="sm" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{item.ticker}</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{item.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-600">
                    {item.capital_percentage.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {item.income_percentage.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.risk_level === "high" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        <AlertTriangle className="w-3 h-3" /> High Reliance
                      </span>
                    ) : item.risk_level === "moderate" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Moderate
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Balanced
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Recommendations & Insights */}
      <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Diversification Recommendations</h3>
            <p className="text-xs text-slate-400">Automated portfolio risk findings and rebalancing suggestions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {data.recommendations.map((rec, idx) => {
            const isWarn = rec.type === "warning";
            const isCaution = rec.type === "caution";
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isWarn
                    ? "bg-rose-50/50 border-rose-200/80 text-rose-900"
                    : isCaution
                    ? "bg-amber-50/50 border-amber-200/80 text-amber-900"
                    : "bg-emerald-50/50 border-emerald-200/80 text-emerald-900"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isWarn ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : isCaution ? (
                    <Info className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-snug">{rec.title}</span>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{rec.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
