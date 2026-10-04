import React from "react";
import {
  LayoutDashboard,
  PieChart,
  Coins,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  KeyRound,
  Settings,
  ShieldCheck,
  Lock,
  ArrowLeftRight,
  Link2,
  Edit3,
} from "lucide-react";

export type NavTab =
  | "dashboard"
  | "holdings"
  | "transactions"
  | "dividends"
  | "calendar"
  | "analytics"
  | "tax"
  | "data-tools"
  | "mappings"
  | "connections"
  | "settings";

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "holdings",
      label: "Holdings & Portfolio",
      icon: <PieChart className="w-4 h-4" />,
    },
    {
      id: "transactions",
      label: "Orders & Activity",
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    {
      id: "dividends",
      label: "Dividends & Payouts",
      icon: <Coins className="w-4 h-4" />,
    },
    {
      id: "calendar",
      label: "Dividend Calendar",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: "analytics",
      label: "Yield & Analytics",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: "tax",
      label: "Tax Estimator (NL)",
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: "data-tools",
      label: "Data Tools & CSV",
      icon: <Edit3 className="w-4 h-4" />,
    },
    {
      id: "mappings",
      label: "Instrument Mappings",
      icon: <Link2 className="w-4 h-4" />,
    },
    {
      id: "connections",
      label: "API Connections",
      icon: <KeyRound className="w-4 h-4" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
      {/* Navigation Source List (macOS HIG flush sidebar) */}
      <div className="theme-card bg-white/60 md:bg-transparent rounded-2xl md:rounded-none border border-slate-200/60 md:border-0 shadow-sm md:shadow-none p-2 md:p-0 transition-all duration-200">
        <div className="px-3 pt-1 pb-2 mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 text-left ${
                  isActive
                    ? "bg-slate-200/80 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`transition-colors duration-150 ${isActive ? "text-primary" : "text-slate-400"}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white text-slate-800 shadow-2xs font-semibold"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Security Mandate Card */}
      <div className="theme-card bg-emerald-50/50 rounded-xl border border-emerald-200/60 p-3.5 transition-all duration-200">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-emerald-950">
              Read-Only Security
            </h4>
            <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed">
              Trading 212 execution is hard-blocked. No buy/sell orders can ever be placed or modified.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Orders - Execute: OFF</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
