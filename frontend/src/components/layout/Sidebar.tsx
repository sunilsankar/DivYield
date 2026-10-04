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
import { SketchPin } from "../ui/SketchIcons";

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
      badge: "8",
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
      badge: "€1.8k",
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
      {/* Navigation Card */}
      <div className="sketch-card p-4 bg-white">
        <div className="flex items-center justify-between pb-3 mb-2 border-b-2 border-ink-900 border-dashed">
          <span className="font-sketch text-lg font-bold text-ink-900">Navigation</span>
          <SketchPin className="w-5 h-5 text-amber-500" />
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-sketch text-sm font-hand font-bold transition-all text-left ${
                  isActive
                    ? "bg-amber-100 text-ink-900 border-2 border-ink-900 shadow-sketch-sm translate-x-1"
                    : "text-ink-700 hover:bg-paper-100 hover:text-ink-900 border-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? "text-amber-700" : "text-ink-muted"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-sketch border ${
                      isActive
                        ? "bg-amber-300 border-ink-900 text-ink-900 font-bold"
                        : "bg-paper-200 border-ink-900/30 text-ink-700"
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

      {/* Security Mandate Note */}
      <div className="sketch-card p-4 bg-emerald-50/70 border-emerald-950">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-sketch font-bold text-sm text-emerald-950">
              Read-Only Security
            </h4>
            <p className="text-xs font-hand text-emerald-900 mt-1 leading-snug">
              Trading 212 execution is hard-blocked. No buy/sell orders can ever be placed or modified.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-800">
              <Lock className="w-3 h-3 text-emerald-700" />
              <span>Orders - Execute: OFF</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
