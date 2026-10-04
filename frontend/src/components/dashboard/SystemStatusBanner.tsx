import React from "react";
import { Database, Server, ShieldCheck } from "lucide-react";
import { HealthStatus } from "@/types";

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
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 transition-all duration-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Backend & SQLite Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0 text-slate-700">
            <Server className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-900">
                System Status: {health?.app || "DivYield Core"}
              </h3>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                  health?.status === "ok"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {loading
                  ? "PINGING..."
                  : health?.status === "ok"
                  ? "OPERATIONAL"
                  : "DISCONNECTED"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              SQLite (WAL Mode) • Local-first API • Base Currency: EUR
            </p>
          </div>
        </div>

        {/* Center / Security Items */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">
              DB: {health?.database || "initializing"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">
              Trading 212: Read-Only
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 ml-1 transition-colors"
          >
            Check status
          </button>
        </div>
      </div>
    </div>
  );
};
