import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  PieChart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Holding } from "../../types";
import { formatCurrency, formatPercent } from "../../lib/utils";
import { StockLogo } from "../ui/StockLogo";

interface HoldingsViewProps {
  holdings: Holding[];
  onTriggerSync?: () => void;
  isSyncing?: boolean;
}

type SortField = "marketValue" | "dividendYield" | "annualDividend" | "unrealizedGainPercent" | "ticker";
type SortDirection = "asc" | "desc";

export const HoldingsView: React.FC<HoldingsViewProps> = ({
  holdings,
  onTriggerSync,
  isSyncing = false,
}) => {
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("marketValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Extract distinct sectors
  const sectors = useMemo(() => {
    const set = new Set<string>();
    holdings.forEach((h) => {
      if (h.sector) set.add(h.sector);
    });
    return Array.from(set).sort();
  }, [holdings]);

  // Aggregate portfolio metrics
  const totalMarketValue = useMemo(
    () => holdings.reduce((sum, h) => sum + h.marketValue, 0),
    [holdings]
  );

  const totalInvested = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * h.avgPrice, 0),
    [holdings]
  );

  const totalAnnualIncome = useMemo(
    () => holdings.reduce((sum, h) => sum + h.annualDividend, 0),
    [holdings]
  );

  const totalUnrealizedGain = useMemo(
    () => holdings.reduce((sum, h) => sum + h.unrealizedGain, 0),
    [holdings]
  );

  const portfolioYield = totalMarketValue > 0 ? (totalAnnualIncome / totalMarketValue) * 100 : 0;
  const yieldOnCost = totalInvested > 0 ? (totalAnnualIncome / totalInvested) * 100 : 0;
  const portfolioGainPercent = totalInvested > 0 ? (totalUnrealizedGain / totalInvested) * 100 : 0;

  // Filter & Sort
  const filteredHoldings = useMemo(() => {
    return holdings
      .filter((h) => {
        const matchesSearch =
          h.ticker.toLowerCase().includes(search.toLowerCase()) ||
          h.name.toLowerCase().includes(search.toLowerCase());
        const matchesSector =
          selectedSector === "ALL" || (h.sector && h.sector.toLowerCase() === selectedSector.toLowerCase());
        return matchesSearch && matchesSector;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === "string") {
          return sortDirection === "asc"
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }

        return sortDirection === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [holdings, search, selectedSector, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Portfolio Holdings
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Synchronized positions with live market valuation, yield metrics, and sector distribution
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-75"
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Stat Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Market Value</span>
            <span className="text-xl font-bold text-slate-900 tracking-tight mt-0.5 block">
              {formatCurrency(totalMarketValue)}
            </span>
            <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${portfolioGainPercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {portfolioGainPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{formatPercent(portfolioGainPercent)} ({formatCurrency(totalUnrealizedGain)})</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Annual Dividend</span>
            <span className="text-xl font-bold text-slate-900 tracking-tight mt-0.5 block">
              {formatCurrency(totalAnnualIncome)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              ~{formatCurrency(totalAnnualIncome / 12)} / month
            </span>
          </div>

          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Current Yield</span>
            <span className="text-xl font-bold text-indigo-600 tracking-tight mt-0.5 block">
              {formatPercent(portfolioYield)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Weighted average
            </span>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">Yield on Cost (YOC)</span>
            <span className="text-xl font-bold text-emerald-950 tracking-tight mt-0.5 block">
              {formatPercent(yieldOnCost)}
            </span>
            <span className="text-[11px] text-emerald-800 block mt-1">
              Cost: {formatCurrency(totalInvested)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticker (AAPL) or company name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Sector Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0 mr-1" />
            <button
              onClick={() => setSelectedSector("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                selectedSector === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              All ({holdings.length})
            </button>
            {sectors.map((sec) => {
              const count = holdings.filter((h) => h.sector === sec).length;
              return (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-150 ${
                    selectedSector === sec
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {sec} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th
                  onClick={() => handleSort("ticker")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Instrument</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Shares / Avg Cost</th>
                <th className="py-3 px-3 text-right">Current Price</th>
                <th
                  onClick={() => handleSort("marketValue")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Market Value / Weight</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("unrealizedGainPercent")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gain / Loss</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("dividendYield")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Yield / YOC</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("annualDividend")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Annual Income</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center w-12">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredHoldings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                    No holdings match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredHoldings.map((h) => {
                  const weight = totalMarketValue > 0 ? (h.marketValue / totalMarketValue) * 100 : 0;
                  const costBasis = h.shares * h.avgPrice;
                  const holdingYoc = costBasis > 0 ? (h.annualDividend / costBasis) * 100 : 0;
                  const isExpanded = expandedId === h.id;

                  return (
                    <React.Fragment key={h.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : h.id)}
                        className={`hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer ${
                          isExpanded ? "bg-slate-50/60" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <StockLogo ticker={h.ticker} name={h.name} size="md" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 text-sm">{h.ticker}</span>
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full font-medium text-slate-600">
                                  {h.sector || "Equity"}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 block truncate max-w-[150px] sm:max-w-[220px]">
                                {h.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-semibold text-slate-900">{h.shares}</span>
                          <span className="block text-[11px] text-slate-400">
                            @ {formatCurrency(h.avgPrice, h.currency)}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(h.currentPrice, h.currency)}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(h.marketValue, h.currency)}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {weight.toFixed(1)}% weight
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-semibold ${
                              h.unrealizedGain >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {h.unrealizedGain >= 0 ? "+" : ""}
                            {formatCurrency(h.unrealizedGain, h.currency)}
                          </span>
                          <span
                            className={`block text-[11px] ${
                              h.unrealizedGainPercent >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {formatPercent(h.unrealizedGainPercent)}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-semibold text-indigo-600">
                            {formatPercent(h.dividendYield)}
                          </span>
                          <span className="block text-[11px] text-emerald-700 font-medium" title="Yield on Cost">
                            YOC: {formatPercent(holdingYoc)}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(h.annualDividend, h.currency)}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            ~{formatCurrency(h.annualDividend / 12, h.currency)}/mo
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : h.id);
                            }}
                            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Holding Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="p-4 border-b border-slate-100">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cost Basis</span>
                                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatCurrency(costBasis, h.currency)}</span>
                                <span className="block text-[11px] text-slate-500 mt-1">
                                  {h.shares} shares × {formatCurrency(h.avgPrice, h.currency)}
                                </span>
                              </div>

                              <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Yield on Cost Advantage</span>
                                <span className="font-bold text-emerald-600 text-sm mt-0.5 block">
                                  +{formatPercent(Math.max(0, holdingYoc - h.dividendYield))}
                                </span>
                                <span className="block text-[11px] text-slate-500 mt-1">
                                  YOC ({holdingYoc.toFixed(2)}%) vs Current ({h.dividendYield.toFixed(2)}%)
                                </span>
                              </div>

                              <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Portfolio Weight</span>
                                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{weight.toFixed(2)}%</span>
                                <span className="block text-[11px] text-slate-500 mt-1">
                                  {weight > 15 ? "⚠️ High Concentration" : "✓ Balanced"}
                                </span>
                              </div>

                              <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sector & Currency</span>
                                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{h.sector || "General"}</span>
                                <span className="block text-[11px] text-slate-500 mt-1">
                                  Base Currency: {h.currency}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
