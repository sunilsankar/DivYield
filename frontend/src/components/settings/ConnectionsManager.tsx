import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  ExternalLink,
  Info,
  HelpCircle,
} from "lucide-react";
import { SetupGuideModal } from "./SetupGuideModal";
import {
  fetchConnections,
  saveTrading212Credentials,
  testTrading212Connection,
  deleteTrading212Credentials,
  saveEODHDCredentials,
  testEODHDConnection,
  deleteEODHDCredentials,
} from "../../lib/api";
import { ConnectionsResponse, ConnectionTestResult } from "../../types";

interface Props {
  onConnectionChange?: () => void;
}

export const ConnectionsManager: React.FC<Props> = ({ onConnectionChange }) => {
  const [connections, setConnections] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [guideProvider, setGuideProvider] = useState<'trading212' | 'eodhd' | null>(null);

  // Trading 212 Form State
  const [t212ApiKey, setT212ApiKey] = useState("");
  const [t212ApiSecret, setT212ApiSecret] = useState("");
  const [t212Env, setT212Env] = useState<"live" | "demo">("live");
  const [showT212Key, setShowT212Key] = useState(false);
  const [showT212Secret, setShowT212Secret] = useState(false);
  const [t212Testing, setT212Testing] = useState(false);
  const [t212Saving, setT212Saving] = useState(false);
  const [t212Feedback, setT212Feedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // EODHD Form State
  const [eodhdToken, setEodhdToken] = useState("");
  const [showEodhdToken, setShowEodhdToken] = useState(false);
  const [eodhdTesting, setEodhdTesting] = useState(false);
  const [eodhdSaving, setEodhdSaving] = useState(false);
  const [eodhdFeedback, setEodhdFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConnections();
      setConnections(data);
      if (data.trading212.environment === "demo" || data.trading212.environment === "live") {
        setT212Env(data.trading212.environment as "live" | "demo");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load connection status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Trading 212 Actions
  const handleTestT212 = async () => {
    setT212Testing(true);
    setT212Feedback(null);
    try {
      const res: ConnectionTestResult = await testTrading212Connection(
        t212ApiKey
          ? {
              api_key: t212ApiKey,
              api_secret: t212ApiSecret || undefined,
              environment: t212Env,
            }
          : undefined
      );

      if (res.status === "connected") {
        setT212Feedback({
          type: "success",
          message: `✓ Connected to Trading 212 (${res.environment?.toUpperCase() || t212Env.toUpperCase()})! Base currency: ${res.account_currency || "EUR"}`,
        });
      } else if (res.status === "invalid_credentials") {
        setT212Feedback({
          type: "error",
          message: res.message || "✗ Invalid API credentials. Please verify your API Key and Secret in Trading 212 settings.",
        });
      } else if (res.status === "access_denied") {
        setT212Feedback({
          type: "error",
          message: res.message || "✗ Access Denied. Ensure Account & Metadata permissions are granted, or verify IP restrictions.",
        });
      } else if (res.status === "rate_limited") {
        setT212Feedback({
          type: "warning",
          message: res.message || "⚠ Rate limit reached on Trading 212 API. Wait a moment and retry.",
        });
      } else {
        setT212Feedback({
          type: "error",
          message: res.message || `Connection failed (${res.status})`,
        });
      }
      await loadData();
      onConnectionChange?.();
    } catch (err: any) {
      setT212Feedback({
        type: "error",
        message: err.message || "Trading 212 connection test failed",
      });
    } finally {
      setT212Testing(false);
    }
  };

  const handleSaveT212 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t212ApiKey.trim()) {
      setT212Feedback({ type: "error", message: "API Key cannot be blank" });
      return;
    }
    setT212Saving(true);
    setT212Feedback(null);
    try {
      await saveTrading212Credentials({
        api_key: t212ApiKey,
        api_secret: t212ApiSecret || undefined,
        environment: t212Env,
      });
      setT212ApiKey("");
      setT212ApiSecret("");
      setT212Feedback({
        type: "success",
        message: "✓ Credentials saved to OS Keychain / encrypted storage! Running verification test...",
      });
      await loadData();
      onConnectionChange?.();
      // Auto-trigger test to confirm
      handleTestT212();
    } catch (err: any) {
      setT212Feedback({
        type: "error",
        message: err.message || "Failed to save Trading 212 credentials",
      });
    } finally {
      setT212Saving(false);
    }
  };

  const handleDeleteT212 = async () => {
    if (!confirm("Are you sure you want to disconnect Trading 212? Stored credentials will be deleted from your keychain.")) {
      return;
    }
    try {
      await deleteTrading212Credentials();
      setT212ApiKey("");
      setT212ApiSecret("");
      setT212Feedback({
        type: "success",
        message: "Trading 212 disconnected.",
      });
      await loadData();
      onConnectionChange?.();
    } catch (err: any) {
      setT212Feedback({
        type: "error",
        message: err.message || "Failed to disconnect Trading 212",
      });
    }
  };

  // EODHD Actions
  const handleTestEODHD = async () => {
    setEodhdTesting(true);
    setEodhdFeedback(null);
    try {
      const res: ConnectionTestResult = await testEODHDConnection(
        eodhdToken ? { api_token: eodhdToken } : undefined
      );
      if (res.status === "connected") {
        if (res.has_dividend_calendar) {
          setEodhdFeedback({
            type: "success",
            message: "✓ Connected to EODHD with active Dividend Calendar access!",
          });
        } else {
          setEodhdFeedback({
            type: "warning",
            message: "✓ Connected to EODHD, but Dividend Calendar is unavailable on this plan tier.",
          });
        }
      } else if (res.status === "invalid_credentials") {
        setEodhdFeedback({
          type: "error",
          message: "✗ Invalid EODHD API Token. Please check your token at eodhd.com.",
        });
      } else {
        setEodhdFeedback({
          type: "error",
          message: res.message || `Connection failed (${res.status})`,
        });
      }
      await loadData();
      onConnectionChange?.();
    } catch (err: any) {
      setEodhdFeedback({
        type: "error",
        message: err.message || "EODHD connection test failed",
      });
    } finally {
      setEodhdTesting(false);
    }
  };

  const handleSaveEODHD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eodhdToken.trim()) {
      setEodhdFeedback({ type: "error", message: "API Token cannot be blank" });
      return;
    }
    setEodhdSaving(true);
    setEodhdFeedback(null);
    try {
      await saveEODHDCredentials({ api_token: eodhdToken });
      setEodhdToken("");
      setEodhdFeedback({
        type: "success",
        message: "✓ EODHD Token saved to OS Keychain / encrypted storage! Running test...",
      });
      await loadData();
      onConnectionChange?.();
      handleTestEODHD();
    } catch (err: any) {
      setEodhdFeedback({
        type: "error",
        message: err.message || "Failed to save EODHD credentials",
      });
    } finally {
      setEodhdSaving(false);
    }
  };

  const handleDeleteEODHD = async () => {
    if (!confirm("Are you sure you want to disconnect EODHD? Stored token will be deleted.")) {
      return;
    }
    try {
      await deleteEODHDCredentials();
      setEodhdToken("");
      setEodhdFeedback({
        type: "success",
        message: "EODHD disconnected.",
      });
      await loadData();
      onConnectionChange?.();
    } catch (err: any) {
      setEodhdFeedback({
        type: "error",
        message: err.message || "Failed to disconnect EODHD",
      });
    }
  };

  const renderStatusBadge = (status: string, warning?: string | null) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Connected {warning && "(Partial)"}
          </span>
        );
      case "invalid_credentials":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Invalid Credentials
          </span>
        );
      case "access_denied":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Access Denied
          </span>
        );
      case "rate_limited":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Rate Limited
          </span>
        );
      case "untested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            Configured (Untested)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              API Connections & Credentials
            </h1>
            <span className="bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-600" /> OS Keychain Enforced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure your read-only Trading 212 portfolio sync and EODHD dividend enrichment.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-900 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TRADING 212 CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center font-bold text-xs text-blue-600">
                  212
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Trading 212</h2>
                  <p className="text-xs text-slate-500">Authoritative portfolio & dividend history</p>
                </div>
              </div>
              <div>{renderStatusBadge(connections?.trading212.status || "disconnected")}</div>
            </div>

            {/* Configured Banner */}
            {connections?.trading212.configured && (
              <div className="mt-4 p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl flex items-center justify-between">
                <div className="text-xs text-emerald-900 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Key Stored: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800">{connections.trading212.masked_key}</code>
                  </div>
                  <div className="text-emerald-700 text-[11px]">
                    Environment: <strong className="uppercase">{connections.trading212.environment}</strong>
                    {connections.trading212.last_checked && ` · Checked: ${new Date(connections.trading212.last_checked).toLocaleTimeString()}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteT212}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 ml-2 font-medium"
                  title="Remove from keychain"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            )}

            {/* Feedback Message */}
            {t212Feedback && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  t212Feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : t212Feedback.type === "warning"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                {t212Feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                )}
                <span>{t212Feedback.message}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSaveT212} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    API Key {connections?.trading212.configured && <span className="text-slate-400 font-normal">(Leave blank to keep existing)</span>}
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setGuideProvider('trading212')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to get this?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showT212Key ? "text" : "password"}
                    value={t212ApiKey}
                    onChange={(e) => setT212ApiKey(e.target.value)}
                    placeholder={connections?.trading212.configured ? "Enter new key to update..." : "e.g. 12345Z... or your Trading 212 API Key"}
                    className="w-full text-xs font-mono px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowT212Key(!showT212Key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showT212Key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Secret <span className="text-slate-400 font-normal">(Optional for API v0 Basic Auth)</span>
                </label>
                <div className="relative">
                  <input
                    type={showT212Secret ? "text" : "password"}
                    value={t212ApiSecret}
                    onChange={(e) => setT212ApiSecret(e.target.value)}
                    placeholder={connections?.trading212.configured ? "Enter new secret or leave blank..." : "Optional API Secret..."}
                    className="w-full text-xs font-mono px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowT212Secret(!showT212Secret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showT212Secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Environment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setT212Env("live")}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      t212Env === "live"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Live Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setT212Env("demo")}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      t212Env === "demo"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Practice / Demo
                  </button>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Required API Key Permissions:
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 pt-1">
                  <span>✓ Account data: <strong className="text-emerald-700">ON</strong></span>
                  <span>✓ History: <strong className="text-emerald-700">ON</strong></span>
                  <span>✓ History - Dividends: <strong className="text-emerald-700">ON</strong></span>
                  <span>✓ History - Orders: <strong className="text-emerald-700">ON</strong></span>
                  <span>✓ History - Transactions: <strong className="text-emerald-700">ON</strong></span>
                  <span>✓ Metadata: <strong className="text-emerald-700">ON</strong></span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Orders - Execute: <span className="uppercase font-bold text-rose-700">OFF (Forbidden)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Never grant trading permissions</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestT212}
                  disabled={t212Testing || (!t212ApiKey && !connections?.trading212.configured)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${t212Testing ? "animate-spin" : ""}`} />
                  {t212Testing ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="submit"
                  disabled={t212Saving || !t212ApiKey.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {t212Saving ? "Saving..." : "Save Key"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* EODHD CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center font-bold text-xs text-amber-600">
                  EOD
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">EODHD</h2>
                  <p className="text-xs text-slate-500">Instrument metadata & upcoming dividend calendar</p>
                </div>
              </div>
              <div>{renderStatusBadge(connections?.eodhd.status || "disconnected", connections?.eodhd.has_dividend_calendar === false ? "no-cal" : null)}</div>
            </div>

            {/* Configured Banner */}
            {connections?.eodhd.configured && (
              <div className="mt-4 p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl flex items-center justify-between">
                <div className="text-xs text-emerald-900 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Token Stored: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800">{connections.eodhd.masked_token}</code>
                  </div>
                  <div className="text-emerald-700 text-[11px]">
                    Dividend Calendar:{" "}
                    {connections.eodhd.has_dividend_calendar ? (
                      <strong className="text-emerald-700">Active ✓</strong>
                    ) : connections.eodhd.has_dividend_calendar === false ? (
                      <strong className="text-amber-700">Unavailable ⚠</strong>
                    ) : (
                      <span className="text-slate-400">Untested</span>
                    )}
                    {connections.eodhd.last_checked && ` · Checked: ${new Date(connections.eodhd.last_checked).toLocaleTimeString()}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteEODHD}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 ml-2 font-medium"
                  title="Remove from keychain"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            )}

            {/* Feedback Message */}
            {eodhdFeedback && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  eodhdFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : eodhdFeedback.type === "warning"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                {eodhdFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                )}
                <span>{eodhdFeedback.message}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSaveEODHD} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    API Token {connections?.eodhd.configured && <span className="text-slate-400 font-normal">(Leave blank to keep existing)</span>}
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setGuideProvider('eodhd')}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to get this?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEodhdToken ? "text" : "password"}
                    value={eodhdToken}
                    onChange={(e) => setEodhdToken(e.target.value)}
                    placeholder={connections?.eodhd.configured ? "Enter new token to update..." : "e.g. 64c9d... or your EODHD token"}
                    className="w-full text-xs font-mono px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEodhdToken(!showEodhdToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEodhdToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* EODHD Info Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Info className="w-4 h-4 text-indigo-600" />
                  What EODHD provides:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                  <li>ISIN and symbol mapping for Trading 212 instruments.</li>
                  <li>Company names, sectors, logos, and historical dividend payments.</li>
                  <li>Future ex-dividend and declaration dates for your calendar.</li>
                </ul>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Need an API token?</span>
                  <a
                    href="https://eodhd.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                  >
                    eodhd.com <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestEODHD}
                  disabled={eodhdTesting || (!eodhdToken && !connections?.eodhd.configured)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${eodhdTesting ? "animate-spin" : ""}`} />
                  {eodhdTesting ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="submit"
                  disabled={eodhdSaving || !eodhdToken.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {eodhdSaving ? "Saving..." : "Save Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Security Architecture Guarantee Note */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              DivYield Security Architecture & Privacy Guarantee
            </h3>
            <p className="text-slate-600">
              1. <strong>Zero Browser Persistence:</strong> Your raw API keys and secrets are never stored in localStorage, sessionStorage, IndexedDB, or cookies.
            </p>
            <p className="text-slate-600">
              2. <strong>Hardware Keychain:</strong> Credentials are saved directly into your operating system’s secure keychain service (Apple Keychain, Windows Credential Manager, SecretService) or hardware-isolated Fernet encryption.
            </p>
            <p className="text-slate-600">
              3. <strong>Strict Read-Only Enforcement:</strong> No order execution or account modification code exists in the codebase. All write operations are physically forbidden by allowlists.
            </p>
          </div>
        </div>
      </div>

      <SetupGuideModal
        isOpen={guideProvider !== null}
        onClose={() => setGuideProvider(null)}
        provider={guideProvider || 'trading212'}
      />
    </div>
  );
};
