import { useState, useEffect, useMemo } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar, NavTab } from "./components/layout/Sidebar";
import { StatCards } from "./components/dashboard/StatCards";
import { AllocationChart } from "./components/dashboard/AllocationChart";
import { DividendBarChart } from "./components/dashboard/DividendBarChart";
import { UpcomingDividends } from "./components/dashboard/UpcomingDividends";
import { TopHoldings } from "./components/dashboard/TopHoldings";
import { SystemStatusBanner } from "./components/dashboard/SystemStatusBanner";
import { ConnectionsManager } from "./components/settings/ConnectionsManager";
import { TransactionsView } from "./components/transactions/TransactionsView";
import { MappingsManager } from "./components/mappings/MappingsManager";
import { HoldingsView } from "./components/holdings/HoldingsView";
import { DividendsView } from "./components/dividends/DividendsView";
import { DividendCalendarView } from "./components/dividends/DividendCalendarView";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { TaxEstimatorView } from "./components/tax/TaxEstimatorView";
import { DataToolsView } from "./components/data/DataToolsView";
import { SketchSparkle } from "./components/ui/SketchIcons";
import {
  HealthStatus,
  Holding,
  DividendEvent,
  MonthlyDividend,
  SectorAllocation,
  ConnectionsResponse,
  PortfolioSummary,
  HoldingItem,
  ApiDividendItem,
} from "./types";
import { KeyRound, Wallet, RefreshCw } from "lucide-react";
import {
  fetchConnections,
  fetchPortfolioSummary,
  fetchHoldings,
  fetchDividends,
  fetchExpectedDividends,
  triggerSync,
  fetchSyncStatus,
} from "./lib/api";

