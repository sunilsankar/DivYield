import React from "react";
import { RefreshCw, ShieldCheck, Database, KeyRound, CheckCircle2 } from "lucide-react";
import { HealthStatus, ConnectionsResponse } from "@/types";
import { SketchSparkle } from "../ui/SketchIcons";

interface NavbarProps {
  health: HealthStatus | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
  onSync: () => void;
  isSyncing: boolean;
  lastSyncedText: string;
  connections?: ConnectionsResponse | null;
  onOpenConnections?: () => void;
  syncProgress?: {
    currentStep: number;
    totalSteps: number;
    stepMessage: string;
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  healthLoading,
  onRefreshHealth,
  onSync,
  isSyncing,
  lastSyncedText,
  connections,
  onOpenConnections,
  syncProgress,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#faf7f2]/95 backdrop-blur-md border-b-2 border-ink-900 px-4 md:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-amber-400 border-2 border-ink-900 rounded-sketch flex items-center justify-center font-sketch text-2xl font-bold shadow-sketch-sm">
              %
            </div>
            <SketchSparkle className="w-4 h-4 absolute -top-1 -right-1 text-amber-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sketch text-2xl font-black tracking-tight text-ink-900">
                DivYield
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-emerald-100 border border-emerald-800 text-emerald-900 rounded-sketch font-bold">
                v1.0
              </span>
            </div>
            <p className="text-xs text-ink-700 font-hand -mt-1 hidden sm:block">
              sketch dashboard & dividend ledger
            </p>
          </div>
        </div>

        {/* Center / Status Chips */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Health Pill */}
          <button
            onClick={onRefreshHealth}
            title="Click to check backend status"
            className="flex items-center gap-2 px-3 py-1 bg-white border-2 border-ink-900 rounded-sketch shadow-sketch-sm hover:bg-amber-50 transition-colors text-xs font-mono"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.status === "ok"
                  ? "bg-emerald-500 animate-ping"
                  : healthLoading
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            <Database className="w-3.5 h-3.5 text-ink-700" />
            <span className="font-medium text-ink-900">
              {healthLoading
                ? "Checking API..."
                : health?.status === "ok"
                ? `FastAPI + SQLite (${health.latencyMs ?? 12}ms)`
                : "API Offline"}
            </span>
          </button>

          {/* Connection Pill */}
          <button
            onClick={onOpenConnections}
            title="Configure Trading 212 & EODHD connections"
            className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-ink-900 rounded-sketch shadow-sketch-sm hover:bg-amber-50 transition-colors text-xs font-mono"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-ink-900 font-medium">
              {connections?.trading212.status === "connected" ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> T212: Connected
                </span>
              ) : connections?.trading212.configured ? (
                <span className="text-amber-800">T212: Configured</span>
              ) : (
                <span className="text-ink-muted">T212: Connect</span>
              )}
            </span>
          </button>

          {/* Read-Only Security Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border-2 border-ink-900 rounded-sketch shadow-sketch-sm text-xs font-mono text-blue-900">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span className="font-bold">Trading 212: Read-Only</span>
          </div>

          {/* Tax Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border-2 border-ink-900 rounded-sketch shadow-sketch-sm text-xs font-mono text-amber-900">
            <span>NL (Box 3)</span>
          </div>
        </div>

        {/* Right Action: Sync Button */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-mono text-ink-muted block leading-none">
              LAST SYNC
            </span>
            <span className="text-xs font-hand text-ink-800 font-semibold">
              {lastSyncedText}
            </span>
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`sketch-btn flex items-center gap-2 px-4 py-2 font-sketch text-sm font-bold bg-amber-400 text-ink-900 hover:bg-amber-300 disabled:opacity-80 disabled:cursor-not-allowed`}
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? "animate-spin text-ink-900" : ""}`}
            />
            <span>
              {isSyncing
                ? syncProgress && syncProgress.totalSteps > 0
                  ? `Syncing (${Math.round((syncProgress.currentStep / syncProgress.totalSteps) * 100)}%)`
                  : "Syncing..."
                : "Sync Now"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
