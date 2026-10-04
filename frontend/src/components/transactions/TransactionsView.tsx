import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Wallet,
  Percent,
  RefreshCw,
  Clock,
  KeyRound,
} from "lucide-react";
import { Transaction } from "../../types";
import { fetchTransactions } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import { SketchPin } from "../ui/SketchIcons";

interface TransactionsViewProps {
  onOpenConnections: () => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
}

const TYPE_FILTERS = ["ALL", "BUY", "SELL", "DIVIDEND", "CASH", "INTEREST"];

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenConnections,
  onTriggerSync,
  isSyncing,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [tickerSearch, setTickerSearch] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const pageSize = 25;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions(
        pageSize,
        page * pageSize,
        tickerSearch.trim() || undefined,
        selectedType !== "ALL" ? selectedType : undefined
      );
      setTransactions(data.transactions);
      setTotalCount(data.total_count);
    } catch (err: any) {
      setError(err.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadData();
  };

  const getTypeBadge = (type: string) => {
    const upper = type.toUpperCase();
    if (upper.includes("BUY")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sketch text-xs font-mono font-bold bg-emerald-100 text-emerald-950 border border-emerald-800">
          <ArrowDownLeft className="w-3 h-3 text-emerald-700" /> BUY
        </span>
      );
    }
    if (upper.includes("SELL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sketch text-xs font-mono font-bold bg-amber-100 text-amber-950 border border-amber-800">
          <ArrowUpRight className="w-3 h-3 text-amber-700" /> SELL
        </span>
      );
    }
    if (upper.includes("DIVIDEND")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sketch text-xs font-mono font-bold bg-teal-100 text-teal-950 border border-teal-800">
          <Coins className="w-3 h-3 text-teal-700" /> DIVIDEND
        </span>
      );
    }
    if (upper.includes("INTEREST")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sketch text-xs font-mono font-bold bg-purple-100 text-purple-950 border border-purple-800">
          <Percent className="w-3 h-3 text-purple-700" /> INTEREST
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sketch text-xs font-mono font-bold bg-paper-200 text-ink-800 border border-ink-400">
        <Wallet className="w-3 h-3 text-ink-600" /> {type}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="sketch-card p-6 bg-white space-y-6">
      {/* Header with tape accent */}
      <div className="sketch-tape-top" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-ink-900 border-dashed">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-sketch text-2xl font-bold text-ink-900">
              Transactions & Activity Log
            </h2>
            <SketchPin className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xs font-hand text-ink-muted mt-0.5">
            Synchronized Trading 212 order executions, cash movements & dividend receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-paper-100 hover:bg-paper-200 border-2 border-ink-900 rounded-sketch text-xs font-hand font-bold text-ink-900 transition-all"
            title="Refresh transactions table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <span className="text-xs font-mono px-3 py-1.5 bg-amber-100 border border-ink-900 rounded-sketch font-bold text-ink-900">
            {totalCount} Total Entries
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-paper-50 p-3 rounded-sketch border-2 border-ink-900">
        {/* Type pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono text-ink-muted flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Type:
          </span>
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setSelectedType(t);
                setPage(0);
              }}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-sketch transition-all border ${
                selectedType === t
                  ? "bg-ink-900 text-white border-ink-900 shadow-sketch-sm"
                  : "bg-white text-ink-700 hover:bg-paper-200 border-ink-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Ticker Search Box */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              placeholder="Filter ticker (e.g. ASML)..."
              className="pl-8 pr-3 py-1 bg-white border-2 border-ink-900 rounded-sketch text-xs font-mono text-ink-900 placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-amber-500 w-48 sm:w-56"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-amber-300 hover:bg-amber-400 border-2 border-ink-900 rounded-sketch text-xs font-hand font-bold text-ink-900 shadow-sketch-sm"
          >
            Find
          </button>
        </form>
      </div>

      {/* Main Table or Empty/Loading States */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="font-hand text-ink-700 text-sm">Querying SQLite transactions store...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border-2 border-rose-900 rounded-sketch text-rose-900 text-center">
          <p className="font-sketch font-bold text-base">Error Loading Activity</p>
          <p className="text-xs font-hand mt-1">{error}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-10 border-2 border-dashed border-ink-300 rounded-sketch text-center flex flex-col items-center justify-center gap-3 bg-paper-50">
          <Clock className="w-10 h-10 text-ink-400" />
          <h3 className="font-sketch text-lg font-bold text-ink-900">
            No Transactions Synchronized Yet
          </h3>
          <p className="text-xs font-hand text-ink-600 max-w-md">
            Execute a read-only sync with your Trading 212 account to pull real filled orders, cash deposits, and dividends into your local notebook.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 border-2 border-ink-900 rounded-sketch text-xs font-hand font-bold text-ink-900 shadow-sketch-sm flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>
            <button
              onClick={onOpenConnections}
              className="px-4 py-2 bg-white hover:bg-paper-100 border-2 border-ink-900 rounded-sketch text-xs font-hand font-bold text-ink-900 flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-ink-600" />
              <span>Configure API</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-ink-900 font-mono text-xs text-ink-muted uppercase">
                <th className="pb-2 pl-2">Date</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Ticker</th>
                <th className="pb-2 text-right">Shares</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total Amount</th>
                <th className="pb-2 text-center">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 font-mono text-xs">
              {transactions.map((tx) => {
                const formattedDate = tx.date ? tx.date.split("T")[0] : "-";
                return (
                  <tr key={tx.id} className="hover:bg-paper-100 transition-colors">
                    <td className="py-2.5 pl-2 text-ink-700 whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="py-2.5">{getTypeBadge(tx.type)}</td>
                    <td className="py-2.5 font-bold text-ink-900">{tx.ticker}</td>
                    <td className="py-2.5 text-right text-ink-700">
                      {tx.quantity > 0 ? tx.quantity.toFixed(2) : "-"}
                    </td>
                    <td className="py-2.5 text-right text-ink-700">
                      {tx.price > 0 ? formatCurrency(tx.price, tx.currency) : "-"}
                    </td>
                    <td className="py-2.5 text-right font-bold text-ink-900">
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-100 border border-ink-300 rounded text-ink-600">
                        {tx.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-ink-200 font-mono text-xs">
          <span className="text-ink-600">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-3 py-1 bg-white hover:bg-paper-100 border border-ink-900 rounded-sketch disabled:opacity-40 font-bold"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="px-3 py-1 bg-white hover:bg-paper-100 border border-ink-900 rounded-sketch disabled:opacity-40 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
