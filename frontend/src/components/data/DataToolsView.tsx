import React, { useState, useEffect } from "react";
import {
  Edit3,
  PiggyBank,
  PlusCircle,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calculator,
  Wallet,
} from "lucide-react";
import {
  fetchCashInterest,
  estimateCashInterest,
  createManualHolding,
  createManualTransaction,
  getDataToolsExportUrl,
  getExportYahooUrl,
  importCsv,
} from "../../lib/api";
import { CashInterestResponse, CashInterestItem } from "../../types";

type Tab = "interest" | "manual" | "csv";

export const DataToolsView: React.FC = () => {
  const [tab, setTab] = useState<Tab>("interest");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <Edit3 className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                Data Tools
              </h1>
            </div>
            <p className="text-slate-500 mt-1 text-xs">
              Track uninvested cash interest, record manual holdings & transactions, and import/export CSV data.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
          {([
            { id: "interest", label: "Cash Interest", icon: <PiggyBank className="w-4 h-4" /> },
            { id: "manual", label: "Manual Entries", icon: <PlusCircle className="w-4 h-4" /> },
            { id: "csv", label: "CSV Import / Export", icon: <Upload className="w-4 h-4" /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-2 flex items-center gap-2 text-xs font-medium rounded-xl transition-all ${
                tab === item.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "interest" && <CashInterestPanel />}
      {tab === "manual" && <ManualEntriesPanel />}
      {tab === "csv" && <CsvPanel />}
    </div>
  );
};

const CashInterestPanel: React.FC = () => {
  const [balance, setBalance] = useState<number>(10000);
  const [rate, setRate] = useState<number>(3.0);
  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("Quarterly savings interest");
  const [data, setData] = useState<CashInterestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetchCashInterest();
      setData(res);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEstimate = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await estimateCashInterest({
        average_balance: balance,
        annual_rate_percent: rate,
        period_start: start,
        period_end: end,
        notes,
      });
      setSuccess(`Saved cash interest period.`);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>Cash Interest Estimator (Uninvested Funds)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculate simple interest earned on cash sitting in your broker account. Useful when Trading 212 returns 0% on cash but you've parked funds elsewhere (e.g., treasury bills, savings account).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Average Balance (EUR)</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Annual Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Period Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Period End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Treasury bills yield"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleEstimate}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Estimate &amp; Save</span>
          </button>
          <span className="text-xs text-slate-500 italic">
            Daily Accrual: €{(balance * (rate / 100) / 365).toFixed(2)}
          </span>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {error}
          </div>
        )}
      </div>

      {data && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>Cash Interest History</span>
            </h3>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total YTD</div>
              <div className="text-lg font-bold text-emerald-700">
                €{data.total_interest_ytd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {data.periods.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
              No cash interest periods yet. Use the estimator above to record a period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3 text-right">Balance (EUR)</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Interest</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.periods.map((p: CashInterestItem) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {p.period_start} → {p.period_end}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                          {p.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">€{p.average_balance.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-indigo-600 font-mono">{p.annual_rate.toFixed(2)}%</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 font-mono">
                        €{p.interest_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ManualEntriesPanel: React.FC = () => {
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [avgPrice, setAvgPrice] = useState(100);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [annualDividend, setAnnualDividend] = useState(0);

  const [txType, setTxType] = useState("DIVIDEND");
  const [txAmount, setTxAmount] = useState(0);
  const [txTicker, setTxTicker] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txNotes, setTxNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddHolding = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await createManualHolding({
        ticker,
        quantity,
        average_price: avgPrice,
        name,
        sector,
        annual_dividend: annualDividend,
      });
      setSuccess(res.message);
      setTicker("");
      setName("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddTransaction = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await createManualTransaction({
        ticker: txTicker || undefined,
        type: txType,
        amount: txAmount,
        date: txDate,
        notes: txNotes,
      });
      setSuccess(res.message);
      setTxAmount(0);
      setTxNotes("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-600" />
            <span>Manual Holding</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track assets held outside Trading 212 (e.g., shares on a different broker, family inheritance).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Avg Price (€)</label>
            <input
              type="number"
              step="0.01"
              value={avgPrice}
              onChange={(e) => setAvgPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Sector</label>
            <input
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Tech, Finance..."
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Annual Dividend (€)</label>
            <input
              type="number"
              step="0.01"
              value={annualDividend}
              onChange={(e) => setAnnualDividend(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleAddHolding}
          disabled={!ticker}
          className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Save Manual Holding</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-amber-600" />
            <span>Manual Transaction</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Record dividends, interest, or cash movements not auto-imported.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Type</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="DIVIDEND">Dividend</option>
              <option value="INTEREST">Interest</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
              <option value="CASH">Cash Movement</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ticker (optional)</label>
            <input
              type="text"
              value={txTicker}
              onChange={(e) => setTxTicker(e.target.value.toUpperCase())}
              placeholder="For dividends / buys"
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              value={txAmount}
              onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Date</label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
          <input
            type="text"
            value={txNotes}
            onChange={(e) => setTxNotes(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <button
          onClick={handleAddTransaction}
          disabled={txAmount === 0}
          className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Save Manual Transaction</span>
        </button>
      </div>

      {(error || success) && (
        <div className="lg:col-span-2">
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {success}
            </div>
          )}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CsvPanel: React.FC = () => {
  const [dataset, setDataset] = useState<"holdings" | "transactions" | "dividends">("holdings");
  const [csvBody, setCsvBody] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await importCsv(dataset, csvBody);
      setSuccess(res.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download your local database as a CSV file for backup, analysis, or migration.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {(["holdings", "transactions", "dividends"] as const).map((d) => (
            <a
              key={d}
              href={getDataToolsExportUrl(d)}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export {d.toUpperCase()}</span>
            </a>
          ))}
          <a
            href={getExportYahooUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-purple-700" />
            <span>Export YAHOO PORTFOLIO</span>
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-600" />
            <span>Import CSV</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Import bulk records into local storage.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Dataset</label>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value as typeof dataset)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="holdings">Holdings</option>
            <option value="transactions">Transactions</option>
            <option value="dividends">Dividends</option>
          </select>
        </div>

        <textarea
          value={csvBody}
          onChange={(e) => setCsvBody(e.target.value)}
          rows={8}
          placeholder="Paste CSV content here..."
          className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />

        <button
          onClick={handleImport}
          disabled={loading || !csvBody}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {loading ? "Importing..." : "Import CSV"}
        </button>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
