import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { SectorAllocation } from "@/types";
import { SketchSparkle, SketchWavyLine } from "../ui/SketchIcons";
import { formatCurrency } from "@/lib/utils";

interface AllocationChartProps {
  data: SectorAllocation[];
  totalValue: number;
}

export const AllocationChart: React.FC<AllocationChartProps> = ({ data, totalValue }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeSector = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="sketch-card p-5 bg-white flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sketch text-xl font-bold text-ink-900">
              Portfolio Allocation
            </span>
            <SketchSparkle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xs font-mono px-2 py-0.5 bg-paper-200 border border-ink-900 rounded-sketch text-ink-800">
            By Sector
          </span>
        </div>
        <p className="text-xs font-hand text-ink-muted -mt-0.5">
          {data.length > 0 ? `diversification breakdown across ${data.length} sectors` : "no sector breakdown yet"}
        </p>
        <SketchWavyLine className="w-32 h-2 text-ink-900/30 my-2" />
      </div>

      {/* Donut Chart with central illustration */}
      {data.length === 0 ? (
        <div className="h-60 my-2 flex flex-col items-center justify-center border-2 border-dashed border-ink-900/20 rounded-sketch p-4 text-center">
          <p className="font-sketch font-bold text-ink-900 text-sm">No Sector Allocations Yet</p>
          <p className="text-xs font-hand text-ink-muted mt-1">
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
                      <div className="bg-white border-2 border-ink-900 rounded-sketch p-2.5 shadow-sketch text-xs font-mono">
                        <p className="font-bold text-ink-900">{item.sector}</p>
                        <p className="text-emerald-700 font-bold">{formatCurrency(item.value)}</p>
                        <p className="text-ink-muted">{item.percentage.toFixed(1)}% of total</p>
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
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                stroke="#18181b"
                strokeWidth={2}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-transform duration-200 cursor-pointer"
                    style={{
                      filter: activeIndex === index ? "brightness(1.08)" : "none",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
              {activeSector ? activeSector.sector : "Total Holdings"}
            </span>
            <span className="font-sketch text-lg font-black text-ink-900">
              {activeSector ? `${activeSector.percentage.toFixed(1)}%` : formatCurrency(totalValue)}
            </span>
            {activeSector && (
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                {formatCurrency(activeSector.value)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Illustrated Legend */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-dashed border-ink-900/20 max-h-36 overflow-y-auto">
          {data.slice(0, 8).map((item, idx) => (
            <div
              key={item.sector}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center justify-between p-1.5 rounded-sketch cursor-pointer transition-all border ${
                activeIndex === idx
                  ? "bg-amber-50 border-ink-900 shadow-sketch-sm"
                  : "border-transparent hover:bg-paper-100"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full border border-ink-900 flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-hand font-semibold text-ink-800 truncate">
                  {item.sector}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-ink-900 ml-1">
                {item.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
