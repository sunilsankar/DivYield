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
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DividendBarChartProps {
  data: MonthlyDividend[];
}

export const DividendBarChart: React.FC<DividendBarChartProps> = ({ data }) => {
  const totalReceivedInChart = data.reduce((sum, d) => sum + (d.received || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between h-full transition-all duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Monthly Dividend Stream
            </h3>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" />
              Received: <strong>{formatCurrency(totalReceivedInChart)}</strong>
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-normal">
          Actual cash dividends credited to your Trading 212 account by month
        </p>
      </div>

      {/* Bar Chart */}
      <div className="h-64 my-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `€${v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const received = Number(payload[0]?.value || 0);
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-xl p-3 shadow-xl text-xs min-w-[170px]">
                      <p className="font-semibold text-white border-b border-slate-700 pb-1.5 mb-2">
                        {label} Dividends
                      </p>
                      <div className="flex items-center justify-between gap-3 text-emerald-400 mb-1">
                        <span className="text-slate-400">Trading 212:</span>
                        <span className="font-bold">{formatCurrency(received)}</span>
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
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Note */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
        <span>* Sourced directly from Trading 212 actual dividend transaction history</span>
        <span className="font-semibold text-slate-700">Actual Dividends</span>
      </div>
    </div>
  );
};
