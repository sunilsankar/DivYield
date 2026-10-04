import React, { useState, useEffect } from "react";
import {
  Link2,
  Plus,
  Trash2,
  Search,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  fetchMappings,
  createOrUpdateMapping,
  deleteMapping,
  searchEODHDSymbols,
  triggerEnrichment,
} from "../../lib/api";
import { InstrumentMappingItem, SymbolSearchResult } from "../../types";
import { StockLogo } from "../ui/StockLogo";

export const MappingsManager: React.FC = () => {
  const [mappings, setMappings] = useState<InstrumentMappingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [t212Identifier, setT212Identifier] = useState("");
  const [eodhdSymbol, setEodhdSymbol] = useState("");
  const [saving, setSaving] = useState(false);

  // EODHD Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Enrichment Trigger State
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMappings();
      setMappings(res.mappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mappings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t212Identifier.trim() || !eodhdSymbol.trim()) {
      setError("Please provide both Trading 212 identifier and EODHD symbol.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createOrUpdateMapping(t212Identifier.trim(), eodhdSymbol.trim());
      setSuccessMsg(`Mapped ${t212Identifier.toUpperCase()} to ${eodhdSymbol.toUpperCase()}`);
      setT212Identifier("");
      setEodhdSymbol("");
      await loadMappings();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, identifier: string) => {
    if (!confirm(`Delete mapping for ${identifier}?`)) return;
    try {
      setError(null);
      await deleteMapping(id);
      setSuccessMsg(`Deleted mapping for ${identifier}`);
      await loadMappings();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete mapping");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const res = await searchEODHDSymbols(searchQuery.trim());
      setSearchResults(res.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleRunEnrichment = async () => {
    try {
      setEnriching(true);
      setEnrichResult(null);
      setError(null);
      const res = await triggerEnrichment();
      setEnrichResult(
        `Enrichment completed: ${res.instruments_enriched} enriched, ${res.dividend_events_added} dividend events added/updated.`
      );
      await loadMappings();
      setTimeout(() => setEnrichResult(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence.toUpperCase()) {
      case "MANUAL":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "EXACT_ISIN":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "EXCHANGE_QUALIFIED":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "HEURISTIC":
        return "bg-purple-50 text-purple-800 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-xl text-slate-900 tracking-tight flex items-center gap-2.5">
                Instrument Mappings
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {mappings.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Maps Trading 212 internal identifiers to EODHD ticker symbols for dividend schedules & fundamentals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunEnrichment}
              disabled={enriching}
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${enriching ? "animate-spin" : ""}`} />
              {enriching ? "Enriching..." : "Enrich Portfolio"}
            </button>
            <button
              onClick={loadMappings}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors"
              title="Refresh mappings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {enrichResult && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{enrichResult}</span>
          </div>
        )}
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Create Mapping + EODHD Search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Override Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
          <h3 className="font-semibold text-base text-slate-900 mb-1 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            Add / Override Mapping
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            If an instrument is misidentified or has a custom Trading 212 ticker (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">ASML_NL_EQ</code>), specify the exact EODHD symbol here (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">ASML.AS</code>).
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Trading 212 Identifier / Ticker
              </label>
              <input
                type="text"
                placeholder="e.g. ASML_NL_EQ or O"
                value={t212Identifier}
                onChange={(e) => setT212Identifier(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                EODHD Symbol (Ticker.Exchange)
              </label>
              <input
                type="text"
                placeholder="e.g. ASML.AS, O.US, ULVR.LSE"
                value={eodhdSymbol}
                onChange={(e) => setEodhdSymbol(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving Mapping..." : "Save Mapping Override"}
            </button>
          </form>
        </div>

        {/* EODHD Symbol Search */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
          <h3 className="font-semibold text-base text-slate-900 mb-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            EODHD Symbol Search
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Search EODHD's global ticker directory by company name or ISIN to discover exact symbols.
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search e.g. ASML, Apple, Realty Income..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
            >
              {searching ? "..." : "Search"}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {searching ? "Searching EODHD..." : "Search results will appear here."}
              </div>
            ) : (
              searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setEodhdSymbol(item.symbol)}
                  className="p-2.5 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-mono font-semibold text-slate-900">{item.symbol}</div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[220px]">
                      {item.name} ({item.exchange})
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                    Use
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Mappings Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base text-slate-900">
            Resolved Instrument Mappings ({mappings.length})
          </h3>
          <span className="text-xs text-slate-500">
            Auto-deduced and manually created mappings
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading instrument mappings...
          </div>
        ) : mappings.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No instrument mappings found. Run a sync or add a manual mapping above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">T212 Identifier</th>
                  <th className="py-3 px-3">EODHD Symbol</th>
                  <th className="py-3 px-3">Resolution Confidence</th>
                  <th className="py-3 px-3">Updated At</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <StockLogo ticker={m.trading212_identifier} size="sm" />
                        <span className="font-mono font-semibold text-slate-900">
                          {m.trading212_identifier}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-emerald-700">
                      {m.eodhd_symbol}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-medium ${getConfidenceBadge(
                          m.confidence
                        )}`}
                      >
                        {m.confidence}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {m.updated_at ? new Date(m.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(m.id, m.trading212_identifier)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Delete mapping"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-medium text-slate-800">Resolution Hierarchy:</div>
          <div>
            1. <strong>Manual:</strong> User explicit overrides take precedence over everything.
          </div>
          <div>
            2. <strong>Exact ISIN:</strong> Verified international securities identification number match.
          </div>
          <div>
            3. <strong>Exchange Qualified:</strong> Suffix replacement (e.g. <code className="bg-slate-100 px-1 rounded">_NL_EQ</code> &rarr; <code className="bg-slate-100 px-1 rounded">.AS</code>, <code className="bg-slate-100 px-1 rounded">_US_EQ</code> &rarr; <code className="bg-slate-100 px-1 rounded">.US</code>).
          </div>
          <div>
            4. <strong>Heuristic:</strong> Standard tickers automatically mapped to primary US exchanges (<code className="bg-slate-100 px-1 rounded">.US</code>).
          </div>
        </div>
      </div>
    </div>
  );
};
