import React from "react";
import { TrendingUp, Wallet, Coins, CalendarDays, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
      {/* 1. Portfolio Value */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Portfolio Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(portfolioValue)}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center font-semibold px-2 py-0.5 rounded-full ${
              isPositive
                ? "text-emerald-700 bg-emerald-50"
                : "text-rose-700 bg-rose-50"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            )}
            {isPositive ? "+" : ""}
            {formatCurrency(dailyChange)} ({isPositive ? "+" : ""}
            {dailyChangePercent.toFixed(2)}%)
          </span>
          <span className="text-slate-400 font-normal">total return</span>
        </div>
      </div>

      {/* 2. Projected Annual Dividend */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Forward Dividend
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(annualDividend)}
            </span>
            <span className="text-xs font-medium text-slate-400">/ yr</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {dividendYield.toFixed(2)}% Yield
          </span>
          <span className="text-slate-500 font-medium">
            ~{formatCurrency(annualDividend / 12)}/mo
          </span>
        </div>
      </div>

      {/* 3. Received Dividends YTD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Received (YTD)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(receivedYtd)}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
            Actual Payouts
          </span>
          <span className="text-slate-400 font-normal">credited</span>
        </div>
      </div>

      {/* 4. Upcoming Next 30 Days */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Next 30 Days
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(upcoming30Days)}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
            Scheduled
          </span>
          <span className="text-slate-400 font-normal">forward events</span>
        </div>
      </div>
    </div>
  );
};
