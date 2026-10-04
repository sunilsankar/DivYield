import React from "react";
import { ArrowUpRight, ArrowDownRight, Layers, ArrowRight } from "lucide-react";
import { Holding } from "@/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { StockLogo } from "../ui/StockLogo";

interface TopHoldingsProps {
  holdings: Holding[];
  onViewAllHoldings: () => void;
}

export const TopHoldings: React.FC<TopHoldingsProps> = ({
  holdings,
  onViewAllHoldings,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between h-full transition-all duration-200">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Top Holdings & Yield
            </h3>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs font-medium px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60">
            Trading 212 Live
          </span>
        </div>
        <p className="text-xs text-slate-500 font-normal">
          Active positions, market value, unrealized returns, and forward dividend cashflow
        </p>

        {/* Clean, smooth table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3 text-right">Shares</th>
                <th className="py-2.5 px-3 text-right">Market Val</th>
                <th className="py-2.5 px-3 text-right">Gain / Loss</th>
                <th className="py-2.5 px-3 text-right">Yield</th>
                <th className="py-2.5 px-3 text-right">Annual Div</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No holdings in portfolio yet. Click "Sync Now" to import from Trading 212.
                  </td>
                </tr>
              ) : (
                holdings.slice(0, 8).map((h) => {
                  const isPositive = h.unrealizedGain >= 0;
                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/80 transition-colors duration-150 group"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <StockLogo ticker={h.ticker} name={h.name} size="sm" />
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {h.ticker}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
                              {h.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 font-medium">
                        {h.shares.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">
                        {formatCurrency(h.marketValue)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isPositive
                              ? "text-emerald-700 bg-emerald-50"
                              : "text-rose-700 bg-rose-50"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {formatPercent(h.unrealizedGainPercent)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                        {h.dividendYield.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(h.annualDividend)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={onViewAllHoldings}
        className="mt-4 flex items-center justify-center gap-2 py-2.5 w-full text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-all duration-200"
      >
        <span>
          {holdings.length > 0
            ? `View All ${holdings.length} Holdings & Breakdown`
            : "View All Holdings"}
        </span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
