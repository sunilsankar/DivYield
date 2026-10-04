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
import { StockLogo } from "../ui/StockLogo";

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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> BUY
        </span>
      );
    }
    if (upper.includes("SELL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <ArrowUpRight className="w-3 h-3 text-amber-600" /> SELL
        </span>
      );
    }
    if (upper.includes("DIVIDEND")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Coins className="w-3 h-3 text-indigo-600" /> DIVIDEND
        </span>
      );
    }
    if (upper.includes("INTEREST")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
          <Percent className="w-3 h-3 text-purple-600" /> INTEREST
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Wallet className="w-3 h-3 text-slate-500" /> {type}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Transactions & Activity Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized Trading 212 order executions, cash movements & dividend receipts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-all"
            title="Refresh transactions table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700">
            {totalCount} Total Entries
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
        {/* Type pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Type:
          </span>
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setSelectedType(t);
                setPage(0);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedType === t
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Ticker Search Box */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              placeholder="Filter ticker (e.g. ASML)..."
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            Find
          </button>
        </form>
      </div>

      {/* Main Table or Empty/Loading States */}
      {loading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Querying transactions store...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-center">
          <p className="font-bold text-sm">Error Loading Activity</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50">
          <Clock className="w-10 h-10 text-slate-300" />
          <h3 className="text-base font-bold text-slate-900">
            No Transactions Synchronized Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md">
            Execute a read-only sync with your Trading 212 account to pull real filled orders, cash deposits, and dividends into your local portfolio.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>
            <button
              onClick={onOpenConnections}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-sm transition-all"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure API</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Ticker / Asset</th>
                <th className="pb-3 text-right">Shares</th>
                <th className="pb-3 text-right">Price</th>
                <th className="pb-3 text-right">Total Amount</th>
                <th className="pb-3 text-center">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const formattedDate = tx.date ? tx.date.split("T")[0] : "-";
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-2 text-slate-600 whitespace-nowrap font-medium">
                      {formattedDate}
                    </td>
                    <td className="py-3">{getTypeBadge(tx.type)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {tx.ticker && <StockLogo ticker={tx.ticker} size="sm" />}
                        <span className="font-semibold text-slate-900">{tx.ticker || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {tx.quantity > 0 ? tx.quantity.toFixed(4).replace(/\.?0+$/, "") : "-"}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {tx.price > 0 ? formatCurrency(tx.price, tx.currency) : "-"}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
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
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-40 font-semibold text-slate-700 transition-colors shadow-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-40 font-semibold text-slate-700 transition-colors shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
