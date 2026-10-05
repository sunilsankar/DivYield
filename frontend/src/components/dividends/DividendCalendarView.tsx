import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ArrowDownCircle,
  Clock,
  Sparkles,
  X,
  Coins,
  PieChart,
  Info,
} from "lucide-react";
import { ApiDividendItem, ApiHolding, Holding } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { StockLogo } from "../ui/StockLogo";

interface DividendCalendarViewProps {
  receivedDividends: ApiDividendItem[];
  expectedDividends?: ApiDividendItem[];
  holdings?: (ApiHolding | Holding)[];
  currency?: string;
}

type CalendarViewMode = "month" | "list" | "year";
type StatusFilter = "ALL" | "RECEIVED" | "EXPECTED";

export const DividendCalendarView: React.FC<DividendCalendarViewProps> = ({
  receivedDividends,
  expectedDividends = [],
  holdings = [],
  currency = "EUR",
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [tickerSearch, setTickerSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: Array<ApiDividendItem & { displayStatus: "RECEIVED" | "EXPECTED"; companyName: string }>;
  } | null>(null);
  const [expandedStockEvent, setExpandedStockEvent] = useState<(ApiDividendItem & {
    displayStatus: "RECEIVED" | "EXPECTED";
    companyName: string;
  }) | null>(null);

  // Map holdings for fast company name resolution
  const holdingsNameMap = useMemo(() => {
    const map = new Map<string, string>();
    holdings.forEach((h) => {
      if (h.ticker && h.name) {
        map.set(h.ticker.toUpperCase(), h.name);
      }
    });
    return map;
  }, [holdings]);

  // Find matching holding for expanded stock event
  const matchingHolding = useMemo(() => {
    if (!expandedStockEvent) return null;
    const cleanTicker = expandedStockEvent.ticker.replace(/_US_EQ|_NL_EQ|_UK_EQ|_DE_EQ|\.US|\.AS|\.L/i, "").toUpperCase();
    return holdings.find((h) => {
      const hClean = (h.ticker || "").replace(/_US_EQ|_NL_EQ|_UK_EQ|_DE_EQ|\.US|\.AS|\.L/i, "").toUpperCase();
      return hClean === cleanTicker;
    });
  }, [expandedStockEvent, holdings]);

  // Handle escape key closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedStockEvent(null);
        setSelectedDayEvents(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Combine both dividend sources and attach resolved company names
  const allEvents = useMemo(() => {
    const combined: Array<
      ApiDividendItem & { displayStatus: "RECEIVED" | "EXPECTED"; companyName: string }
    > = [];

    receivedDividends.forEach((d) => {
      const resolvedName =
        d.company_name || holdingsNameMap.get(d.ticker.toUpperCase()) || d.ticker;
      combined.push({
        ...d,
        companyName: resolvedName,
        displayStatus: "RECEIVED",
      });
    });

    expectedDividends.forEach((d) => {
      const resolvedName =
        d.company_name || holdingsNameMap.get(d.ticker.toUpperCase()) || d.ticker;
      combined.push({
        ...d,
        companyName: resolvedName,
        displayStatus: "EXPECTED",
      });
    });

    // Sort by payment date or ex date descending
    return combined.sort((a, b) => {
      const dateA = a.payment_date || a.ex_dividend_date || "";
      const dateB = b.payment_date || b.ex_dividend_date || "";
      return dateB.localeCompare(dateA);
    });
  }, [receivedDividends, expectedDividends, holdingsNameMap]);

  // Auto-jump to the active month on initial load if the current calendar month has zero dividends
  const hasInitializedMonth = React.useRef(false);
  useEffect(() => {
    if (hasInitializedMonth.current || allEvents.length === 0) return;

    const currentY = new Date().getFullYear();
    const currentM = new Date().getMonth();

    const hasEventsInCurrentMonth = allEvents.some((e) => {
      const dStr = e.payment_date || e.ex_dividend_date;
      if (!dStr) return false;
      const parts = dStr.split("-");
      return (
        parseInt(parts[0], 10) === currentY &&
        parseInt(parts[1], 10) - 1 === currentM
      );
    });

    if (!hasEventsInCurrentMonth) {
      const todayIso = new Date().toISOString().slice(0, 10);
      // Try to find closest upcoming event first
      const upcoming = allEvents
        .filter((e) => (e.payment_date || e.ex_dividend_date || "") >= todayIso)
        .sort((a, b) =>
          (a.payment_date || "").localeCompare(b.payment_date || "")
        )[0];

      // Fallback to most recent received event
      const target = upcoming || allEvents[0];
      if (target) {
        const dStr = target.payment_date || target.ex_dividend_date;
        if (dStr) {
          const parts = dStr.split("-");
          setSelectedYear(parseInt(parts[0], 10));
          setSelectedMonth(parseInt(parts[1], 10) - 1);
        }
      }
    }
    hasInitializedMonth.current = true;
  }, [allEvents]);

  // Filtered events based on search, status, and selected period
  const filteredEvents = useMemo(() => {
    return allEvents.filter((item) => {
      if (statusFilter !== "ALL" && item.displayStatus !== statusFilter) {
        return false;
      }
      if (tickerSearch.trim()) {
        const query = tickerSearch.trim().toUpperCase();
        const matchesTicker = item.ticker.toUpperCase().includes(query);
        const matchesName = item.companyName.toUpperCase().includes(query);
        if (!matchesTicker && !matchesName) {
          return false;
        }
      }

      const dateStr = item.payment_date || item.ex_dividend_date;
      if (!dateStr) return false;

      if (viewMode === "month") {
        const parts = dateStr.split("-");
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          return y === selectedYear && m === selectedMonth;
        }
      } else if (viewMode === "year") {
        const parts = dateStr.split("-");
        if (parts.length >= 1) {
          const y = parseInt(parts[0], 10);
          return y === selectedYear;
        }
      }

      return true;
    });
  }, [allEvents, statusFilter, tickerSearch, viewMode, selectedYear, selectedMonth]);

  // Totals for current filter
  const totalReceived = useMemo(() => {
    return filteredEvents
      .filter((e) => e.displayStatus === "RECEIVED")
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredEvents]);

  const totalExpected = useMemo(() => {
    return filteredEvents
      .filter((e) => e.displayStatus === "EXPECTED")
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredEvents]);

  // Month navigation labels
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Visual Month Calendar Grid Generator
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Monday-based indexing: Sunday is 7, Monday is 1
    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;

    const cells: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: typeof filteredEvents;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const dayNum = prevMonthLastDay - i + 1;
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        day: dayNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: false,
        events: [],
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const dStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = filteredEvents.filter((ev) => {
        const evDate = ev.payment_date || ev.ex_dividend_date;
        return evDate === dStr;
      });

      cells.push({
        day,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        events: dayEvents,
      });
    }

    // Trailing padding to make a complete 7xN grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
      const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      cells.push({
        day: i,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: false,
        events: [],
      });
    }

    return cells;
  }, [selectedYear, selectedMonth, filteredEvents]);

  // Year breakdown for Matrix view
  const yearMonthlyTotals = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: monthNames[i],
      monthIndex: i,
      received: 0,
      expected: 0,
      count: 0,
    }));

    allEvents.forEach((ev) => {
      const d = ev.payment_date || ev.ex_dividend_date;
      if (!d) return;
      const parts = d.split("-");
      if (parts.length >= 2 && parseInt(parts[0], 10) === selectedYear) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          if (ev.displayStatus === "RECEIVED") {
            months[mIdx].received += ev.amount;
          } else {
            months[mIdx].expected += ev.amount;
          }
          months[mIdx].count += 1;
        }
      }
    });

    return months;
  }, [allEvents, selectedYear]);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Dividend Calendar & Schedule
                <span className="text-[11px] font-semibold bg-indigo-50 border border-indigo-200/70 text-indigo-700 px-2.5 py-0.5 rounded-full">
                  EUR
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track actual received payouts from Trading 212 and upcoming projected distributions via Yahoo Finance with stock logos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "month"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Calendar Month
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "year"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Year Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector for Month/Year mode */}
        {viewMode !== "list" && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (viewMode === "month") {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11);
                      setSelectedYear((y) => y - 1);
                    } else {
                      setSelectedMonth((m) => m - 1);
                    }
                  } else {
                    setSelectedYear((y) => y - 1);
                  }
                }}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-slate-900 px-3 min-w-[150px] text-center">
                {viewMode === "month" ? `${monthNames[selectedMonth]} ${selectedYear}` : `${selectedYear}`}
              </span>

              <button
                onClick={() => {
                  if (viewMode === "month") {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0);
                      setSelectedYear((y) => y + 1);
                    } else {
                      setSelectedMonth((m) => m + 1);
                    }
                  } else {
                    setSelectedYear((y) => y + 1);
                  }
                }}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {viewMode === "month" && (
                <button
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(now.getMonth());
                    setSelectedYear(now.getFullYear());
                  }}
                  className="ml-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline">
              Showing dividends for {viewMode === "month" ? `${monthNames[selectedMonth]} ${selectedYear}` : selectedYear}
            </span>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
              Received In Period
            </span>
            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              T212 Cash
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-950 font-mono">
            {formatCurrency(totalReceived, currency)}
          </div>
          <div className="text-xs text-emerald-700 mt-1">
            Confirmed cash payouts deposited
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              Scheduled / Expected
            </span>
            <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
              Forecast
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-950 font-mono">
            {formatCurrency(totalExpected, currency)}
          </div>
          <div className="text-xs text-indigo-700 mt-1">
            Expected declarations converted to EUR
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Total Period Dividend
            </span>
            <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              Combined
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(totalReceived + totalExpected, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {filteredEvents.length} events matching current filters
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticker or name (e.g. ASML, Realty)..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white bg-slate-50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          {(["ALL", "RECEIVED", "EXPECTED"] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: VISUAL CALENDAR GRID */}
      {viewMode === "month" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                {filteredEvents.length} events
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Received
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                Expected
              </span>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
            {weekdayNames.map((wd) => (
              <div
                key={wd}
                className="text-center font-semibold text-[11px] uppercase tracking-wider text-slate-400 py-1.5 bg-slate-50 rounded-lg"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* 7-column Calendar Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarGrid.map((cell, idx) => {
              const dayTotal = cell.events.reduce((acc, ev) => acc + ev.amount, 0);
              const hasEvents = cell.events.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDayEvents({
                        dateStr: cell.dateStr,
                        events: cell.events,
                      });
                    }
                  }}
                  className={`min-h-[85px] sm:min-h-[105px] p-2 rounded-xl border transition-all flex flex-col justify-between ${
                    !cell.isCurrentMonth
                      ? "bg-slate-50/40 border-slate-100 opacity-40 select-none cursor-default"
                      : cell.isToday
                      ? "bg-indigo-50/40 border-indigo-400 shadow-sm ring-2 ring-indigo-200"
                      : hasEvents
                      ? "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Cell Header: Day Number and Total */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                        cell.isToday
                          ? "bg-indigo-600 text-white"
                          : cell.isCurrentMonth
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {hasEvents && (
                      <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        +{formatCurrency(dayTotal, currency)}
                      </span>
                    )}
                  </div>

                  {/* Day Events Badges */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {cell.events.slice(0, 2).map((ev, eIdx) => {
                      const isRec = ev.displayStatus === "RECEIVED";
                      return (
                        <div
                          key={eIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedStockEvent(ev);
                          }}
                          title={`Click to expand ${ev.ticker}: ${ev.companyName} (${formatCurrency(ev.amount, currency)})`}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center justify-between border cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                            isRec
                              ? "bg-emerald-50 text-emerald-900 border-emerald-200/80 hover:bg-emerald-100/90 shadow-2xs"
                              : "bg-indigo-50 text-indigo-900 border-indigo-200/80 hover:bg-indigo-100/90 shadow-2xs"
                          }`}
                        >
                          <span className="font-bold mr-1">{ev.ticker}</span>
                          <span className="truncate text-[9px] opacity-75 mr-1 hidden sm:inline">
                            {ev.companyName}
                          </span>
                          <span className="font-mono font-semibold ml-auto">
                            {formatCurrency(ev.amount, currency)}
                          </span>
                        </div>
                      );
                    })}

                    {cell.events.length > 2 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayEvents({
                            dateStr: cell.dateStr,
                            events: cell.events,
                          });
                        }}
                        className="w-full text-[9px] font-semibold text-center text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded py-0.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                        title={`Click to view all ${cell.events.length} payouts for this day`}
                      >
                        +{cell.events.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SELECTED DAY POPUP MODAL (EXPANDED DAY MODAL) */}
      {selectedDayEvents && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in-up"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div
            className="bg-white rounded-2xl w-[94vw] max-w-4xl max-h-[85vh] flex flex-col border border-slate-200 shadow-2xl p-5 sm:p-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 font-heading">
                    Dividends on {selectedDayEvents.dateStr}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {selectedDayEvents.events.length} dividend payouts
                    </span>
                    <span className="text-xs text-slate-500">
                      Total:{" "}
                      <strong className="text-slate-900 font-mono">
                        {formatCurrency(
                          selectedDayEvents.events.reduce((sum, e) => sum + e.amount, 0),
                          currency
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Stock List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 overscroll-contain">
              <p className="text-xs text-slate-500 mb-2">
                Click any stock below to expand full details, yield, and portfolio holding status:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDayEvents.events.map((ev, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setExpandedStockEvent(ev);
                    }}
                    title="Click for full breakdown"
                    className="bg-slate-50 hover:bg-slate-100/90 p-4 rounded-xl border border-slate-200 hover:border-primary transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <StockLogo ticker={ev.ticker} size="md" />
                          <div>
                            <span className="font-bold text-sm text-slate-900 block group-hover:text-primary transition-colors">
                              {ev.ticker}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[150px] block" title={ev.companyName}>
                              {ev.companyName}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                            ev.displayStatus === "RECEIVED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200"
                          }`}
                        >
                          {ev.displayStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 text-xs">
                      <span className="text-slate-500 font-medium">Payout Amount</span>
                      <span className="font-mono font-bold text-base text-slate-900">
                        {formatCurrency(ev.amount, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-slate-400">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">Esc</kbd> or click outside to close
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: YEAR OVERVIEW MATRIX */}
      {viewMode === "year" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {selectedYear} Annual Dividend Matrix
            </h3>
            <span className="text-xs text-slate-500">
              12-Month distribution in {currency}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {yearMonthlyTotals.map((m) => {
              const combined = m.received + m.expected;
              return (
                <div
                  key={m.monthIndex}
                  onClick={() => {
                    setSelectedMonth(m.monthIndex);
                    setViewMode("month");
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer bg-white flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">
                      {m.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {m.count} divs
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-emerald-700">
                      <span>Received:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(m.received, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-indigo-700">
                      <span>Expected:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(m.expected, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Total:</span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {formatCurrency(combined, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EVENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
                Dividend Calendar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track actual received payouts from Trading 212 and upcoming forecast distributions with stock logos.
              </p>
            </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Source: Trading 212
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              No dividend events found matching current criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Stock / Company</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Payment Date</th>
                  <th className="py-3 px-3">Ex-Dividend Date</th>
                  <th className="py-3 px-3">Record Date</th>
                  <th className="py-3 px-3 text-right">Amount ({currency})</th>
                  <th className="py-3 px-3 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((e, idx) => {
                  const isReceived = e.displayStatus === "RECEIVED";
                  return (
                    <tr
                      key={e.id || idx}
                      onClick={() => setExpandedStockEvent(e)}
                      title="Click to view detailed payout breakdown"
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Ticker AND Company Name with Logo */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <StockLogo ticker={e.ticker} size="sm" />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs">
                              {e.ticker}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[220px]" title={e.companyName}>
                              {e.companyName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                            isReceived
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200/80"
                          }`}
                        >
                          {isReceived ? "RECEIVED" : "EXPECTED"}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-700">
                        {e.payment_date || "—"}
                      </td>

                      <td className="py-3 px-3 text-slate-500">
                        {e.ex_dividend_date || "—"}
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {e.record_date || "—"}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                        <span
                          className={isReceived ? "text-emerald-600" : "text-indigo-600"}
                        >
                          {formatCurrency(e.amount, currency)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {e.source || "TRADING212"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EXPANDED STOCK DETAIL MODAL */}
      {expandedStockEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in-up"
          onClick={() => setExpandedStockEvent(null)}
        >
          <div
            className="bg-white rounded-2xl w-[94vw] max-w-lg max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl p-5 sm:p-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Identity */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3.5">
                <StockLogo ticker={expandedStockEvent.ticker} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 font-heading">
                      {expandedStockEvent.ticker}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        expandedStockEvent.displayStatus === "RECEIVED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-indigo-50 text-indigo-800 border-indigo-200"
                      }`}
                    >
                      {expandedStockEvent.displayStatus === "RECEIVED" ? "Paid / Received" : "Scheduled / Expected"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={expandedStockEvent.companyName}>
                    {expandedStockEvent.companyName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setExpandedStockEvent(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-1 space-y-4 overscroll-contain">
              {/* Payout Hero Strip */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    DIVIDEND PAYOUT AMOUNT
                  </span>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    {formatCurrency(expandedStockEvent.amount, currency)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
              </div>

              {/* Key Dates Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] text-slate-400 font-medium block">Payment Date</span>
                  <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                    {expandedStockEvent.payment_date || "Pending"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] text-slate-400 font-medium block">Ex-Dividend</span>
                  <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                    {expandedStockEvent.ex_dividend_date || "—"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] text-slate-400 font-medium block">Record Date</span>
                  <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                    {expandedStockEvent.record_date || "—"}
                  </span>
                </div>
              </div>

              {/* Portfolio Position Context (if found) */}
              {matchingHolding ? (() => {
                const qty = "quantity" in matchingHolding ? matchingHolding.quantity : (matchingHolding as any).shares || 0;
                const val = "market_value" in matchingHolding ? matchingHolding.market_value : (matchingHolding as any).value || 0;
                const yld = "dividend_yield" in matchingHolding ? matchingHolding.dividend_yield : (matchingHolding as any).dividendYield || 0;
                const sec = matchingHolding.sector || "Equities";

                return (
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <PieChart className="w-3.5 h-3.5 text-primary" />
                      <span>Portfolio Position Overview</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Shares Held</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {qty.toFixed(qty % 1 === 0 ? 0 : 3)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Market Value</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {formatCurrency(val, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Current Yield</span>
                        <span className="font-semibold text-emerald-600 font-mono">
                          {yld ? `${(yld * 100).toFixed(2)}%` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Sector</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {sec}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-2.5 text-xs text-slate-500">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Historical payout record or mapped dividend event for {expandedStockEvent.ticker}.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-slate-400">
                Source: <span className="font-medium text-slate-600">{expandedStockEvent.source || "Trading 212"}</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedStockEvent(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
