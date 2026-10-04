import React from "react";
import { Clock, ArrowRight } from "lucide-react";
import { DividendEvent } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { StockLogo } from "../ui/StockLogo";

interface UpcomingDividendsProps {
  events: DividendEvent[];
  onViewCalendar: () => void;
}

export const UpcomingDividends: React.FC<UpcomingDividendsProps> = ({
  events,
  onViewCalendar,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between h-full transition-all duration-200">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Upcoming Dividend Radar
            </h3>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200/60">
            {events.length} Scheduled
          </span>
        </div>
        <p className="text-xs text-slate-500 font-normal">
          Ex-dividend dates and forward payout timeline from enrichment
        </p>

        {/* List of events */}
        <div className="flex flex-col gap-2.5 mt-4">
          {events.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 p-6 bg-slate-50/50">
              <p className="font-semibold text-slate-800 text-sm">No Upcoming Dividends Scheduled</p>
              <p className="text-xs text-slate-500 mt-1">
                Run Combined Sync to detect upcoming dividend declarations from EODHD
              </p>
            </div>
          ) : (
            events.slice(0, 5).map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <StockLogo ticker={evt.ticker} name={evt.name} size="md" />
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {evt.name || evt.ticker}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>Ex: {evt.exDate || "—"}</span>
                      <span>•</span>
                      <span className="text-purple-600 font-medium">
                        Pay: {evt.payDate || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-base font-bold text-slate-900 block leading-tight">
                    {formatCurrency(evt.totalAmount)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                    {formatCurrency(evt.amountPerShare)}/sh
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={onViewCalendar}
        className="mt-4 flex items-center justify-center gap-2 py-2.5 w-full text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-all duration-200"
      >
        <span>Open Visual Dividend Calendar & Milestones</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
