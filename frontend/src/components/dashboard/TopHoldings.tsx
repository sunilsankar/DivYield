import React from "react";
import { ArrowUpRight, ArrowDownRight, Layers, ArrowRight } from "lucide-react";
import { Holding } from "@/types";
import { SketchWavyLine } from "../ui/SketchIcons";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface TopHoldingsProps {
  holdings: Holding[];
  onViewAllHoldings: () => void;
}

export const TopHoldings: React.FC<TopHoldingsProps> = ({
  holdings,
  onViewAllHoldings,
}) => {
  return (
    <div className="sketch-card p-5 bg-white flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sketch text-xl font-bold text-ink-900">
              Holdings & Dividend Yield
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs font-mono px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-800 rounded-sketch font-bold">
            Trading 212 Synchronized
          </span>
        </div>
        <p className="text-xs font-hand text-ink-muted -mt-0.5">
          active positions, yield on cost, and projected dividend flow
        </p>
        <SketchWavyLine className="w-36 h-2 text-ink-900/30 my-2" />

        {/* Table in Sketch aesthetic */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-ink-900 text-[11px] font-mono uppercase text-ink-700">
                <th className="py-2 px-2">Asset</th>
                <th className="py-2 px-2 text-right">Shares</th>
                <th className="py-2 px-2 text-right">Market Val</th>
                <th className="py-2 px-2 text-right">Gain / Loss</th>
                <th className="py-2 px-2 text-right">Yield</th>
                <th className="py-2 px-2 text-right">Annual Div</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-ink-900/20 text-xs font-mono">
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-muted font-hand text-sm">
                    No holdings in portfolio yet. Click "Sync Now" to import from Trading 212.
                  </td>
                </tr>
              ) : (
                holdings.slice(0, 8).map((h) => {
                  const isPositive = h.unrealizedGain >= 0;
                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-amber-50/50 transition-colors group"
                    >
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink-900 bg-paper-200 px-1.5 py-0.5 rounded border border-ink-900/40 text-[11px]">
                            {h.ticker}
                          </span>
                          <span className="font-hand font-bold text-ink-800 hidden sm:inline truncate max-w-[120px]">
                            {h.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right text-ink-800">
                        {h.shares.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-ink-900">
                        {formatCurrency(h.marketValue)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-bold ${
                            isPositive
                              ? "text-emerald-800 bg-emerald-50 border border-emerald-300"
                              : "text-rose-800 bg-rose-50 border border-rose-300"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {formatPercent(h.unrealizedGainPercent)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-emerald-800 font-bold">
                        {h.dividendYield.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-2 text-right font-sketch font-bold text-ink-900 text-sm">
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
        className="mt-4 flex items-center justify-center gap-2 py-2 w-full text-xs font-hand font-bold text-ink-800 hover:text-ink-900 hover:bg-paper-100 rounded-sketch border border-dashed border-ink-900/30 transition-all"
      >
        <span>
          {holdings.length > 0 ? `View All ${holdings.length} Holdings & Rebalance Analysis` : "View All Holdings"}
        </span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
