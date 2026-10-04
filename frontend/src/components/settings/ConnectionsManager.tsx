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
} from "lucide-react";
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

  // Trading 212 Form State
  const [t212ApiKey, setT212ApiKey] = useState("");
  const [t212ApiSecret, setT212ApiSecret] = useState("");
  const [t212Env, setT212Env] = useState<"live" | "demo">("live");
  const [showT212Key, setShowT212Key] = useState(false);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-hand font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected {warning && "(Partial)"}
          </span>
        );
      case "invalid_credentials":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-hand font-bold bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
            <XCircle className="w-3.5 h-3.5" />
            Invalid Credentials
          </span>
        );
      case "access_denied":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-hand font-bold bg-[#FFF3E0] text-[#E65100] border border-[#FFE082]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Access Denied
          </span>
        );
      case "rate_limited":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-hand font-bold bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Rate Limited
          </span>
        );
      case "untested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-hand font-bold bg-[#F5F5F5] text-[#616161] border border-[#E0E0E0]">
            <Info className="w-3.5 h-3.5" />
            Configured (Untested)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-hand font-bold bg-[#FAFAFA] text-[#757575] border border-[#E0E0E0]">
            <XCircle className="w-3.5 h-3.5" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section with sketch annotation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-dashed border-[#D7CCC8]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-hand font-bold tracking-tight text-[#2D2A26]">
              Secure Connections & Credentials
            </h1>
            <span className="sketch-badge sketch-badge-blue text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" /> OS Keychain Enforced
            </span>
          </div>
          <p className="text-sm font-hand text-[#8D6E63] mt-1">
            Configure your read-only Trading 212 portfolio sync and EODHD dividend enrichment.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="sketch-button flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="sketch-card bg-[#FFEBEE] border-[#FFCDD2] p-4 text-[#C62828] font-hand flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* TRADING 212 CARD */}
        <div className="sketch-card relative p-6 bg-[#FCFBF7] flex flex-col justify-between">
          <div className="tape-accent" />
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#E0D8D0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E3F2FD] border-2 border-[#1976D2] flex items-center justify-center font-hand font-bold text-[#1976D2]">
                  212
                </div>
                <div>
                  <h2 className="text-xl font-hand font-bold text-[#2D2A26]">Trading 212</h2>
                  <p className="text-xs font-hand text-[#8D6E63]">Authoritative portfolio & dividend history</p>
                </div>
              </div>
              <div>{renderStatusBadge(connections?.trading212.status || "disconnected")}</div>
            </div>

            {/* Configured Banner */}
            {connections?.trading212.configured && (
              <div className="mt-4 p-3 bg-[#F1F8E9] border border-[#C8E6C9] rounded-lg flex items-center justify-between">
                <div className="text-xs font-hand text-[#33691E] space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                    Key Stored: <code className="font-mono bg-white/70 px-1 py-0.5 rounded">{connections.trading212.masked_key}</code>
                  </div>
                  <div>
                    Environment: <strong className="uppercase">{connections.trading212.environment}</strong>
                    {connections.trading212.last_checked && ` · Checked: ${new Date(connections.trading212.last_checked).toLocaleTimeString()}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteT212}
                  className="text-xs font-hand text-[#C62828] hover:underline flex items-center gap-1 ml-2"
                  title="Remove from keychain"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            )}

            {/* Feedback Message */}
            {t212Feedback && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-hand flex items-center gap-2 border ${
                  t212Feedback.type === "success"
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]"
                    : t212Feedback.type === "warning"
                    ? "bg-[#FFF8E1] text-[#E65100] border-[#FFE082]"
                    : "bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]"
                }`}
              >
                {t212Feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{t212Feedback.message}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSaveT212} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-hand font-bold text-[#4E342E] mb-1">
                  API Key {connections?.trading212.configured && <span className="text-[#8D6E63] font-normal">(Leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showT212Key ? "text" : "password"}
                    value={t212ApiKey}
                    onChange={(e) => setT212ApiKey(e.target.value)}
                    placeholder={connections?.trading212.configured ? "Enter new key to update..." : "Paste your Trading 212 API key"}
                    className="w-full text-sm font-mono px-3 py-2 border-2 border-[#D7CCC8] rounded-md focus:outline-none focus:border-[#2D2A26] bg-[#FFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowT212Key(!showT212Key)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#2D2A26]"
                  >
                    {showT212Key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-hand font-bold text-[#4E342E] mb-1">
                  API Secret <span className="text-[#8D6E63] font-normal">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={t212ApiSecret}
                  onChange={(e) => setT212ApiSecret(e.target.value)}
                  placeholder="Optional secret if configured"
                  className="w-full text-sm font-mono px-3 py-2 border-2 border-[#D7CCC8] rounded-md focus:outline-none focus:border-[#2D2A26] bg-[#FFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-hand font-bold text-[#4E342E] mb-1">
                  Environment
                </label>
                <select
                  value={t212Env}
                  onChange={(e) => setT212Env(e.target.value as "live" | "demo")}
                  className="w-full text-sm font-hand px-3 py-2 border-2 border-[#D7CCC8] rounded-md focus:outline-none focus:border-[#2D2A26] bg-[#FFF]"
                >
                  <option value="live">Live Account (https://live.trading212.com)</option>
                  <option value="demo">Practice / Demo Account (https://demo.trading212.com)</option>
                </select>
              </div>

              {/* Expected Permissions Checklist (Strict Read-Only) */}
              <div className="mt-4 p-3 bg-[#F9F7F3] border-2 border-dashed border-[#E0D8D0] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-hand font-bold text-[#4E342E]">Required Permissions Setup</span>
                  <span className="text-[10px] font-hand text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9] font-bold">
                    STRICT READ-ONLY
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-hand">
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Account data: <span className="font-bold">ON</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> History: <span className="font-bold">ON</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Dividends: <span className="font-bold">ON</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Orders: <span className="font-bold">ON</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Transactions: <span className="font-bold">ON</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Metadata: <span className="font-bold">ON</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-dashed border-[#D7CCC8] flex items-center justify-between">
                  <span className="text-xs font-hand font-bold text-[#C62828] flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Orders - Execute: <span className="uppercase font-black text-red-700">OFF (Forbidden)</span>
                  </span>
                  <span className="text-[10px] font-hand text-[#8D6E63]">Never grant trading permissions</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestT212}
                  disabled={t212Testing || (!t212ApiKey && !connections?.trading212.configured)}
                  className="sketch-button flex-1 flex items-center justify-center gap-2 text-sm bg-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${t212Testing ? "animate-spin" : ""}`} />
                  {t212Testing ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="submit"
                  disabled={t212Saving || !t212ApiKey.trim()}
                  className="sketch-button sketch-button-primary flex-1 flex items-center justify-center gap-2 text-sm"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {t212Saving ? "Saving..." : "Save Key"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* EODHD CARD */}
        <div className="sketch-card relative p-6 bg-[#FCFBF7] flex flex-col justify-between">
          <div className="tape-accent" />
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#E0D8D0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] border-2 border-[#E65100] flex items-center justify-center font-hand font-bold text-[#E65100]">
                  EOD
                </div>
                <div>
                  <h2 className="text-xl font-hand font-bold text-[#2D2A26]">EODHD</h2>
                  <p className="text-xs font-hand text-[#8D6E63]">Instrument metadata & upcoming dividend calendar</p>
                </div>
              </div>
              <div>{renderStatusBadge(connections?.eodhd.status || "disconnected", connections?.eodhd.has_dividend_calendar === false ? "no-cal" : null)}</div>
            </div>

            {/* Configured Banner */}
            {connections?.eodhd.configured && (
              <div className="mt-4 p-3 bg-[#F1F8E9] border border-[#C8E6C9] rounded-lg flex items-center justify-between">
                <div className="text-xs font-hand text-[#33691E] space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                    Token Stored: <code className="font-mono bg-white/70 px-1 py-0.5 rounded">{connections.eodhd.masked_token}</code>
                  </div>
                  <div>
                    Dividend Calendar:{" "}
                    {connections.eodhd.has_dividend_calendar ? (
                      <strong className="text-[#2E7D32]">Active ✓</strong>
                    ) : connections.eodhd.has_dividend_calendar === false ? (
                      <strong className="text-[#E65100]">Unavailable ⚠</strong>
                    ) : (
                      <span className="text-[#757575]">Untested</span>
                    )}
                    {connections.eodhd.last_checked && ` · Checked: ${new Date(connections.eodhd.last_checked).toLocaleTimeString()}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteEODHD}
                  className="text-xs font-hand text-[#C62828] hover:underline flex items-center gap-1 ml-2"
                  title="Remove from keychain"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            )}

            {/* Feedback Message */}
            {eodhdFeedback && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-hand flex items-center gap-2 border ${
                  eodhdFeedback.type === "success"
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]"
                    : eodhdFeedback.type === "warning"
                    ? "bg-[#FFF8E1] text-[#E65100] border-[#FFE082]"
                    : "bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]"
                }`}
              >
                {eodhdFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{eodhdFeedback.message}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSaveEODHD} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-hand font-bold text-[#4E342E] mb-1">
                  API Token {connections?.eodhd.configured && <span className="text-[#8D6E63] font-normal">(Leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showEodhdToken ? "text" : "password"}
                    value={eodhdToken}
                    onChange={(e) => setEodhdToken(e.target.value)}
                    placeholder={connections?.eodhd.configured ? "Enter new token to update..." : "e.g. 64c9d... or your EODHD token"}
                    className="w-full text-sm font-mono px-3 py-2 border-2 border-[#D7CCC8] rounded-md focus:outline-none focus:border-[#2D2A26] bg-[#FFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEodhdToken(!showEodhdToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#2D2A26]"
                  >
                    {showEodhdToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* EODHD Info Card */}
              <div className="p-3 bg-[#F9F7F3] border-2 border-dashed border-[#E0D8D0] rounded-lg text-xs font-hand space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#4E342E]">
                  <Info className="w-4 h-4 text-[#1976D2]" />
                  What EODHD provides:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[#5D4037]">
                  <li>ISIN and symbol mapping for Trading 212 instruments.</li>
                  <li>Company names, sectors, logos, and historical dividend payments.</li>
                  <li>Future ex-dividend and declaration dates for your calendar.</li>
                </ul>
                <div className="pt-2 border-t border-dashed border-[#D7CCC8] flex items-center justify-between text-[#8D6E63]">
                  <span>Need an API token?</span>
                  <a
                    href="https://eodhd.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#1976D2] hover:underline font-bold"
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
                  className="sketch-button flex-1 flex items-center justify-center gap-2 text-sm bg-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${eodhdTesting ? "animate-spin" : ""}`} />
                  {eodhdTesting ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="submit"
                  disabled={eodhdSaving || !eodhdToken.trim()}
                  className="sketch-button sketch-button-primary flex-1 flex items-center justify-center gap-2 text-sm"
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
      <div className="sketch-card bg-[#FBF9F5] p-5 border-[#D7CCC8]">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1 text-xs font-hand">
            <h3 className="text-base font-hand font-bold text-[#2D2A26]">
              DivYield Security Architecture & Privacy Guarantee
            </h3>
            <p className="text-[#5D4037]">
              1. <strong>Zero Browser Persistence:</strong> Your raw API keys and secrets are never stored in localStorage, sessionStorage, IndexedDB, or cookies.
            </p>
            <p className="text-[#5D4037]">
              2. <strong>Hardware Keychain:</strong> Credentials are saved directly into your operating system’s secure keychain service (Apple Keychain, Windows Credential Manager, SecretService) or hardware-isolated Fernet encryption.
            </p>
            <p className="text-[#5D4037]">
              3. <strong>Strict Read-Only Enforcement:</strong> No order execution or account modification code exists in the codebase. All write operations are physically forbidden by allowlists.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
