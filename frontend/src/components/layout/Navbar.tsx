import React from "react";
import { RefreshCw, ShieldCheck, Database, KeyRound, CheckCircle2, TrendingUp } from "lucide-react";
import { HealthStatus, ConnectionsResponse } from "@/types";

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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-100 ring-2 ring-indigo-50 transition-transform duration-200 hover:scale-105">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                DivYield
              </span>
              <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-sans">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block font-medium">
              Portfolio Overview & Dividend Tracker
            </p>
          </div>
        </div>

        {/* Center / Status Chips */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Health Pill */}
          <button
            onClick={onRefreshHealth}
            title="Click to check backend status"
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all duration-200 text-xs text-slate-700 hover:text-slate-900"
          >
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                health?.status === "ok"
                  ? "bg-emerald-500 shadow-xs shadow-emerald-200"
                  : healthLoading
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all duration-200 text-xs text-slate-700 hover:text-slate-900"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">
              {connections?.trading212.status === "connected" ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> T212: Connected
                </span>
              ) : connections?.trading212.configured ? (
                <span className="text-amber-600">T212: Configured</span>
              ) : (
                <span className="text-slate-500">T212: Connect</span>
              )}
            </span>
          </button>

          {/* Read-Only Security Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Trading 212: Read-Only</span>
          </div>

          {/* Tax Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
            <span>NL (Box 3)</span>
          </div>
        </div>

        {/* Right Action: Sync Button */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block leading-none">
              LAST SYNC
            </span>
            <span className="text-xs text-slate-700 font-semibold">
              {lastSyncedText}
            </span>
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? "animate-spin text-white" : ""}`}
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
