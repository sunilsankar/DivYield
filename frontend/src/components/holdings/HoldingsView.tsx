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
  Link2,
} from "lucide-react";
import { Holding } from "../../types";
import { formatCurrency, formatPercent } from "../../lib/utils";
import { SketchTape } from "../ui/SketchIcons";

interface HoldingsViewProps {
  holdings: Holding[];
  onOpenMappings?: () => void;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
}

type SortField = "marketValue" | "dividendYield" | "annualDividend" | "unrealizedGainPercent" | "ticker";
type SortDirection = "asc" | "desc";

export const HoldingsView: React.FC<HoldingsViewProps> = ({
  holdings,
  onOpenMappings,
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
      <div className="sketch-card p-6 bg-white relative">
        <SketchTape className="w-16 absolute -top-1 right-6 z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b-2 border-ink-900 border-dashed gap-4">
          <div>
            <div className="flex items-center gap-2">
              <PieChart className="w-6 h-6 text-amber-600" />
              <h2 className="font-sketch text-2xl font-bold text-ink-900">
                Portfolio Holdings
              </h2>
            </div>
            <p className="text-xs font-hand text-ink-muted mt-1">
              Synchronized positions with live market valuation, yield metrics, and sector distribution
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenMappings && (
              <button
                onClick={onOpenMappings}
                className="sketch-btn px-3 py-1.5 font-sketch text-xs font-bold bg-paper-100 hover:bg-paper-200 border-2 border-ink-900 rounded-sketch flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-700" />
                Mappings
              </button>
            )}
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="sketch-btn px-3 py-1.5 font-sketch text-xs font-bold bg-amber-400 hover:bg-amber-300 border-2 border-ink-900 rounded-sketch flex items-center gap-1.5"
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Stat Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Market Value</span>
            <span className="font-sketch text-xl font-bold text-ink-900">
              {formatCurrency(totalMarketValue)}
            </span>
            <div className={`flex items-center gap-1 text-[11px] font-mono font-bold mt-0.5 ${portfolioGainPercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {portfolioGainPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{formatPercent(portfolioGainPercent)} ({formatCurrency(totalUnrealizedGain)})</span>
            </div>
          </div>

          <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Annual Dividend</span>
            <span className="font-sketch text-xl font-bold text-amber-700">
              {formatCurrency(totalAnnualIncome)}
            </span>
            <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
              ~{formatCurrency(totalAnnualIncome / 12)} / month
            </span>
          </div>

          <div className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Current Yield</span>
            <span className="font-sketch text-xl font-bold text-blue-700">
              {formatPercent(portfolioYield)}
            </span>
            <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
              Weighted avg
            </span>
          </div>

          <div className="p-3 bg-emerald-50 border-2 border-emerald-950 rounded-sketch">
            <span className="text-[10px] font-mono text-emerald-800 uppercase block font-semibold">Yield on Cost (YOC)</span>
            <span className="font-sketch text-xl font-bold text-emerald-950">
              {formatPercent(yieldOnCost)}
            </span>
            <span className="text-[11px] font-mono text-emerald-800 block mt-0.5">
              Cost: {formatCurrency(totalInvested)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="sketch-card p-4 bg-white space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticker (AAPL) or company name..."
              className="w-full pl-9 pr-3 py-2 bg-paper-50 border-2 border-ink-900 rounded-sketch font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Sector Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-ink-muted flex-shrink-0" />
            <button
              onClick={() => setSelectedSector("ALL")}
              className={`px-2.5 py-1 text-xs font-mono rounded-sketch border ${
                selectedSector === "ALL"
                  ? "bg-ink-900 text-white border-ink-900 font-bold"
                  : "bg-paper-100 hover:bg-paper-200 text-ink-800 border-ink-300"
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
                  className={`px-2.5 py-1 text-xs font-mono rounded-sketch border whitespace-nowrap ${
                    selectedSector === sec
                      ? "bg-amber-400 text-ink-900 border-ink-900 font-bold"
                      : "bg-paper-100 hover:bg-paper-200 text-ink-800 border-ink-300"
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
      <div className="sketch-card p-4 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-ink-900 text-xs font-mono font-bold text-ink-muted uppercase">
                <th
                  onClick={() => handleSort("ticker")}
                  className="pb-3 cursor-pointer hover:text-ink-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Instrument</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="pb-3 text-right">Shares / Avg Cost</th>
                <th className="pb-3 text-right">Current Price</th>
                <th
                  onClick={() => handleSort("marketValue")}
                  className="pb-3 text-right cursor-pointer hover:text-ink-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Market Value / Weight</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("unrealizedGainPercent")}
                  className="pb-3 text-right cursor-pointer hover:text-ink-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gain / Loss</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("dividendYield")}
                  className="pb-3 text-right cursor-pointer hover:text-ink-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Yield / YOC</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("annualDividend")}
                  className="pb-3 text-right cursor-pointer hover:text-ink-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Annual Income</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="pb-3 text-center w-10">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {filteredHoldings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm font-hand text-ink-muted">
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
                        className={`hover:bg-amber-50/60 transition-colors cursor-pointer text-xs font-mono ${
                          isExpanded ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-sketch bg-paper-100 border border-ink-900 flex items-center justify-center font-bold text-ink-900 flex-shrink-0">
                              {h.ticker.slice(0, 3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-ink-900 text-sm">{h.ticker}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-paper-100 border border-ink-300 rounded font-normal text-ink-700">
                                  {h.sector || "Equity"}
                                </span>
                              </div>
                              <span className="text-[11px] font-hand text-ink-muted block truncate max-w-[140px] sm:max-w-[200px]">
                                {h.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-2 text-right">
                          <span className="font-bold text-ink-900">{h.shares}</span>
                          <span className="block text-[11px] text-ink-muted">
                            @ {formatCurrency(h.avgPrice, h.currency)}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right">
                          <span className="font-bold text-ink-900">
                            {formatCurrency(h.currentPrice, h.currency)}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right">
                          <span className="font-bold text-ink-900">
                            {formatCurrency(h.marketValue, h.currency)}
                          </span>
                          <span className="block text-[11px] text-ink-muted">
                            {weight.toFixed(1)}% weight
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right">
                          <span
                            className={`font-bold ${
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

                        <td className="py-3 px-2 text-right">
                          <span className="font-bold text-blue-700">
                            {formatPercent(h.dividendYield)}
                          </span>
                          <span className="block text-[11px] text-emerald-800 font-semibold" title="Yield on Cost">
                            YOC: {formatPercent(holdingYoc)}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right">
                          <span className="font-bold text-amber-700">
                            {formatCurrency(h.annualDividend, h.currency)}
                          </span>
                          <span className="block text-[11px] text-ink-muted">
                            ~{formatCurrency(h.annualDividend / 12, h.currency)}/mo
                          </span>
                        </td>

                        <td className="py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : h.id);
                            }}
                            className="p-1 hover:bg-paper-200 rounded border border-ink-300"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-ink-700" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-ink-700" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Holding Details Row */}
                      {isExpanded && (
                        <tr className="bg-paper-50/80">
                          <td colSpan={8} className="p-4 border-b border-ink-200">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                              <div className="p-2.5 bg-white border border-ink-300 rounded-sketch">
                                <span className="text-[10px] text-ink-muted uppercase block">Cost Basis</span>
                                <span className="font-bold text-ink-900">{formatCurrency(costBasis, h.currency)}</span>
                                <span className="block text-[10px] text-ink-muted mt-0.5">
                                  {h.shares} shares × {formatCurrency(h.avgPrice, h.currency)}
                                </span>
                              </div>

                              <div className="p-2.5 bg-white border border-ink-300 rounded-sketch">
                                <span className="text-[10px] text-ink-muted uppercase block">Yield on Cost Advantage</span>
                                <span className="font-bold text-emerald-700">
                                  +{formatPercent(Math.max(0, holdingYoc - h.dividendYield))}
                                </span>
                                <span className="block text-[10px] text-ink-muted mt-0.5">
                                  YOC ({holdingYoc.toFixed(2)}%) vs Current ({h.dividendYield.toFixed(2)}%)
                                </span>
                              </div>

                              <div className="p-2.5 bg-white border border-ink-300 rounded-sketch">
                                <span className="text-[10px] text-ink-muted uppercase block">Portfolio Share</span>
                                <span className="font-bold text-ink-900">{weight.toFixed(2)}%</span>
                                <span className="block text-[10px] text-ink-muted mt-0.5">
                                  {weight > 15 ? "⚠️ High Concentration" : "✓ Balanced"}
                                </span>
                              </div>

                              <div className="p-2.5 bg-white border border-ink-300 rounded-sketch">
                                <span className="text-[10px] text-ink-muted uppercase block">Sector & Currency</span>
                                <span className="font-bold text-ink-900">{h.sector || "General"}</span>
                                <span className="block text-[10px] text-ink-muted mt-0.5">
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
