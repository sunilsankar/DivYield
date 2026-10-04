import React, { useState, useMemo } from "react";
import {
  Coins,
  Search,
  CheckCircle2,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { ApiDividendItem, MonthlyDividend } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { DividendBarChart } from "../dashboard/DividendBarChart";
import { StockLogo } from "../ui/StockLogo";

interface DividendsViewProps {
  receivedDividends: ApiDividendItem[];
  monthlyChartData: MonthlyDividend[];
  totalAnnualExpected?: number;
  onOpenCalendar?: () => void;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
}

export const DividendsView: React.FC<DividendsViewProps> = ({
  receivedDividends,
  monthlyChartData,
  totalAnnualExpected = 0,
  onOpenCalendar,
  onTriggerSync,
  isSyncing = false,
}) => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("ALL");

  // Calculate totals
  const totalReceived = useMemo(
    () => receivedDividends.reduce((sum, d) => sum + d.amount, 0),
    [receivedDividends]
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    receivedDividends.forEach((d) => {
      const dateStr = d.payment_date || d.ex_dividend_date;
      if (dateStr && dateStr.length >= 4) {
        years.add(dateStr.slice(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [receivedDividends]);

  // Filter dividends
  const filteredDividends = useMemo(() => {
    return receivedDividends
      .filter((d) => {
        const matchesSearch =
          d.ticker.toLowerCase().includes(search.toLowerCase()) ||
          (d.company_name && d.company_name.toLowerCase().includes(search.toLowerCase()));
        const dateStr = d.payment_date || d.ex_dividend_date || "";
        const matchesYear = yearFilter === "ALL" || dateStr.startsWith(yearFilter);
        return matchesSearch && matchesYear;
      })
      .sort((a, b) => {
        const dateA = a.payment_date || a.ex_dividend_date || "";
        const dateB = b.payment_date || b.ex_dividend_date || "";
        return dateB.localeCompare(dateA);
      });
  }, [receivedDividends, search, yearFilter]);

  const filteredTotal = useMemo(
    () => filteredDividends.reduce((sum, d) => sum + d.amount, 0),
    [filteredDividends]
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Dividend History & Cash Stream
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trading 212 actual cash dividends received vs forward estimated distributions
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenCalendar && (
              <button
                onClick={onOpenCalendar}
                className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm flex items-center gap-2 transition-all hover:border-slate-300"
              >
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Visual Calendar
              </button>
            )}
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSyncing ? "Syncing..." : "Sync Dividends"}
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-xl">
            <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider block">
              Actual Cash Received
            </span>
            <span className="text-2xl font-bold text-emerald-950 mt-1 block">
              {formatCurrency(totalReceived)}
            </span>
            <span className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {receivedDividends.length} payouts logged
            </span>
          </div>

          <div className="p-4 bg-indigo-50/50 border border-indigo-200/70 rounded-xl">
            <span className="text-[11px] font-medium text-indigo-800 uppercase tracking-wider block">
              Forward 12-Month Projection
            </span>
            <span className="text-2xl font-bold text-indigo-950 mt-1 block">
              {formatCurrency(totalAnnualExpected)}
            </span>
            <span className="text-xs text-indigo-700 mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              ~{formatCurrency(totalAnnualExpected / 12)} / month avg
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Filtered Total ({yearFilter})
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {formatCurrency(filteredTotal)}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              {filteredDividends.length} of {receivedDividends.length} events
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="pb-4 mb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Monthly Cash & Payout Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Emerald = Verified cash received • Indigo = Forward scheduled payouts
            </p>
          </div>
        </div>
        <DividendBarChart data={monthlyChartData} />
      </div>

      {/* Received Dividends Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker or company..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Year Filter:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Years ({receivedDividends.length})</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-1">Payment Date</th>
                <th className="pb-3">Asset / Company</th>
                <th className="pb-3">Distribution Type</th>
                <th className="pb-3 text-right">Net Amount</th>
                <th className="pb-3 text-right pr-1">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDividends.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                    No received dividends match your filters.
                  </td>
                </tr>
              ) : (
                filteredDividends.map((div, idx) => (
                  <tr key={div.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-1 font-medium text-slate-700">
                      {div.payment_date || div.ex_dividend_date || "—"}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <StockLogo ticker={div.ticker} size="sm" />
                        <div>
                          <div className="font-semibold text-slate-900">{div.ticker}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {div.company_name || div.source || "Trading 212"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">Ordinary Dividend</td>
                    <td className="py-3 text-right font-bold text-emerald-600 font-mono text-sm">
                      +{formatCurrency(div.amount, div.currency)}
                    </td>
                    <td className="py-3 text-right pr-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Received
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
