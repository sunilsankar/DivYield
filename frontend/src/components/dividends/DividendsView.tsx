import React, { useState, useMemo } from "react";
import {
  Coins,
  Search,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { ApiDividendItem, MonthlyDividend } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { SketchTape } from "../ui/SketchIcons";
import { DividendBarChart } from "../dashboard/DividendBarChart";

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
        const matchesSearch = d.ticker.toLowerCase().includes(search.toLowerCase());
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
      <div className="sketch-card p-6 bg-white relative">
        <SketchTape className="w-16 absolute -top-1 right-6 z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b-2 border-ink-900 border-dashed gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-amber-600" />
              <h2 className="font-sketch text-2xl font-bold text-ink-900">
                Dividends & Payout Stream
              </h2>
            </div>
            <p className="text-xs font-hand text-ink-muted mt-1">
              Trading 212 actual cash dividends received vs forward estimated distributions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenCalendar && (
              <button
                onClick={onOpenCalendar}
                className="sketch-btn px-3 py-1.5 font-sketch text-xs font-bold bg-paper-100 hover:bg-paper-200 border-2 border-ink-900 rounded-sketch flex items-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5 text-ink-800" />
                Dividend Calendar
              </button>
            )}
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="sketch-btn px-3 py-1.5 font-sketch text-xs font-bold bg-amber-400 hover:bg-amber-300 border-2 border-ink-900 rounded-sketch flex items-center gap-1.5"
              >
                {isSyncing ? "Syncing..." : "Sync Dividends"}
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="p-3 bg-emerald-50 border-2 border-emerald-950 rounded-sketch">
            <span className="text-[10px] font-mono text-emerald-800 uppercase block font-semibold">
              Actual Cash Received
            </span>
            <span className="font-sketch text-2xl font-bold text-emerald-950">
              {formatCurrency(totalReceived)}
            </span>
            <span className="text-[11px] font-mono text-emerald-800 block mt-0.5">
              {receivedDividends.length} payouts logged
            </span>
          </div>

          <div className="p-3 bg-amber-50 border-2 border-amber-950 rounded-sketch">
            <span className="text-[10px] font-mono text-amber-800 uppercase block font-semibold">
              Forward 12-Month Projection
            </span>
            <span className="font-sketch text-2xl font-bold text-amber-950">
              {formatCurrency(totalAnnualExpected)}
            </span>
            <span className="text-[11px] font-mono text-amber-800 block mt-0.5">
              ~{formatCurrency(totalAnnualExpected / 12)} / month avg
            </span>
          </div>

          <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Filtered Total
            </span>
            <span className="font-sketch text-2xl font-bold text-ink-900">
              {formatCurrency(filteredTotal)}
            </span>
            <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
              {filteredDividends.length} of {receivedDividends.length} events
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Chart Card */}
      <div className="sketch-card p-6 bg-white">
        <div className="pb-3 mb-4 border-b-2 border-ink-900 border-dashed">
          <h3 className="font-sketch text-xl font-bold text-ink-900">
            Monthly Payout Distribution
          </h3>
          <p className="text-xs font-hand text-ink-muted">
            Green = Received cash from Trading 212 • Striped amber = Expected forward distributions
          </p>
        </div>
        <DividendBarChart data={monthlyChartData} />
      </div>

      {/* Received Dividends Activity Table */}
      <div className="sketch-card p-4 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-ink-200">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dividend by ticker..."
              className="w-full pl-9 pr-3 py-1.5 bg-paper-50 border-2 border-ink-900 rounded-sketch font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ink-muted">Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="p-1.5 bg-paper-50 border-2 border-ink-900 rounded-sketch font-mono text-xs"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-ink-900 font-bold text-ink-muted uppercase">
                <th className="pb-2.5">Date</th>
                <th className="pb-2.5">Ticker / Company</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5 text-right">Gross Amount</th>
                <th className="pb-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {filteredDividends.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm font-hand text-ink-muted">
                    No received dividends match your filters.
                  </td>
                </tr>
              ) : (
                filteredDividends.map((div, idx) => (
                  <tr key={div.id || idx} className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 font-mono text-ink-900">
                      {div.payment_date || div.ex_dividend_date || "—"}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-900">{div.ticker}</span>
                        <span className="text-[10px] text-ink-muted px-1.5 py-0.5 bg-paper-100 rounded border border-ink-200">
                          {div.source || "Trading 212"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-ink-700">Ordinary Dividend</td>
                    <td className="py-2.5 text-right font-bold text-emerald-700">
                      +{formatCurrency(div.amount, div.currency)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-sketch border border-emerald-300">
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
