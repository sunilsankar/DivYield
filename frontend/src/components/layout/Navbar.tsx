import React, { useState } from "react";
import { RefreshCw, ShieldCheck, Database, KeyRound, CheckCircle2, TrendingUp, Palette, PenTool } from "lucide-react";
import { HealthStatus, ConnectionsResponse } from "@/types";
import { useTheme } from "@/context/ThemeContext";
import { DisplayPreferencesModal } from "@/components/settings/DisplayPreferencesModal";

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
  const { styleTheme, setStyleTheme } = useTheme();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 transition-all duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm ring-2 ring-primary-light transition-transform duration-200 hover:scale-105">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 font-heading">
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
          </div>

          {/* Right Action: Clear Segmented Theme Switch, Color Modal, and Sync Button */}
          <div className="flex items-center gap-2.5">
            {/* Explicit Segmented Theme Switch: [ Modern | Sketch UI ] */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStyleTheme("modern")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  styleTheme === "modern"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Use clean modern UI"
              >
                Modern
              </button>

              <button
                type="button"
                onClick={() => setStyleTheme("sketch")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  styleTheme === "sketch"
                    ? "bg-amber-100 text-stone-900 shadow-xs border border-stone-800"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Use hand-drawn Sketch UI"
              >
                <PenTool className="w-3 h-3 text-amber-700" />
                <span>Sketch UI</span>
              </button>
            </div>

            {/* Display & Color Grading Options Button */}
            <button
              type="button"
              onClick={() => setIsPreferencesOpen(true)}
              title="Display preferences & color grading"
              className="p-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
            >
              <Palette className="w-4 h-4 text-primary" />
            </button>

            <div className="text-right hidden sm:block ml-1">
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary hover:bg-primary-hover text-white shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
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

      {/* Display Preferences Modal */}
      <DisplayPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </>
  );
};