const SECTOR_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
  "#64748b", // slate
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function calculateSectorAllocations(holdings: Holding[], totalValue: number): SectorAllocation[] {
  if (holdings.length === 0 || totalValue <= 0) return [];
  const sectorMap = new Map<string, number>();
  for (const h of holdings) {
    const sec = h.sector?.trim() || "Unassigned";
    sectorMap.set(sec, (sectorMap.get(sec) || 0) + h.marketValue);
  }
  const sorted = Array.from(sectorMap.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.map(([sector, value], idx) => ({
    sector,
    value,
    percentage: (value / totalValue) * 100,
    color: SECTOR_COLORS[idx % SECTOR_COLORS.length],
  }));
}

function calculateMonthlyDividends(
  received: ApiDividendItem[],
  expected: ApiDividendItem[]
): MonthlyDividend[] {
  const currentYear = new Date().getFullYear();
  const yearsWithData = new Set<number>();
  for (const d of [...received, ...expected]) {
    const dtStr = d.payment_date || d.ex_dividend_date;
    if (dtStr && dtStr.length >= 4) {
      const y = parseInt(dtStr.slice(0, 4), 10);
      if (!isNaN(y)) yearsWithData.add(y);
    }
  }
  const targetYear = yearsWithData.has(currentYear)
    ? currentYear
    : yearsWithData.size > 0
    ? Math.max(...Array.from(yearsWithData))
    : currentYear;

  const months: MonthlyDividend[] = MONTH_NAMES.map((month) => ({
    month,
    received: 0,
    expected: 0,
  }));

  for (const div of received) {
    const dtStr = div.payment_date || div.ex_dividend_date;
    if (!dtStr) continue;
    const d = new Date(dtStr);
    if (!isNaN(d.getTime()) && d.getFullYear() === targetYear) {
      const mIdx = d.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        months[mIdx].received += div.amount;
      }
    }
  }

  for (const div of expected) {
    const dtStr = div.payment_date || div.ex_dividend_date;
    if (!dtStr) continue;
    const d = new Date(dtStr);
    if (!isNaN(d.getTime()) && d.getFullYear() === targetYear) {
      const mIdx = d.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        months[mIdx].expected += div.amount;
      }
    }
  }

  return months;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [connections, setConnections] = useState<ConnectionsResponse | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [liveHoldings, setLiveHoldings] = useState<HoldingItem[]>([]);
  const [liveDividends, setLiveDividends] = useState<ApiDividendItem[]>([]);
  const [liveExpected, setLiveExpected] = useState<ApiDividendItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedText, setLastSyncedText] = useState<string>("Not Synced Yet");
  const [notification, setNotification] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    currentStep: number;
    totalSteps: number;
    stepMessage: string;
  } | null>(null);

  // Health fetch function connecting to FastAPI
  const checkHealth = async () => {
    setHealthLoading(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/v1/health");
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setHealth({ ...data, latencyMs });
      } else {
        setHealth({
          status: "error",
          app: "DivYield",
          database: "error",
          timestamp: new Date().toISOString(),
          latencyMs,
        });
      }
    } catch {
      setHealth({
        status: "error",
        app: "DivYield",
        database: "disconnected",
        timestamp: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - start),
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await fetchConnections();
      setConnections(data);
    } catch {
      // API may be offline or starting up
    }
  };

  const loadLiveData = async () => {
    try {
      const [sumRes, holdRes, divRes, expRes, syncRes] = await Promise.allSettled([
        fetchPortfolioSummary(),
        fetchHoldings(),
        fetchDividends(),
        fetchExpectedDividends(),
        fetchSyncStatus(),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (holdRes.status === "fulfilled") setLiveHoldings(holdRes.value.holdings);
      if (divRes.status === "fulfilled") setLiveDividends(divRes.value.dividends);
      if (expRes.status === "fulfilled") setLiveExpected(expRes.value.dividends);
      if (syncRes.status === "fulfilled" && syncRes.value.last_synced) {
        const d = new Date(syncRes.value.last_synced);
        setLastSyncedText(`Today, ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
      }
    } catch {
      // API offline or starting up
    }
  };

  useEffect(() => {
    checkHealth();
    loadConnections();
    loadLiveData();
    const interval = setInterval(() => {
      checkHealth();
      loadConnections();
      loadLiveData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Primary Sync handler calling FastAPI /api/v1/sync
  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress({
      currentStep: 1,
      totalSteps: 8,
      stepMessage: "Starting synchronization...",
    });
    setNotification(null);

    // Poll sync progress every 1s while sync is running
    const pollInterval = window.setInterval(async () => {
      try {
        const status = await fetchSyncStatus();
        if (status.is_syncing && status.current_step && status.total_steps) {
          setSyncProgress({
            currentStep: status.current_step,
            totalSteps: status.total_steps,
            stepMessage: status.step_message || "Synchronizing...",
          });
        }
      } catch {
        // ignore polling errors during sync
      }
    }, 1000);

    try {
      const res = await triggerSync();
      if (res.success) {
        setNotification(
          res.message ||
            `Sync complete! ${res.holdings_count ?? 0} holdings, ${res.dividends_count ?? 0} received dividends, ${res.instruments_enriched ?? 0} enriched.`
        );
        const now = new Date();
        setLastSyncedText(`Today, ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
        await Promise.all([loadLiveData(), loadConnections()]);
      } else {
        const msg = res.error || res.message || "Sync notice";
        setNotification(`Sync notice: ${msg}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setNotification(`Sync error: ${msg}`);
    } finally {
      clearInterval(pollInterval);
      setSyncProgress(null);
      setIsSyncing(false);
      setTimeout(() => setNotification(null), 8000);
    }
  };

  const activeHoldings: Holding[] = liveHoldings.map((h, i) => {
    const divYield = typeof h.dividend_yield === "number" && h.dividend_yield > 0 ? h.dividend_yield : 0;
    const annDiv =
      typeof h.annual_dividend === "number" && h.annual_dividend > 0
        ? h.annual_dividend
        : h.market_value * (divYield / 100);
    return {
      id: h.id || i + 1,
      ticker: h.ticker,
      name: h.name || h.ticker,
      shares: h.quantity,
      avgPrice: h.average_price,
      currentPrice: h.current_price,
      marketValue: h.market_value,
      unrealizedGain: h.unrealized_gain,
      unrealizedGainPercent: h.unrealized_gain_percent,
      dividendYield: divYield,
      annualDividend: annDiv,
      sector: h.sector || "Other",
      currency: h.currency || "EUR",
    };
  });

  const totalPortfolioValue =
    summary && summary.total_value > 0
      ? summary.total_value
      : activeHoldings.reduce((sum, h) => sum + h.marketValue, 0);

  const totalAnnualDividend = activeHoldings.reduce((sum, h) => sum + h.annualDividend, 0);
  const overallYield = totalPortfolioValue > 0 ? (totalAnnualDividend / totalPortfolioValue) * 100 : 0;
  const receivedYtd = liveDividends.reduce((sum, d) => sum + d.amount, 0);

  const upcomingEvents: DividendEvent[] = liveExpected.map((e, idx) => ({
    id: e.id || idx + 1,
    ticker: e.ticker,
    name: e.ticker,
    exDate: e.ex_dividend_date || "-",
    payDate: e.payment_date || "-",
    amountPerShare: e.amount,
    totalAmount: e.amount,
    currency: e.currency,
    status: "EXPECTED" as const,
  }));

  const upcoming30Days = upcomingEvents.reduce((sum, e) => sum + e.totalAmount, 0);

  const sectorAllocations = useMemo(
    () => calculateSectorAllocations(activeHoldings, totalPortfolioValue),
    [activeHoldings, totalPortfolioValue]
  );

  const monthlyDividends = useMemo(
    () => calculateMonthlyDividends(liveDividends, liveExpected),
    [liveDividends, liveExpected]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <Navbar
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={checkHealth}
        onSync={handleSyncNow}
        isSyncing={isSyncing}
        lastSyncedText={lastSyncedText}
        connections={connections}
        onOpenConnections={() => setCurrentTab("connections")}
        syncProgress={syncProgress}
      />

      {/* Sync Progress Banner in Sketch style */}
      {isSyncing && (
        <div className="bg-amber-100 border-b-2 border-ink-900 px-4 py-3 text-ink-900 shadow-sketch-sm">
          <div className="max-w-xl mx-auto flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="flex items-center gap-2 truncate">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
                <span className="truncate">{syncProgress?.stepMessage || "Synchronizing portfolio & dividends..."}</span>
              </span>
              <span className="bg-amber-200 border border-ink-900 px-2 py-0.5 rounded-sketch text-[11px] shrink-0 font-bold ml-2">
                {syncProgress && syncProgress.totalSteps > 0
                  ? `Step ${syncProgress.currentStep}/${syncProgress.totalSteps} (${Math.round(
                      (syncProgress.currentStep / syncProgress.totalSteps) * 100
                    )}%)`
                  : "Syncing..."}
              </span>
            </div>
            <div className="w-full bg-white border-2 border-ink-900 rounded-sketch h-3.5 overflow-hidden p-0.5 shadow-inner">
              <div
                className="bg-amber-400 h-full rounded-[2px] transition-all duration-300 ease-out border-r border-ink-900"
                style={{
                  width: `${
                    syncProgress && syncProgress.totalSteps > 0
                      ? Math.max(8, Math.min(100, Math.round((syncProgress.currentStep / syncProgress.totalSteps) * 100)))
                      : 15
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Result Notification Banner (when not syncing) */}
      {!isSyncing && notification && (
        <div className="bg-amber-100 border-b-2 border-ink-900 px-4 py-2 text-center text-xs font-mono font-bold text-ink-900 flex items-center justify-center gap-2">
          <SketchSparkle className="w-4 h-4 text-amber-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar */}
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Right Main Content Area */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          {currentTab === "dashboard" && (
            <>
              {/* System Connectivity Banner */}
              <SystemStatusBanner
                health={health}
                loading={healthLoading}
                onRefresh={checkHealth}
              />

              {/* Statistics Panels (Hand-drawn cards) */}
              <StatCards
                portfolioValue={totalPortfolioValue}
                dailyChange={summary?.unrealized_pnl ?? 0}
                dailyChangePercent={summary?.unrealized_pnl_percent ?? 0}
                annualDividend={totalAnnualDividend}
                dividendYield={overallYield}
                receivedYtd={receivedYtd}
                upcoming30Days={upcoming30Days}
              />

              {activeHoldings.length === 0 && (
                <div className="sketch-card p-6 bg-amber-50/70 border-2 border-dashed border-amber-900/30 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-900 shadow-sketch">
                    <Wallet className="w-6 h-6 text-amber-900" />
                  </div>
                  <div>
                    <h3 className="font-sketch text-xl font-bold text-ink-900">Portfolio Ready for Sync</h3>
                    <p className="text-sm font-hand text-ink-700 max-w-md mx-auto mt-1">
                      Sample data has been removed. Configure your Trading 212 API credentials in Settings and click <strong>Sync Now</strong> to fetch your real holdings and dividend history.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                    <button
                      onClick={() => setCurrentTab("connections")}
                      className="sketch-btn bg-amber-200 hover:bg-amber-300 text-ink-900 px-4 py-1.5 text-xs font-mono font-bold"
                    >
                      Configure API Keys &rarr;
                    </button>
                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="sketch-btn bg-ink-900 text-paper-100 hover:bg-ink-800 px-4 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Syncing..." : "Sync Now"}
                    </button>
                  </div>
                </div>
              )}

              {/* Graphical Charts Section: Allocation Donut + Monthly Dividend Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                  <AllocationChart
                    data={sectorAllocations}
                    totalValue={totalPortfolioValue}
                  />
                </div>
                <div className="lg:col-span-7">
                  <DividendBarChart data={monthlyDividends} />
                </div>
              </div>

              {/* Secondary Widgets Section: Upcoming Radar + Top Yielding Holdings */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                  <UpcomingDividends
                    events={upcomingEvents}
                    onViewCalendar={() => setCurrentTab("calendar")}
                  />
                </div>
                <div className="lg:col-span-7">
                  <TopHoldings
                    holdings={activeHoldings}
                    onViewAllHoldings={() => setCurrentTab("holdings")}
                  />
                </div>
              </div>
            </>
          )}

          {currentTab === "holdings" && (
            <HoldingsView
              holdings={activeHoldings}
              onOpenMappings={() => setCurrentTab("mappings")}
              onTriggerSync={handleSyncNow}
              isSyncing={isSyncing}
            />
          )}

          {currentTab === "transactions" && (
            <TransactionsView
              onOpenConnections={() => setCurrentTab("connections")}
              onTriggerSync={handleSyncNow}
              isSyncing={isSyncing}
            />
          )}

          {currentTab === "dividends" && (
            <DividendsView
              receivedDividends={liveDividends}
              monthlyChartData={monthlyDividends}
              totalAnnualExpected={totalAnnualDividend}
              onOpenCalendar={() => setCurrentTab("calendar")}
              onTriggerSync={handleSyncNow}
              isSyncing={isSyncing}
            />
          )}

          {currentTab === "calendar" && (
            <DividendCalendarView
              receivedDividends={liveDividends}
              expectedDividends={liveExpected}
              holdings={activeHoldings}
              currency={summary?.currency || "EUR"}
            />
          )}

          {currentTab === "analytics" && (
            <AnalyticsView />
          )}

          {currentTab === "tax" && (
            <TaxEstimatorView />
          )}

          {currentTab === "mappings" && (
            <MappingsManager />
          )}

          {currentTab === "data-tools" && (
            <DataToolsView />
          )}

          {currentTab === "connections" && (
            <ConnectionsManager onConnectionChange={loadConnections} />
          )}

          {currentTab === "settings" && (
            <div className="sketch-card p-6 bg-white space-y-6">
              <div className="pb-3 border-b-2 border-ink-900 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-sketch text-2xl font-bold text-ink-900">
                    System Preferences & Config
                  </h2>
                  <p className="text-xs font-hand text-ink-muted">
                    DivYield configuration stored locally in SQLite (WAL mode)
                  </p>
                </div>
                <button
                  onClick={() => setCurrentTab("connections")}
                  className="sketch-btn px-4 py-2 font-sketch text-xs font-bold bg-amber-400 border-2 border-ink-900 rounded-sketch hover:bg-amber-300 flex items-center gap-2 self-start"
                >
                  <KeyRound className="w-4 h-4" />
                  Manage API Connections
                </button>
              </div>

              <div className="space-y-4 max-w-md text-sm font-hand">
                <div>
                  <label className="block font-bold text-ink-900 mb-1">Base Currency</label>
                  <select className="w-full p-2 bg-paper-50 border-2 border-ink-900 rounded-sketch font-mono text-xs">
                    <option value="EUR">EUR (€) — Euro (Default)</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-ink-900 mb-1">Tax Jurisdiction</label>
                  <select className="w-full p-2 bg-paper-50 border-2 border-ink-900 rounded-sketch font-mono text-xs">
                    <option value="NL">Netherlands (Box 3 - Wealth Tax)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-ink-900 mb-1">Sync Frequency</label>
                  <select className="w-full p-2 bg-paper-50 border-2 border-ink-900 rounded-sketch font-mono text-xs">
                    <option value="manual">Manual ("Sync Now" button only)</option>
                  </select>
                </div>
              </div>

              {/* Security Audit Badge in Settings */}
              <div className="p-4 bg-paper-50 border-2 border-dashed border-ink-900 rounded-sketch text-xs font-hand space-y-1">
                <span className="font-bold text-ink-900 block font-sketch text-sm">Security & Privacy Checklist</span>
                <p className="text-ink-700">✓ OS Keychain credential storage enabled</p>
                <p className="text-ink-700">✓ Trading 212 order execution strictly forbidden and disabled</p>
                <p className="text-ink-700">✓ Zero secrets written to SQLite or browser storage</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-ink-900 bg-white/70 py-4 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="font-sketch font-bold text-ink-900 text-sm">DivYield</span>
            <span>•</span>
            <span>Local-first portfolio & dividend tracker</span>
          </div>
          <div>
            FastAPI `/api/v1` • SQLite (WAL) • Strict Read-Only Trading 212
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
