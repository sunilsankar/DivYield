import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { MonthlyDividend } from "@/types";
import { SketchSparkle, SketchWavyLine } from "../ui/SketchIcons";
import { formatCurrency } from "@/lib/utils";

interface DividendBarChartProps {
  data: MonthlyDividend[];
}

export const DividendBarChart: React.FC<DividendBarChartProps> = ({ data }) => {
  return (
    <div className="sketch-card p-5 bg-white flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sketch text-xl font-bold text-ink-900">
              Monthly Dividend Stream
            </span>
            <SketchSparkle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-800">
              <span className="w-2.5 h-2.5 bg-emerald-500 border border-ink-900 rounded-sm inline-block" />
              Received
            </span>
            <span className="flex items-center gap-1 text-amber-800">
              <span className="w-2.5 h-2.5 bg-amber-300 border border-ink-900 rounded-sm inline-block" />
              Expected
            </span>
          </div>
        </div>
        <p className="text-xs font-hand text-ink-muted -mt-0.5">
          actual cash received vs forecasted future dividend payouts
        </p>
        <SketchWavyLine className="w-36 h-2 text-ink-900/30 my-2" />
      </div>

      {/* Bar Chart */}
      <div className="h-64 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e4e4e7"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="#71717a"
              fontSize={11}
              fontFamily="'Patrick Hand', cursive, sans-serif"
              tickLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              tickFormatter={(v) => `€${v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const received = Number(payload[0]?.value || 0);
                  const expected = Number(payload[1]?.value || 0);
                  return (
                    <div className="bg-white border-2 border-ink-900 rounded-sketch p-2.5 shadow-sketch text-xs font-mono">
                      <p className="font-bold text-ink-900 border-b border-ink-900/20 pb-1 mb-1 font-sketch text-sm">
                        {label} Payouts
                      </p>
                      <div className="flex items-center justify-between gap-3 text-emerald-700">
                        <span>Received (T212):</span>
                        <span className="font-bold">{formatCurrency(received)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-amber-700">
                        <span>Expected (EODHD):</span>
                        <span className="font-bold">{formatCurrency(expected)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-dashed border-ink-900/20 font-bold text-ink-900">
                        <span>Total Month:</span>
                        <span>{formatCurrency(received + expected)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="received"
              name="Received"
              fill="#10b981"
              stroke="#18181b"
              strokeWidth={1.5}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expected"
              name="Expected"
              fill="#fcd34d"
              stroke="#18181b"
              strokeWidth={1.5}
              strokeDasharray="2 1"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Note */}
      <div className="flex items-center justify-between text-[11px] font-hand text-ink-700 pt-2 border-t-2 border-dashed border-ink-900/20">
        <span>* Expected dividends derived from EODHD declaration events</span>
        <span className="font-mono text-ink-900 font-bold">2026 Forecast</span>
      </div>
    </div>
  );
};
