import React from "react";
import { Database, Server, Lock } from "lucide-react";
import { HealthStatus } from "@/types";
import { SketchPin } from "../ui/SketchIcons";

interface SystemStatusBannerProps {
  health: HealthStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export const SystemStatusBanner: React.FC<SystemStatusBannerProps> = ({
  health,
  loading,
  onRefresh,
}) => {
  return (
    <div className="sketch-card p-4 bg-amber-50/70 border-ink-900 relative">
      <SketchPin className="w-5 h-5 absolute -top-2 left-6 text-amber-600" />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Backend & SQLite Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sketch bg-white border-2 border-ink-900 flex items-center justify-center shadow-sketch-sm flex-shrink-0">
            <Server className="w-5 h-5 text-ink-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sketch font-bold text-base text-ink-900">
                System Status: {health?.app || "DivYield Core"}
              </h3>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-sketch border ${
                  health?.status === "ok"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-800"
                    : "bg-rose-100 text-rose-900 border-rose-800"
                }`}
              >
                {loading
                  ? "PINGING..."
                  : health?.status === "ok"
                  ? "OPERATIONAL"
                  : "DISCONNECTED"}
              </span>
            </div>
            <p className="text-xs font-hand text-ink-700">
              SQLite (WAL Mode) • Shared API for Web + Future Mobile • Base Currency: EUR
            </p>
          </div>
        </div>

        {/* Center / Security Items */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-ink-900 rounded-sketch">
            <Database className="w-3.5 h-3.5 text-ink-700" />
            <span className="text-ink-800 font-semibold">
              DB: {health?.database || "initializing"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-ink-900 rounded-sketch">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-emerald-900 font-bold">
              Trading 212: Read-Only
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="text-[11px] font-hand font-bold text-ink-700 underline hover:text-ink-900 ml-1"
          >
            ping again
          </button>
        </div>
      </div>
    </div>
  );
};
