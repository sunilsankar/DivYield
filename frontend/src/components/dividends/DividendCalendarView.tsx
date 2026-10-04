import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { ApiDividendItem, ApiHolding, Holding } from "../../types";
import { formatCurrency } from "../../lib/utils";

interface DividendCalendarViewProps {
  receivedDividends: ApiDividendItem[];
  expectedDividends: ApiDividendItem[];
  holdings?: (ApiHolding | Holding)[];
  currency?: string;
}

type CalendarViewMode = "month" | "list" | "year";
type StatusFilter = "ALL" | "RECEIVED" | "EXPECTED";

export const DividendCalendarView: React.FC<DividendCalendarViewProps> = ({
  receivedDividends,
  expectedDividends,
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
      if (viewMode === "month") {
        const dateStr = item.payment_date || item.ex_dividend_date;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (d.getFullYear() !== selectedYear || d.getMonth() !== selectedMonth) {
          return false;
        }
      } else if (viewMode === "year") {
        const dateStr = item.payment_date || item.ex_dividend_date;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (d.getFullYear() !== selectedYear) {
          return false;
        }
      }
      return true;
    });
  }, [allEvents, statusFilter, tickerSearch, viewMode, selectedYear, selectedMonth]);

  // Totals for the current filtered view
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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Visual Calendar Grid calculations (Monday start)
  const calendarGrid = useMemo(() => {
    if (viewMode !== "month") return [];

    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    // In JS, getDay() returns 0 for Sunday, 1 for Monday, etc.
    // Convert to Monday = 0, Sunday = 6
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const daysInPrevMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    // Map events by date (YYYY-MM-DD)
    const eventsByDate = new Map<string, typeof allEvents>();
    filteredEvents.forEach((ev) => {
      const rawDate = ev.payment_date || ev.ex_dividend_date;
      if (rawDate) {
        const dateKey = rawDate.slice(0, 10);
        const existing = eventsByDate.get(dateKey) || [];
        existing.push(ev);
        eventsByDate.set(dateKey, existing);
      }
    });

    const grid = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Previous month filler days
    for (let i = startingDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      grid.push({
        day: dayNum,
        isCurrentMonth: false,
        dateStr: "",
        isToday: false,
        events: [],
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = eventsByDate.get(dateStr) || [];
      grid.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
        isToday: dateStr === todayStr,
        events: dayEvents,
      });
    }

    // Trailing days to round out 35 or 42 cells
    const remaining = (7 - (grid.length % 7)) % 7;
    for (let r = 1; r <= remaining; r++) {
      grid.push({
        day: r,
        isCurrentMonth: false,
        dateStr: "",
        isToday: false,
        events: [],
      });
    }

    return grid;
  }, [selectedYear, selectedMonth, viewMode, filteredEvents, allEvents]);

  // Year mode matrix: aggregate monthly totals
  const yearMonthlyTotals = useMemo(() => {
    if (viewMode !== "year") return [];

    const months = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      name: monthNames[i],
      received: 0,
      expected: 0,
      count: 0,
    }));

    filteredEvents.forEach((e) => {
      const dStr = e.payment_date || e.ex_dividend_date;
      if (dStr) {
        const d = new Date(dStr);
        if (d.getFullYear() === selectedYear) {
          const m = d.getMonth();
          if (e.displayStatus === "RECEIVED") {
            months[m].received += e.amount;
          } else {
            months[m].expected += e.amount;
          }
          months[m].count += 1;
        }
      }
    });

    return months;
  }, [viewMode, filteredEvents, selectedYear, monthNames]);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="sketch-card bg-amber-50/70 p-5 rounded-2xl relative border-2 border-stone-800 shadow-sketch">
        <div className="tape -top-2 left-8"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-200 border-2 border-stone-800 flex items-center justify-center font-hand text-2xl shadow-sketch-sm">
              <CalendarIcon className="w-6 h-6 text-stone-800" />
            </div>
            <div>
              <h2 className="font-hand font-bold text-2xl text-stone-900 tracking-wide flex items-center gap-2">
                Dividend Calendar & Schedule
                <span className="text-xs font-mono font-normal bg-amber-200 border border-stone-800 px-2 py-0.5 rounded-full">
                  EUR
                </span>
              </h2>
              <p className="text-xs font-hand text-stone-600">
                Track historical cash payouts from Trading 212 & upcoming declarations from EODHD with stock names.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex border-2 border-stone-800 rounded-xl overflow-hidden bg-white shadow-sketch-sm">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 font-hand text-xs font-bold transition-colors ${
                  viewMode === "month" ? "bg-amber-300 text-stone-900" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Calendar Month
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 font-hand text-xs font-bold border-l-2 border-stone-800 transition-colors ${
                  viewMode === "list" ? "bg-amber-300 text-stone-900" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-3 py-1.5 font-hand text-xs font-bold border-l-2 border-stone-800 transition-colors ${
                  viewMode === "year" ? "bg-amber-300 text-stone-900" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Year
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector for Month/Year mode */}
        {viewMode !== "list" && (
          <div className="mt-4 pt-3 border-t-2 border-stone-800 border-dashed flex items-center justify-between">
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
                className="sketch-btn p-1 bg-white hover:bg-stone-100 text-stone-800 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-hand font-bold text-base text-stone-900 px-2 min-w-[140px] text-center">
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
                className="sketch-btn p-1 bg-white hover:bg-stone-100 text-stone-800 rounded-lg"
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
                  className="ml-2 text-[11px] font-hand font-bold text-stone-700 underline hover:text-stone-900"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <span className="text-xs font-hand text-stone-500 hidden sm:inline">
              Showing dividends for {viewMode === "month" ? `${monthNames[selectedMonth]} ${selectedYear}` : selectedYear}
            </span>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sketch-card bg-emerald-50/70 p-4 rounded-xl border-2 border-stone-800 shadow-sketch relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-hand font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownCircle className="w-4 h-4 text-emerald-700" />
              Received In Period
            </span>
            <span className="text-[10px] font-mono bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              T212 Cash
            </span>
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-emerald-950">
            {formatCurrency(totalReceived, currency)}
          </div>
          <div className="text-[11px] font-hand text-emerald-700 mt-1">
            Confirmed cash payouts deposited
          </div>
        </div>

        <div className="sketch-card bg-blue-50/70 p-4 rounded-xl border-2 border-stone-800 shadow-sketch relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-hand font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-700" />
              Scheduled / Expected
            </span>
            <span className="text-[10px] font-mono bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
              EODHD Forecast
            </span>
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-blue-950">
            {formatCurrency(totalExpected, currency)}
          </div>
          <div className="text-[11px] font-hand text-blue-700 mt-1">
            Expected declarations converted to EUR
          </div>
        </div>

        <div className="sketch-card bg-amber-50/70 p-4 rounded-xl border-2 border-stone-800 shadow-sketch relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-hand font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Total Period Dividend
            </span>
            <span className="text-[10px] font-mono bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Combined
            </span>
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-stone-900">
            {formatCurrency(totalReceived + totalExpected, currency)}
          </div>
          <div className="text-[11px] font-hand text-stone-600 mt-1">
            {filteredEvents.length} events matching current filters
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="sketch-card bg-white p-4 rounded-xl border-2 border-stone-800 shadow-sketch flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticker or name (e.g. ASML, Realty Income)..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono border-2 border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-xs font-hand font-bold text-stone-700">Status:</span>
          {(["ALL", "RECEIVED", "EXPECTED"] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-hand font-bold border transition-colors ${
                statusFilter === st
                  ? "bg-stone-800 text-amber-300 border-stone-800"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 border-stone-300"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: VISUAL CALENDAR GRID */}
      {viewMode === "month" && (
        <div className="sketch-card bg-white p-5 rounded-2xl border-2 border-stone-800 shadow-sketch">
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-stone-800 border-dashed">
            <div className="flex items-center gap-2">
              <h3 className="font-hand font-bold text-xl text-stone-900">
                {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <span className="text-xs font-hand bg-amber-100 border border-stone-400 px-2 py-0.5 rounded-full text-stone-700">
                {filteredEvents.length} events
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-hand">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-400 border border-stone-800 inline-block"></span>
                Received
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-400 border border-stone-800 inline-block"></span>
                Expected
              </span>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {weekdayNames.map((wd) => (
              <div
                key={wd}
                className="text-center font-hand font-bold text-xs uppercase tracking-wider text-stone-600 py-1 bg-stone-50 border border-stone-300 rounded-lg"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* 7-column Calendar Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
                  className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-xl border-2 transition-all flex flex-col justify-between ${
                    !cell.isCurrentMonth
                      ? "bg-stone-50/50 border-stone-200 opacity-40 select-none cursor-default"
                      : cell.isToday
                      ? "bg-amber-50/60 border-amber-500 shadow-sm ring-2 ring-amber-300 ring-offset-1"
                      : hasEvents
                      ? "bg-white border-stone-800 hover:border-amber-500 hover:bg-amber-50/20 cursor-pointer shadow-sketch-sm"
                      : "bg-white border-stone-300 hover:border-stone-400"
                  }`}
                >
                  {/* Cell Header: Day Number and Total */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        cell.isToday
                          ? "bg-amber-400 text-stone-900 border border-stone-800"
                          : cell.isCurrentMonth
                          ? "text-stone-800"
                          : "text-stone-400"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {hasEvents && (
                      <span className="text-[10px] font-mono font-bold text-stone-900 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded">
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
                          title={`${ev.ticker}: ${ev.companyName} (${formatCurrency(ev.amount, currency)})`}
                          className={`text-[10px] font-sans px-1.5 py-0.5 rounded border truncate flex items-center justify-between ${
                            isRec
                              ? "bg-emerald-100/90 text-emerald-950 border-emerald-300"
                              : "bg-blue-100/90 text-blue-950 border-blue-300"
                          }`}
                        >
                          <span className="font-bold font-mono mr-1">{ev.ticker}</span>
                          <span className="truncate text-[9px] opacity-80 mr-1 hidden sm:inline">
                            {ev.companyName}
                          </span>
                          <span className="font-mono font-semibold ml-auto">
                            {formatCurrency(ev.amount, currency)}
                          </span>
                        </div>
                      );
                    })}

                    {cell.events.length > 2 && (
                      <div className="text-[9px] font-hand font-bold text-center text-stone-600 bg-stone-100 rounded border border-stone-300 py-0.5">
                        +{cell.events.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SELECTED DAY POPUP / DRAWER */}
      {selectedDayEvents && (
        <div className="sketch-card bg-amber-50/90 p-5 rounded-2xl border-2 border-stone-800 shadow-sketch relative">
          <button
            onClick={() => setSelectedDayEvents(null)}
            className="absolute top-4 right-4 p-1 rounded-lg border border-stone-800 bg-white hover:bg-stone-100 text-stone-800"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-5 h-5 text-stone-800" />
            <h4 className="font-hand font-bold text-lg text-stone-900">
              Dividends on {selectedDayEvents.dateStr}
            </h4>
            <span className="text-xs font-mono font-bold text-stone-700 bg-white border border-stone-400 px-2 py-0.5 rounded-full">
              {selectedDayEvents.events.length} events
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedDayEvents.events.map((ev, i) => (
              <div
                key={i}
                className="bg-white p-3 rounded-xl border-2 border-stone-800 shadow-sketch-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-base text-stone-900">
                      {ev.ticker}
                    </span>
                    <span
                      className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border ${
                        ev.displayStatus === "RECEIVED"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-blue-100 text-blue-900 border-blue-300"
                      }`}
                    >
                      {ev.displayStatus}
                    </span>
                  </div>
                  <div className="text-xs font-sans text-stone-600 line-clamp-1 mb-2" title={ev.companyName}>
                    {ev.companyName}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs">
                  <span className="font-hand text-stone-500">Payout</span>
                  <span className="font-mono font-bold text-sm text-stone-900">
                    {formatCurrency(ev.amount, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: YEAR OVERVIEW MATRIX */}
      {viewMode === "year" && (
        <div className="sketch-card bg-white p-5 rounded-2xl border-2 border-stone-800 shadow-sketch">
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-stone-800 border-dashed">
            <h3 className="font-hand font-bold text-xl text-stone-900">
              {selectedYear} Annual Dividend Matrix
            </h3>
            <span className="text-xs font-hand text-stone-500">
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
                  className="p-4 rounded-xl border-2 border-stone-800 hover:border-amber-500 hover:bg-amber-50/30 transition-all cursor-pointer shadow-sketch-sm bg-white flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-hand font-bold text-base text-stone-900">
                      {m.name}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 bg-stone-100 border border-stone-300 px-1.5 py-0.2 rounded">
                      {m.count} divs
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-hand text-emerald-800">
                      <span>Received:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(m.received, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-hand text-blue-800">
                      <span>Expected:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(m.expected, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t-2 border-stone-800 border-dashed flex justify-between items-center">
                    <span className="text-xs font-hand font-bold text-stone-700">Total:</span>
                    <span className="font-mono font-bold text-sm text-stone-900">
                      {formatCurrency(combined, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EVENTS TABLE (Visible in List Mode, or as detailed breakdown below Calendar) */}
      <div className="sketch-card bg-white p-5 rounded-2xl border-2 border-stone-800 shadow-sketch">
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-stone-800 border-dashed">
          <div>
            <h3 className="font-hand font-bold text-lg text-stone-900">
              Detailed Dividend Records ({filteredEvents.length})
            </h3>
            <p className="text-xs font-hand text-stone-500">
              Showing both stock name and ticker for all cash distributions
            </p>
          </div>
          <span className="text-xs font-hand text-stone-500 hidden sm:inline">
            Source: Trading 212 & EODHD
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="font-hand text-sm text-stone-500">
              No dividend events found matching current criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-hand">
              <thead>
                <tr className="border-b-2 border-stone-800 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Stock / Company</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment Date</th>
                  <th className="py-2.5 px-3">Ex-Dividend Date</th>
                  <th className="py-2.5 px-3">Record Date</th>
                  <th className="py-2.5 px-3 text-right">Amount ({currency})</th>
                  <th className="py-2.5 px-3 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredEvents.map((e, idx) => {
                  const isReceived = e.displayStatus === "RECEIVED";
                  return (
                    <tr
                      key={e.id || idx}
                      className="hover:bg-amber-50/50 transition-colors"
                    >
                      {/* Ticker AND Company Name */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            {e.ticker}
                          </span>
                          <span className="font-sans text-[11px] text-stone-500 truncate max-w-[220px]" title={e.companyName}>
                            {e.companyName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-sans font-bold ${
                            isReceived
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : "bg-blue-100 text-blue-900 border-blue-300"
                          }`}
                        >
                          {isReceived ? "RECEIVED" : "EXPECTED"}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-stone-800">
                        {e.payment_date || "—"}
                      </td>

                      <td className="py-3 px-3 font-mono text-stone-600">
                        {e.ex_dividend_date || "—"}
                      </td>

                      <td className="py-3 px-3 font-mono text-stone-500 text-[11px]">
                        {e.record_date || "—"}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span
                          className={isReceived ? "text-emerald-700" : "text-blue-700"}
                        >
                          {formatCurrency(e.amount, currency)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                          {e.source || (isReceived ? "TRADING212" : "EODHD")}
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
    </div>
  );
};
