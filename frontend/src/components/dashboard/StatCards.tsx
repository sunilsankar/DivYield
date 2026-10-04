import React from "react";
import { TrendingUp, Wallet, Coins, CalendarDays, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { SketchWavyLine, SketchTape } from "../ui/SketchIcons";
import { formatCurrency } from "@/lib/utils";

interface StatCardsProps {
  portfolioValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  annualDividend: number;
  dividendYield: number;
  receivedYtd: number;
  upcoming30Days: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  portfolioValue,
  dailyChange,
  dailyChangePercent,
  annualDividend,
  dividendYield,
  receivedYtd,
  upcoming30Days,
}) => {
  const isPositive = dailyChange >= 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Portfolio Value */}
      <div className="sketch-card p-4 bg-white relative overflow-hidden">
        <SketchTape className="w-16 absolute -top-1 right-6 z-10" />
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-ink-700">
            Portfolio Value
          </span>
          <Wallet className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className="font-sketch text-3xl font-black text-ink-900 tracking-tight">
            {formatCurrency(portfolioValue)}
          </span>
        </div>
        <SketchWavyLine className="w-24 h-2 text-amber-500 mb-2" />
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`flex items-center font-bold px-1.5 py-0.5 rounded-sketch border ${
              isPositive
                ? "text-emerald-700 bg-emerald-50 border-emerald-700"
                : "text-rose-700 bg-rose-50 border-rose-700"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
            )}
            {isPositive ? "+" : ""}
            {formatCurrency(dailyChange)} ({isPositive ? "+" : ""}
            {dailyChangePercent.toFixed(2)}%)
          </span>
          <span className="text-ink-muted font-hand">return</span>
        </div>
      </div>

      {/* 2. Projected Annual Dividend */}
      <div className="sketch-card p-4 bg-white relative overflow-hidden">
        <SketchTape className="w-16 absolute -top-1 right-6 z-10" />
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-ink-700">
            Forward Dividend
          </span>
          <Coins className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className="font-sketch text-3xl font-black text-ink-900 tracking-tight">
            {formatCurrency(annualDividend)}
          </span>
          <span className="text-xs font-hand text-ink-muted">/ yr</span>
        </div>
        <SketchWavyLine className="w-24 h-2 text-emerald-500 mb-2" />
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-sketch border border-emerald-700">
            {dividendYield.toFixed(2)}% Yield
          </span>
          <span className="text-ink-700 font-hand">
            ~{formatCurrency(annualDividend / 12)}/mo
          </span>
        </div>
      </div>

      {/* 3. Received Dividends YTD */}
      <div className="sketch-card p-4 bg-white relative overflow-hidden">
        <SketchTape className="w-16 absolute -top-1 right-6 z-10" />
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-ink-700">
            Received (YTD)
          </span>
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className="font-sketch text-3xl font-black text-ink-900 tracking-tight">
            {formatCurrency(receivedYtd)}
          </span>
        </div>
        <SketchWavyLine className="w-24 h-2 text-blue-500 mb-2" />
        <div className="flex items-center gap-1.5 text-xs font-mono text-ink-700">
          <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-sketch border border-blue-700">
            24 Payouts
          </span>
          <span className="text-ink-muted font-hand">banked</span>
        </div>
      </div>

      {/* 4. Upcoming Next 30 Days */}
      <div className="sketch-card p-4 bg-white relative overflow-hidden">
        <SketchTape className="w-16 absolute -top-1 right-6 z-10" />
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-ink-700">
            Next 30 Days
          </span>
          <CalendarDays className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className="font-sketch text-3xl font-black text-ink-900 tracking-tight">
            {formatCurrency(upcoming30Days)}
          </span>
        </div>
        <SketchWavyLine className="w-24 h-2 text-purple-500 mb-2" />
        <div className="flex items-center gap-1.5 text-xs font-mono text-ink-700">
          <span className="font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded-sketch border border-purple-700">
            3 Scheduled
          </span>
          <span className="text-ink-muted font-hand">ex-dates passed</span>
        </div>
      </div>
    </div>
  );
};
