import React, { useState, useEffect } from "react";
import {
  Link2,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
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

export const MappingsManager: React.FC = () => {
  const [mappings, setMappings] = useState<InstrumentMappingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [t212Identifier, setT212Identifier] = useState("");
  const [eodhdSymbol, setEodhdSymbol] = useState("");
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  const loadMappings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMappings();
      setMappings(res.mappings);
    } catch (err: any) {
      setError(err.message || "Failed to load mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t212Identifier.trim() || !eodhdSymbol.trim()) {
      setError("Please provide both a Trading 212 identifier and an EODHD symbol.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await createOrUpdateMapping(t212Identifier.trim(), eodhdSymbol.trim(), "MANUAL");
      setSuccessMsg(res.message);
      setT212Identifier("");
      setEodhdSymbol("");
      await loadMappings();
    } catch (err: any) {
      setError(err.message || "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, identifier: string) => {
    if (!confirm(`Are you sure you want to delete the mapping for '${identifier}'?`)) return;
    setError(null);
    try {
      await deleteMapping(id);
      setMappings((prev) => prev.filter((m) => m.id !== id));
      setSuccessMsg(`Deleted mapping for ${identifier}`);
    } catch (err: any) {
      setError(err.message || "Failed to delete mapping");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await searchEODHDSymbols(searchQuery.trim());
      setSearchResults(res.results);
    } catch (err: any) {
      setError(err.message || "Symbol search failed. Ensure EODHD API token is configured.");
    } finally {
      setSearching(false);
    }
  };

  const handleRunEnrichment = async () => {
    setEnriching(true);
    setError(null);
    setEnrichResult(null);
    try {
      const res = await triggerEnrichment();
      setEnrichResult(res.message);
      await loadMappings();
    } catch (err: any) {
      setError(err.message || "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence.toUpperCase()) {
      case "MANUAL":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "EXACT_ISIN":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "EXCHANGE_QUALIFIED":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "HEURISTIC":
        return "bg-purple-100 text-purple-900 border-purple-300";
      default:
        return "bg-stone-100 text-stone-700 border-stone-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="sketch-card bg-amber-50/70 p-5 rounded-2xl relative border-2 border-stone-800 shadow-sketch">
        <div className="tape -top-2 left-6"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border-2 border-stone-800 flex items-center justify-center font-hand text-2xl shadow-sketch-sm">
              <Link2 className="w-6 h-6 text-stone-800" />
            </div>
            <div>
              <h2 className="font-hand font-bold text-2xl text-stone-900 tracking-wide flex items-center gap-2">
                Instrument Mappings
                <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-stone-200 border border-stone-800">
                  {mappings.length} Active
                </span>
              </h2>
              <p className="text-xs font-hand text-stone-600">
                Maps Trading 212 internal identifiers to EODHD ticker symbols for dividend schedules & fundamentals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunEnrichment}
              disabled={enriching}
              className="sketch-btn px-4 py-2 bg-emerald-100 text-stone-900 hover:bg-emerald-200 font-hand font-bold text-sm rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${enriching ? "animate-spin" : ""}`} />
              {enriching ? "Enriching..." : "Enrich Portfolio"}
            </button>
            <button
              onClick={loadMappings}
              disabled={loading}
              className="sketch-btn p-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl"
              title="Refresh mappings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {enrichResult && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-400 rounded-xl text-xs font-hand text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{enrichResult}</span>
          </div>
        )}
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="p-3 bg-rose-50 border-2 border-rose-500 rounded-xl text-xs font-hand text-rose-900 flex items-center gap-2 shadow-sketch-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-xs font-hand text-emerald-900 flex items-center gap-2 shadow-sketch-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Create Mapping + EODHD Search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Override Form */}
        <div className="sketch-card bg-white p-5 rounded-2xl border-2 border-stone-800 shadow-sketch relative">
          <div className="tape -top-2 left-10"></div>
          <h3 className="font-hand font-bold text-lg text-stone-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-stone-700" />
            Add / Override Mapping
          </h3>
          <p className="text-xs text-stone-600 font-hand mb-4">
            If an instrument is misidentified or has a custom Trading 212 ticker (e.g. <code>ASML_NL_EQ</code>), specify the exact EODHD symbol here (e.g. <code>ASML.AS</code>).
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-hand font-bold text-stone-700 mb-1">
                Trading 212 Identifier / Ticker
              </label>
              <input
                type="text"
                placeholder="e.g. ASML_NL_EQ or O"
                value={t212Identifier}
                onChange={(e) => setT212Identifier(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border-2 border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-xs font-hand font-bold text-stone-700 mb-1">
                EODHD Symbol (Ticker.Exchange)
              </label>
              <input
                type="text"
                placeholder="e.g. ASML.AS, O.US, ULVR.LSE"
                value={eodhdSymbol}
                onChange={(e) => setEodhdSymbol(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border-2 border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sketch-btn py-2 bg-amber-200 hover:bg-amber-300 text-stone-900 font-hand font-bold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? "Saving Mapping..." : "Save Mapping Override"}
            </button>
          </form>
        </div>

        {/* EODHD Symbol Search */}
        <div className="sketch-card bg-white p-5 rounded-2xl border-2 border-stone-800 shadow-sketch relative">
          <div className="tape -top-2 right-10"></div>
          <h3 className="font-hand font-bold text-lg text-stone-900 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-stone-700" />
            EODHD Symbol Search
          </h3>
          <p className="text-xs text-stone-600 font-hand mb-4">
            Search EODHD's global ticker directory by company name or ISIN to discover exact symbols.
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search e.g. ASML, Apple, Realty Income..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-3 py-2 text-sm font-mono border-2 border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="sketch-btn px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-hand font-bold text-sm rounded-xl transition-all"
            >
              {searching ? "..." : "Search"}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {searchResults.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-400 font-hand">
                {searching ? "Searching EODHD..." : "Search results will appear here."}
              </div>
            ) : (
              searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setEodhdSymbol(item.symbol)}
                  className="p-2 border border-stone-300 rounded-lg hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-mono font-bold text-stone-900">{item.symbol}</div>
                    <div className="text-stone-600 text-[11px] truncate max-w-[220px]">
                      {item.name} ({item.exchange})
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-300">
                    Use
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Mappings Table */}
      <div className="sketch-card bg-white p-5 rounded-2xl border-2 border-stone-800 shadow-sketch relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-hand font-bold text-lg text-stone-900">
            Resolved Instrument Mappings ({mappings.length})
          </h3>
          <span className="text-xs text-stone-500 font-hand">
            Auto-deduced and manually created mappings
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center font-hand text-stone-500 animate-pulse">
            Loading instrument mappings...
          </div>
        ) : mappings.length === 0 ? (
          <div className="py-12 text-center font-hand text-stone-500">
            No instrument mappings found. Run a sync or add a manual mapping above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-hand">
              <thead>
                <tr className="border-b-2 border-stone-800 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">T212 Identifier</th>
                  <th className="py-2.5 px-3">EODHD Symbol</th>
                  <th className="py-2.5 px-3">Resolution Confidence</th>
                  <th className="py-2.5 px-3">Updated At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">
                      {m.trading212_identifier}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                      {m.eodhd_symbol}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-sans font-semibold ${getConfidenceBadge(
                          m.confidence
                        )}`}
                      >
                        {m.confidence}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-500 text-[11px]">
                      {m.updated_at ? new Date(m.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(m.id, m.trading212_identifier)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
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
      <div className="p-4 bg-stone-50 rounded-xl border border-stone-300 text-xs font-hand text-stone-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-stone-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-stone-800 mb-0.5">Resolution Hierarchy:</div>
          <div>
            1. <strong>Manual:</strong> User explicit overrides take precedence over everything.
          </div>
          <div>
            2. <strong>Exact ISIN:</strong> Verified international securities identification number match.
          </div>
          <div>
            3. <strong>Exchange Qualified:</strong> Suffix replacement (e.g. <code>_NL_EQ</code> &rarr; <code>.AS</code>, <code>_US_EQ</code> &rarr; <code>.US</code>).
          </div>
          <div>
            4. <strong>Heuristic:</strong> Standard tickers automatically mapped to primary US exchanges (<code>.US</code>).
          </div>
        </div>
      </div>
    </div>
  );
};
