import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { SectorAllocation } from "@/types";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AllocationChartProps {
  data: SectorAllocation[];
  totalValue: number;
}

export const AllocationChart: React.FC<AllocationChartProps> = ({ data, totalValue }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeSector = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between h-full transition-all duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Portfolio Allocation
            </h3>
            <PieChartIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full">
            By Sector
          </span>
        </div>
        <p className="text-xs text-slate-500 font-normal">
          {data.length > 0 ? `Diversification breakdown across ${data.length} sectors` : "No sector breakdown available"}
        </p>
      </div>

      {/* Donut Chart with central info */}
      {data.length === 0 ? (
        <div className="h-60 my-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 bg-slate-50/50 text-center">
          <p className="font-semibold text-slate-800 text-sm">No Sector Allocations Yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Run Combined Sync to enrich your portfolio with sector data
          </p>
        </div>
      ) : (
        <div className="relative h-60 my-2 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as SectorAllocation;
                    return (
                      <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-lg text-xs">
                        <p className="font-semibold text-white">{item.sector}</p>
                        <p className="text-emerald-400 font-bold mt-0.5">{formatCurrency(item.value)}</p>
                        <p className="text-slate-400 text-[11px]">{item.percentage.toFixed(1)}% of total</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={96}
                paddingAngle={3}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-opacity duration-200 cursor-pointer"
                    style={{
                      opacity: activeIndex === null || activeIndex === index ? 1 : 0.6,
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeSector ? activeSector.sector : "Holdings Value"}
            </span>
            <span className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {activeSector ? `${activeSector.percentage.toFixed(1)}%` : formatCurrency(totalValue)}
            </span>
            {activeSector && (
              <span className="text-xs text-emerald-600 font-semibold">
                {formatCurrency(activeSector.value)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 max-h-36 overflow-y-auto">
          {data.slice(0, 8).map((item, idx) => (
            <div
              key={item.sector}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-150 ${
                activeIndex === idx
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium truncate">
                  {item.sector}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 ml-1">
                {item.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
