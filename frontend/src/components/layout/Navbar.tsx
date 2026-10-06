import React, { useState } from "react";
import { RefreshCw, ShieldCheck, Database, KeyRound, CheckCircle2, Palette, PenTool, ArrowUpCircle, Lock } from "lucide-react";
import { HealthStatus, ConnectionsResponse, UpdateCheckResult } from "@/types";
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
  updateInfo?: UpdateCheckResult | null;
  hasPassword?: boolean;
  onLock?: () => void;
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
  updateInfo,
  hasPassword,
  onLock,
  syncProgress,
}) => {
  const { styleTheme, setStyleTheme } = useTheme();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.08] px-4 md:px-8 py-2.5 transition-all duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shadow-2xs ring-1 ring-black/5 transition-transform duration-150 hover:scale-102">
              <img src="/favicon.svg" alt="DivYield Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900 font-heading">
                  DivYield
                </span>
                <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded-md font-sans">
                  {health?.version ? `v${health.version}` : "v0.1.0-beta"}
                </span>
                {updateInfo?.update_available && (
                  <a
                    href={updateInfo.release_url || "https://github.com/sunilsankar/DivYield/releases"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/20 rounded-md transition-colors animate-pulse"
                    title={`Update ${updateInfo.latest_version} available`}
                  >
                    <ArrowUpCircle className="w-3 h-3 text-amber-600" />
                    <span>Update {updateInfo.latest_version}</span>
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium -mt-0.5">
                Portfolio Overview & Dividend Tracker
              </p>
            </div>
          </div>

          {/* Center / Status Chips (macOS HIG controls) */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Health Pill */}
            <button
              onClick={onRefreshHealth}
              title="Click to check backend status"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.06] rounded-lg transition-colors duration-150 text-xs text-slate-700 hover:text-slate-900"
            >
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  health?.status === "ok"
                    ? "bg-emerald-500"
                    : healthLoading
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-[11px]">
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
              title="Configure Trading 212 connection"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.06] rounded-lg transition-colors duration-150 text-xs text-slate-700 hover:text-slate-900"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-[11px]">
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
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Trading 212: Read-Only</span>
            </div>
          </div>

          {/* Right Action: macOS Segmented Theme Switch, Color Modal, and Sync Button */}
          <div className="flex items-center gap-2">
            {/* Native macOS Segmented Control */}
            <div className="flex items-center bg-black/[0.05] p-0.5 rounded-lg border border-black/[0.04]">
              <button
                type="button"
                onClick={() => setStyleTheme("modern")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  styleTheme === "modern"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Use clean modern UI"
              >
                Modern
              </button>

              <button
                type="button"
                onClick={() => setStyleTheme("sketch")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  styleTheme === "sketch"
                    ? "bg-amber-100 text-stone-900 shadow-2xs border border-stone-800 font-semibold"
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
              className="p-1.5 rounded-lg border border-black/[0.08] bg-black/[0.03] hover:bg-black/[0.06] text-slate-700 hover:text-slate-900 transition-colors"
            >
              <Palette className="w-4 h-4 text-primary" />
            </button>

            {/* Lock Application Button */}
            {hasPassword && onLock && (
              <button
                type="button"
                onClick={onLock}
                title="Lock Application Now"
                className="p-1.5 rounded-lg border border-black/[0.08] bg-black/[0.03] hover:bg-black/[0.06] text-slate-700 hover:text-slate-900 transition-colors"
              >
                <Lock className="w-4 h-4 text-slate-700" />
              </button>
            )}

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
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary hover:bg-primary-hover text-white shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-white" : ""}`}
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
