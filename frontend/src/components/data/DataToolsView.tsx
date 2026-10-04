import React, { useState, useEffect } from "react";
import {
  Wallet,
  PiggyBank,
  Edit3,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  PlusCircle,
} from "lucide-react";
import {
  fetchCashInterest,
  estimateCashInterest,
  createManualHolding,
  createManualTransaction,
  getDataToolsExportUrl,
  getExportYahooUrl,
  importCsv,
  CashInterestResponse,
} from "../../lib/api";

type Tab = "interest" | "manual" | "csv";

export const DataToolsView: React.FC = () => {
  const [tab, setTab] = useState<Tab>("interest");

  return (
    <div className="space-y-6">
      <div className="sketch-box p-6 bg-[#fffef9] relative">
        <div className="sketch-tape bg-emerald-50 border-emerald-400 rotate-[-1deg] -top-3 left-1/2 transform -translate-x-1/2">
          Manual Entries & CSV Tools
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Edit3 className="w-7 h-7 text-emerald-700" />
              <span>Data Tools</span>
            </h1>
            <p className="text-gray-600 font-sans mt-1 text-sm">
              Track uninvested cash interest, record manual holdings & transactions, and import/export CSV data.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { id: "interest", label: "Cash Interest", icon: <PiggyBank className="w-4 h-4" /> },
            { id: "manual", label: "Manual Entries", icon: <PlusCircle className="w-4 h-4" /> },
            { id: "csv", label: "CSV Import / Export", icon: <Upload className="w-4 h-4" /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`sketch-button px-3 py-1.5 flex items-center gap-2 text-sm font-display font-bold ${
                tab === item.id
                  ? "bg-emerald-200 text-emerald-950 border-emerald-700"
                  : "bg-white text-gray-700 border-gray-800 hover:bg-emerald-50"
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
      <div className="sketch-box p-6 bg-[#fffef9]">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-700" />
          <span>Cash Interest Estimator (Uninvested Funds)</span>
        </h2>
        <p className="text-xs font-sans text-gray-600 mb-4">
          Calculate simple interest earned on cash sitting in your broker account. Useful when Trading 212 returns 0% on cash but you've parked funds elsewhere (e.g., treasury bills, savings account).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Average Balance (EUR)</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Annual Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Period Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Period End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 sketch-input text-sm font-mono font-bold"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Treasury bills yield"
            className="w-full px-3 py-2 sketch-input text-sm"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleEstimate}
            disabled={loading}
            className="sketch-button bg-emerald-200 text-emerald-950 border-emerald-700 hover:bg-emerald-300 px-4 py-2 text-sm font-display font-bold flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Estimate &amp; Save</span>
          </button>
          <span className="text-xs text-gray-600 font-sans italic">
            Daily Accrual: €{(balance * (rate / 100) / 365).toFixed(2)}
          </span>
        </div>

        {success && (
          <div className="mt-3 p-2 bg-emerald-50 border-2 border-emerald-400 rounded-lg text-xs text-emerald-900 font-sans flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="mt-3 p-2 bg-rose-50 border-2 border-rose-400 rounded-lg text-xs text-rose-900 font-sans flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {data && (
        <div className="sketch-box p-6 bg-[#fffef9]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-display font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-700" />
              <span>Cash Interest History</span>
            </h3>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-600 uppercase">Total YTD</div>
              <div className="text-xl font-display font-black text-emerald-800">
                €{data.total_interest_ytd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {data.periods.length === 0 ? (
            <p className="text-sm font-sans text-gray-500 italic p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              No cash interest periods yet. Use the estimator above to record a period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3 text-right">Balance (EUR)</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Interest</th>
                    <th className="py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono">
                  {data.periods.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 text-xs">
                        {p.period_start} → {p.period_end}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-sans bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                          {p.source}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">€{p.average_balance.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-700">{p.annual_rate.toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        €{p.interest_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-xs font-sans text-gray-600">{p.notes || "-"}</td>
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
      <div className="sketch-box p-6 bg-[#fffef9]">
        <h3 className="text-lg font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-emerald-700" />
          <span>Manual Holding</span>
        </h3>
        <p className="text-xs font-sans text-gray-600 mb-3">
          Track assets held outside Trading 212 or EODHD (e.g., shares on a different broker, family inheritance).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="w-full px-2 py-1.5 sketch-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Avg Price (€)</label>
            <input
              type="number"
              step="0.01"
              value={avgPrice}
              onChange={(e) => setAvgPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Sector</label>
            <input
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Tech, Finance..."
              className="w-full px-2 py-1.5 sketch-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Annual Dividend (€)</label>
            <input
              type="number"
              step="0.01"
              value={annualDividend}
              onChange={(e) => setAnnualDividend(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold"
            />
          </div>
        </div>

        <button
          onClick={handleAddHolding}
          disabled={!ticker}
          className="mt-4 sketch-button bg-emerald-200 text-emerald-950 border-emerald-700 hover:bg-emerald-300 px-3 py-2 text-sm font-display font-bold flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Save Manual Holding</span>
        </button>
      </div>

      <div className="sketch-box p-6 bg-[#fffef9]">
        <h3 className="text-lg font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-amber-700" />
          <span>Manual Transaction</span>
        </h3>
        <p className="text-xs font-sans text-gray-600 mb-3">
          Record dividends, interest, or cash movements not auto-imported.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold bg-white"
            >
              <option value="DIVIDEND">Dividend</option>
              <option value="INTEREST">Interest</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
              <option value="CASH">Cash Movement</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Ticker (optional)</label>
            <input
              type="text"
              value={txTicker}
              onChange={(e) => setTxTicker(e.target.value.toUpperCase())}
              placeholder="For dividends / buys"
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              value={txAmount}
              onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-full px-2 py-1.5 sketch-input text-sm font-mono font-bold"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={txNotes}
            onChange={(e) => setTxNotes(e.target.value)}
            placeholder="Optional description"
            className="w-full px-2 py-1.5 sketch-input text-sm"
          />
        </div>

        <button
          onClick={handleAddTransaction}
          disabled={txAmount === 0}
          className="mt-4 sketch-button bg-amber-200 text-amber-950 border-amber-700 hover:bg-amber-300 px-3 py-2 text-sm font-display font-bold flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Save Manual Transaction</span>
        </button>
      </div>

      {(error || success) && (
        <div className="lg:col-span-2">
          {success && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-lg text-sm text-emerald-900 font-sans flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-lg text-sm text-rose-900 font-sans flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
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
      <div className="sketch-box p-6 bg-[#fffef9]">
        <h3 className="text-lg font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-700" />
          <span>Export CSV</span>
        </h3>
        <p className="text-xs font-sans text-gray-600 mb-3">
          Download your local database as a CSV file for backup, analysis, or migration.
        </p>

        <div className="flex flex-wrap gap-3">
          {(["holdings", "transactions", "dividends"] as const).map((d) => (
            <a
              key={d}
              href={getDataToolsExportUrl(d)}
              target="_blank"
              rel="noreferrer"
              className="sketch-button bg-emerald-100 text-emerald-900 border-emerald-700 hover:bg-emerald-200 px-3 py-2 text-sm font-display font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export {d.toUpperCase()}</span>
            </a>
          ))}
          <a
            href={getExportYahooUrl()}
            target="_blank"
            rel="noreferrer"
            className="sketch-button bg-purple-100 text-purple-900 border-purple-700 hover:bg-purple-200 px-3 py-2 text-sm font-display font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export YAHOO PORTFOLIO</span>
          </a>
        </div>
      </div>

      <div className="sketch-box p-6 bg-[#fffef9]">
        <h3 className="text-lg font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-700" />
          <span>Import CSV</span>
        </h3>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-700 mb-1">Dataset</label>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value as typeof dataset)}
            className="px-3 py-2 sketch-input text-sm bg-white"
          >
            <option value="holdings">Holdings</option>
            <option value="transactions">Transactions</option>
            <option value="dividends">Dividends</option>
          </select>
        </div>

        <textarea
          value={csvBody}
          onChange={(e) => setCsvBody(e.target.value)}
          rows={10}
          placeholder="Paste CSV content here..."
          className="w-full px-3 py-2 sketch-input text-xs font-mono"
        />

        <button
          onClick={handleImport}
          disabled={loading || !csvBody}
          className="mt-3 sketch-button bg-amber-200 text-amber-950 border-amber-700 hover:bg-amber-300 px-3 py-2 text-sm font-display font-bold flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {loading ? "Importing..." : "Import CSV"}
        </button>

        {success && (
          <div className="mt-3 p-2 bg-emerald-50 border-2 border-emerald-400 rounded-lg text-xs text-emerald-900 font-sans flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="mt-3 p-2 bg-rose-50 border-2 border-rose-400 rounded-lg text-xs text-rose-900 font-sans flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};