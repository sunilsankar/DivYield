import React from "react";
import { Clock, ArrowRight } from "lucide-react";
import { DividendEvent } from "@/types";
import { SketchWavyLine } from "../ui/SketchIcons";
import { formatCurrency } from "@/lib/utils";

interface UpcomingDividendsProps {
  events: DividendEvent[];
  onViewCalendar: () => void;
}

export const UpcomingDividends: React.FC<UpcomingDividendsProps> = ({
  events,
  onViewCalendar,
}) => {
  return (
    <div className="sketch-card p-5 bg-white flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sketch text-xl font-bold text-ink-900">
              Upcoming Dividend Radar
            </span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xs font-mono px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-800 rounded-sketch font-bold">
            {events.length} Events
          </span>
        </div>
        <p className="text-xs font-hand text-ink-muted -mt-0.5">
          ex-dividend dates & scheduled cash payout timeline
        </p>
        <SketchWavyLine className="w-28 h-2 text-ink-900/30 my-2" />

        {/* List of events */}
        <div className="flex flex-col gap-2.5 mt-3">
          {events.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-ink-900/20 rounded-sketch p-4">
              <p className="font-sketch font-bold text-ink-900 text-sm">No Upcoming Dividends Scheduled</p>
              <p className="text-xs font-hand text-ink-muted mt-1">
                Run Combined Sync to detect scheduled dividend declarations from EODHD
              </p>
            </div>
          ) : (
            events.slice(0, 5).map((evt) => (
              <div
                key={evt.id}
                className="p-3 bg-paper-50 border-2 border-ink-900 rounded-sketch flex items-center justify-between gap-3 hover:bg-amber-50/50 transition-colors shadow-sketch-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border-2 border-ink-900 rounded-sketch flex items-center justify-center font-mono font-black text-xs text-ink-900">
                    {evt.ticker.split(".")[0]}
                  </div>
                  <div>
                    <h4 className="font-sketch font-bold text-sm text-ink-900 leading-tight">
                      {evt.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-ink-muted mt-0.5">
                      <span>Ex: {evt.exDate}</span>
                      <span>•</span>
                      <span className="text-purple-800 font-semibold">
                        Pay: {evt.payDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-sketch text-base font-bold text-ink-900 block leading-tight">
                    {formatCurrency(evt.totalAmount)}
                  </span>
                  <span className="text-[10px] font-mono text-ink-700 bg-amber-100 px-1.5 py-0.5 rounded-sketch border border-ink-900/30">
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
        className="mt-4 flex items-center justify-center gap-2 py-2 w-full text-xs font-hand font-bold text-ink-800 hover:text-ink-900 hover:bg-paper-100 rounded-sketch border border-dashed border-ink-900/30 transition-all"
      >
        <span>Open Full Dividend Calendar & Milestones</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
