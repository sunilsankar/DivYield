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
  HelpCircle,
} from "lucide-react";
import { SetupGuideModal } from "./SetupGuideModal";
import {
  fetchConnections,
  saveTrading212Credentials,
  testTrading212Connection,
  deleteTrading212Credentials,
} from "../../lib/api";
import { ConnectionsResponse, ConnectionTestResult } from "../../types";

interface Props {
  onConnectionChange?: () => void;
}

export const ConnectionsManager: React.FC<Props> = ({ onConnectionChange }) => {
  const [connections, setConnections] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConnections();
      setConnections(data);
      if (data.trading212.environment) {
        setT212Env(data.trading212.environment as "live" | "demo");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load connection settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Trading 212 Actions
  const handleTestT212 = async () => {
    try {
      setT212Testing(true);
      setT212Feedback(null);
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
          message: `✓ Connected to Trading 212 (${res.environment?.toUpperCase()}) — Currency: ${res.account_currency}`,
        });
      } else if (res.status === "invalid_credentials") {
        setT212Feedback({
          type: "error",
          message: `✗ Authentication failed (401 Unauthorized): ${res.message || "Invalid API key/secret combination."}`,
        });
      } else if (res.status === "access_denied") {
        setT212Feedback({
          type: "error",
          message: `✗ Access Denied (403 Forbidden): ${res.message || "API access disabled on your account or IP restricted."}`,
        });
      } else if (res.status === "rate_limited") {
        setT212Feedback({
          type: "warning",
          message: "⚠ Rate limit exceeded (429). Please wait a moment before trying again.",
        });
      } else {
        setT212Feedback({
          type: "error",
          message: `✗ Connection test failed (${res.status}): ${res.message || "Could not connect to Trading 212."}`,
        });
      }

      await loadData();
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
      setT212Feedback({ type: "error", message: "API Key cannot be empty." });
      return;
    }

    try {
      setT212Saving(true);
      setT212Feedback(null);
      await saveTrading212Credentials({
        api_key: t212ApiKey,
        api_secret: t212ApiSecret || undefined,
        environment: t212Env,
      });

      setT212Feedback({
        type: "success",
        message: "✓ Credentials saved to OS Keychain! Testing connection...",
      });
      setT212ApiKey("");
      setT212ApiSecret("");
      await loadData();
      if (onConnectionChange) onConnectionChange();

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
    if (!confirm("Are you sure you want to disconnect Trading 212? Stored keys will be removed from your OS keychain.")) {
      return;
    }

    try {
      await deleteTrading212Credentials();
      setT212Feedback({
        type: "success",
        message: "Trading 212 credentials removed from OS Keychain.",
      });
      await loadData();
      if (onConnectionChange) onConnectionChange();
    } catch (err: any) {
      setT212Feedback({
        type: "error",
        message: err.message || "Failed to disconnect Trading 212",
      });
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        );
      case "invalid_credentials":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Invalid Keys
          </span>
        );
      case "access_denied":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Access Denied
          </span>
        );
      case "rate_limited":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Rate Limited
          </span>
        );
      case "untested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Ready to Test
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
            Configure your read-only Trading 212 API key to synchronize portfolio positions, transactions, and dividends.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-sm self-start cursor-pointer"
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

      {/* TRADING 212 CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center font-bold text-xs text-blue-600">
              212
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Trading 212</h2>
              <p className="text-xs text-slate-500">Authoritative portfolio, transaction & dividend history</p>
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
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 ml-2 font-medium cursor-pointer"
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
                onClick={() => setIsGuideOpen(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
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
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
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
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${t212Testing ? "animate-spin" : ""}`} />
              {t212Testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="submit"
              disabled={t212Saving || !t212ApiKey.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t212Saving ? "Saving..." : "Save Key"}
            </button>
          </div>
        </form>
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
              Your API keys are stored exclusively in your local operating system keychain (macOS Keychain / Windows Credential Manager) via Python Keyring, with AES-256 Fernet encrypted file backup. Raw secrets are <strong>never</strong> transmitted to third parties, logged, or saved in browser storage.
            </p>
            <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-emerald-700">✓ 100% Read-Only Guard</span>
              <span className="flex items-center gap-1 text-emerald-700">✓ Zero Mutation Endpoints</span>
              <span className="flex items-center gap-1 text-emerald-700">✓ Local-First SQLite</span>
            </div>
          </div>
        </div>
      </div>

      <SetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};