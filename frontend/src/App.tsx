import { useState, useEffect, useMemo } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar, NavTab } from "./components/layout/Sidebar";
import { StatCards } from "./components/dashboard/StatCards";
import { AllocationChart } from "./components/dashboard/AllocationChart";
import { DividendBarChart } from "./components/dashboard/DividendBarChart";
import { TopHoldings } from "./components/dashboard/TopHoldings";
import { SystemStatusBanner } from "./components/dashboard/SystemStatusBanner";
import { ConnectionsManager } from "./components/settings/ConnectionsManager";
import { TransactionsView } from "./components/transactions/TransactionsView";
import { HoldingsView } from "./components/holdings/HoldingsView";
import { DividendsView } from "./components/dividends/DividendsView";
import { DividendCalendarView } from "./components/dividends/DividendCalendarView";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { DiversificationView } from "./components/diversification/DiversificationView";
import { TaxEstimatorView } from "./components/tax/TaxEstimatorView";
import { DataToolsView } from "./components/data/DataToolsView";
import { KeyRound, Wallet, RefreshCw, Sparkles } from "lucide-react";
import {
  HealthStatus,
  Holding,
  MonthlyDividend,
  SectorAllocation,
  ConnectionsResponse,
  PortfolioSummary,
  HoldingItem,
  ApiDividendItem,
  UpdateCheckResult,
} from "./types";
import {
  fetchConnections,
  fetchPortfolioSummary,
  fetchHoldings,
  fetchDividends,
  fetchExpectedDividends,
  triggerSync,
  fetchSyncStatus,
  fetchUpdateCheck,
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
  expected: ApiDividendItem[] = []
): MonthlyDividend[] {
  const currentYear = new Date().getFullYear();
  const yearsWithData = new Set<number>();
  for (const d of received) {
    const dtStr = d.payment_date || d.ex_dividend_date;
    if (dtStr && dtStr.length >= 4) {
      const y = parseInt(dtStr.slice(0, 4), 10);
      if (!isNaN(y)) yearsWithData.add(y);
    }
  }
  for (const d of expected) {
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
        months[mIdx].expected = (months[mIdx].expected || 0) + div.amount;
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
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);

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
    fetchUpdateCheck().then(setUpdateInfo).catch(() => {});
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
            `Sync complete! ${res.holdings_count ?? 0} holdings, ${res.dividends_count ?? 0} received dividends synced from Trading 212.`
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

  const totalReceivedAllTime = useMemo(
    () => liveDividends.reduce((sum, d) => sum + d.amount, 0),
    [liveDividends]
  );

  const { receivedYtd, trailing12Months, monthlyAverage } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    let ytd = 0;
    let ttm = 0;

    for (const d of liveDividends) {
      const dtStr = d.payment_date || d.ex_dividend_date;
      if (!dtStr) continue;
      const date = new Date(dtStr);
      if (isNaN(date.getTime())) continue;

      if (date.getFullYear() === currentYear) {
        ytd += d.amount;
      }
      if (date >= oneYearAgo && date <= now) {
        ttm += d.amount;
      }
    }

    const avg = ttm > 0 ? ttm / 12 : 0;
    return { receivedYtd: ytd, trailing12Months: ttm, monthlyAverage: avg };
  }, [liveDividends]);

  const forwardAnnualDividend = useMemo(() => {
    // 1. If holdings have annual_dividend, sum across active positions
    const fromHoldings = liveHoldings.reduce((sum, h) => {
      if (typeof h.annual_dividend === "number" && h.annual_dividend > 0) {
        return sum + h.annual_dividend * (h.quantity || 1);
      }
      if (typeof h.dividend_yield === "number" && h.dividend_yield > 0) {
        return sum + h.market_value * (h.dividend_yield / 100);
      }
      return sum;
    }, 0);

    if (fromHoldings > 0) return fromHoldings;

    // 2. Fallback to sum of expected dividends over next 12 months
    const now = new Date();
    const oneYearAhead = new Date(now);
    oneYearAhead.setFullYear(now.getFullYear() + 1);

    return liveExpected.reduce((sum, d) => {
      const dtStr = d.payment_date || d.ex_dividend_date;
      if (!dtStr) return sum;
      const date = new Date(dtStr);
      if (!isNaN(date.getTime()) && date >= now && date <= oneYearAhead) {
        return sum + d.amount;
      }
      return sum;
    }, 0);
  }, [liveHoldings, liveExpected]);

  const next30DaysDividends = useMemo(() => {
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return liveExpected.reduce((sum, d) => {
      const dtStr = d.payment_date || d.ex_dividend_date;
      if (!dtStr) return sum;
      const date = new Date(dtStr);
      if (!isNaN(date.getTime()) && date >= now && date <= thirtyDaysAhead) {
        return sum + d.amount;
      }
      return sum;
    }, 0);
  }, [liveExpected]);

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
        updateInfo={updateInfo}
        syncProgress={syncProgress}
      />

      {/* New Version Available Banner */}
      {updateInfo?.update_available && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-900 transition-all duration-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                A new version of DivYield (<strong>{updateInfo.latest_version}</strong>) is available.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={updateInfo.release_url || "https://github.com/sunilsankar/DivYield/releases"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-amber-700"
              >
                Download Update
              </a>
              <button
                onClick={() => setUpdateInfo(null)}
                className="text-amber-700 hover:text-amber-950 font-bold ml-1 cursor-pointer"
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Progress Banner in Modern style */}
      {isSyncing && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3 text-slate-900 shadow-sm">
          <div className="max-w-xl mx-auto flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 truncate">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                <span className="truncate text-slate-800">{syncProgress?.stepMessage || "Synchronizing portfolio & dividends..."}</span>
              </span>
              <span className="bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full text-[11px] shrink-0 font-bold ml-2 shadow-xs">
                {syncProgress && syncProgress.totalSteps > 0
                  ? `Step ${syncProgress.currentStep}/${syncProgress.totalSteps} (${Math.round(
                      (syncProgress.currentStep / syncProgress.totalSteps) * 100
                    )}%)`
                  : "Syncing..."}
              </span>
            </div>
            <div className="w-full bg-indigo-100/70 rounded-full h-2.5 overflow-hidden p-0.5">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
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
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 text-center text-xs font-medium text-emerald-900 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
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

              {/* Statistics Panels */}
              <StatCards
                portfolioValue={totalPortfolioValue}
                dailyChange={summary?.unrealized_pnl ?? 0}
                dailyChangePercent={summary?.unrealized_pnl_percent ?? 0}
                totalReceivedAllTime={totalReceivedAllTime}
                receivedYtd={receivedYtd}
                trailing12Months={trailing12Months}
                monthlyAverage={monthlyAverage}
                forwardDividend={forwardAnnualDividend}
                next30Days={next30DaysDividends}
              />

              {activeHoldings.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Portfolio Ready for Sync</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Configure your Trading 212 API credentials in Connections and click <strong>Sync Now</strong> to fetch your real holdings, orders, and dividend history.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                    <button
                      onClick={() => setCurrentTab("connections")}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all"
                    >
                      Configure API Keys &rarr;
                    </button>
                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
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

              {/* Secondary Widgets Section: Top Yielding Holdings */}
              <div className="grid grid-cols-1 gap-6">
                <TopHoldings
                  holdings={activeHoldings}
                  onViewAllHoldings={() => setCurrentTab("holdings")}
                />
              </div>
            </>
          )}

          {currentTab === "holdings" && (
            <HoldingsView
              holdings={activeHoldings}
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
              totalAnnualExpected={forwardAnnualDividend > 0 ? forwardAnnualDividend : trailing12Months}
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

          {currentTab === "diversification" && (
            <DiversificationView
              onNavigateToHoldings={() => setCurrentTab("holdings")}
              onNavigateToSync={() => setCurrentTab("connections")}
            />
          )}

          {currentTab === "tax" && (
            <TaxEstimatorView />
          )}

          {currentTab === "data-tools" && (
            <DataToolsView />
          )}

          {currentTab === "connections" && (
            <ConnectionsManager onConnectionChange={loadConnections} />
          )}

          {currentTab === "settings" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    System Preferences & Config
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    DivYield configuration stored locally in SQLite (WAL mode)
                  </p>
                </div>
                <button
                  onClick={() => setCurrentTab("connections")}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2 self-start transition-all"
                >
                  <KeyRound className="w-4 h-4" />
                  Manage API Connections
                </button>
              </div>

              <div className="space-y-4 max-w-md text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Base Currency</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="EUR">EUR (€) — Euro (Default)</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Tax Jurisdiction</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="NL">Netherlands (Box 3 - Wealth Tax)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Sync Frequency</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="manual">Manual ("Sync Now" button only)</option>
                  </select>
                </div>
              </div>

              {/* Security Audit Badge in Settings */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1.5">
                <span className="font-bold text-slate-900 block text-xs">Security & Privacy Checklist</span>
                <p className="text-slate-600">✓ OS Keychain credential storage enabled (Fernet AES fallback)</p>
                <p className="text-slate-600">✓ Trading 212 order execution strictly forbidden and disabled</p>
                <p className="text-slate-600">✓ Zero secrets written to SQLite or browser storage</p>
              </div>

              {/* Application & Installation Info */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Application & System Integration</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">v0.1.0-beta</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-lg border border-slate-200/60 flex flex-col gap-1">
                    <span className="font-semibold text-slate-800">Shortcuts & Launchers</span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Desktop and Start Menu shortcuts are installed with the official DivYield icon.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200/60 flex flex-col gap-1">
                    <span className="font-semibold text-slate-800">Uninstall Options</span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Windows: <strong>Start Menu → DivYield → Uninstall DivYield</strong> or via <strong>Windows Settings → Installed Apps</strong>. macOS: Move DivYield from Applications to Trash.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">DivYield</span>
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
