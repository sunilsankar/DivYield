import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConnections,
  saveTrading212Credentials,
  testTrading212Connection,
  deleteTrading212Credentials,
  fetchHealth,
  fetchPortfolioSummary,
  fetchHoldings,
  fetchTransactions,
  fetchDividends,
  triggerSync,
  fetchSyncStatus,
  fetchCalendar,
  fetchUpdateCheck,
  fetchDiversification,
  triggerFactoryReset,
  fetchSyncSettings,
  updateSyncSettings,
  fetchIncomePlanner,
} from "./api";

describe("API Client Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchHealth handles successful response", async () => {
    const mockHealth = {
      status: "ok",
      app: "DivYield",
      database: "connected",
      timestamp: "2026-10-02T12:00:00Z",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as unknown as Response);

    const result = await fetchHealth();
    expect(result.status).toBe("ok");
    expect(result.app).toBe("DivYield");
    expect(result.database).toBe("connected");
  });

  it("fetchConnections retrieves connection status without exposing raw secrets", async () => {
    const mockResponse = {
      trading212: {
        configured: true,
        masked_key: "••••••••4321",
        environment: "live",
        status: "connected",
        last_checked: "2026-10-02T12:00:00Z",
        error_message: null,
        account_currency: "EUR",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await fetchConnections();
    expect(result.trading212.configured).toBe(true);
    expect(result.trading212.masked_key).toBe("••••••••4321");
    expect(result.trading212.status).toBe("connected");
  });

  it("saveTrading212Credentials posts payload to backend", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", message: "Saved" }),
    } as unknown as Response);

    const res = await saveTrading212Credentials({
      api_key: "my_key",
      api_secret: "my_secret",
      environment: "live",
    });

    expect(res.status).toBe("success");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/credentials/trading212",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("testTrading212Connection returns connection verification result", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "connected",
        message: "Successfully verified Trading 212 connection.",
        account_currency: "EUR",
      }),
    } as unknown as Response);

    const res = await testTrading212Connection();
    expect(res.status).toBe("connected");
    expect(res.account_currency).toBe("EUR");
  });

  it("deleteTrading212Credentials issues DELETE request", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", message: "Disconnected" }),
    } as unknown as Response);

    const res = await deleteTrading212Credentials();
    expect(res.status).toBe("success");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/credentials/trading212",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("fetches portfolio summary, holdings, and transactions", async () => {
    const summaryData = {
      total_value: 50000,
      holdings_value: 48000,
      total_invested: 42000,
      unrealized_pnl: 6000,
      unrealized_pnl_percent: 14.28,
      free_cash: 2000,
      total_cash: 2000,
      currency: "EUR",
      holdings_count: 5,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => summaryData,
    } as unknown as Response);

    const summary = await fetchPortfolioSummary();
    expect(summary.total_value).toBe(50000);
    expect(summary.holdings_count).toBe(5);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        holdings: [],
        count: 0,
        total_market_value: 0,
        currency: "EUR",
      }),
    } as unknown as Response);

    const holdingsRes = await fetchHoldings();
    expect(holdingsRes.count).toBe(0);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        dividends: [],
        total_amount: 0,
        currency: "EUR",
        count: 0,
      }),
    } as unknown as Response);

    const divRes = await fetchDividends();
    expect(divRes.count).toBe(0);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transactions: [
          {
            id: 1,
            date: "2026-10-01",
            ticker: "ASML",
            type: "BUY",
            quantity: 10,
            price: 700,
            amount: 7000,
            fees: 0,
            currency: "EUR",
            source: "trading212",
          },
        ],
        total_count: 1,
        limit: 25,
        offset: 0,
      }),
    } as unknown as Response);

    const txRes = await fetchTransactions(25, 0);
    expect(txRes.transactions.length).toBe(1);
    expect(txRes.transactions[0].ticker).toBe("ASML");
  });

  it("triggers sync and queries sync status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        status: "success",
        message: "Synchronized",
        holdings_count: 6,
        orders_count: 20,
        dividends_count: 10,
      }),
    } as unknown as Response);

    const syncRes = await triggerSync();
    expect(syncRes.success).toBe(true);
    expect(syncRes.holdings_count).toBe(6);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        is_syncing: false,
        last_synced: "2026-10-02T12:00:00Z",
        trading212_status: "connected",
        current_step: 7,
        total_steps: 7,
        step_message: "Complete",
      }),
    } as unknown as Response);

    const statusRes = await fetchSyncStatus();
    expect(statusRes.is_syncing).toBe(false);
    expect(statusRes.trading212_status).toBe("connected");
  });

  it("fetchCalendar returns events with resolved company names", async () => {
    const mockCalendarResponse = {
      events: [
        {
          id: 1,
          ticker: "O",
          company_name: "Realty Income Corp",
          date: "2026-10-15",
          payment_date: "2026-10-15",
          amount: 12.50,
          currency: "EUR",
          status: "RECEIVED",
          source: "trading212",
        },
      ],
      total_received: 12.50,
      total_expected: 0,
      total_amount: 12.50,
      currency: "EUR",
      count: 1,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCalendarResponse,
    } as unknown as Response);

    const res = await fetchCalendar({ year: 2026, month: 10 });
    expect(res.count).toBe(1);
    expect(res.events[0].ticker).toBe("O");
    expect(res.events[0].company_name).toBe("Realty Income Corp");
    expect(res.events[0].amount).toBe(12.50);
  });

  it("fetchUpdateCheck queries /api/v1/updates and returns update metadata", async () => {
    const mockUpdateResponse = {
      current_version: "0.1.0-beta",
      latest_version: "v0.2.0-beta",
      update_available: true,
      release_url: "https://github.com/sunilsankar/DivYield/releases/tag/v0.2.0-beta",
      release_name: "v0.2.0-beta",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpdateResponse,
    } as unknown as Response);

    const res = await fetchUpdateCheck();
    expect(res.current_version).toBe("0.1.0-beta");
    expect(res.update_available).toBe(true);
    expect(res.latest_version).toBe("v0.2.0-beta");
  });

  it("fetchDiversification queries /api/v1/analytics/diversification", async () => {
    const mockDiversification = {
      overall_score: 84,
      rating: "Well Diversified",
      hhi_index: 480.5,
      effective_holdings: 20.8,
      total_holdings_count: 25,
      total_sectors_count: 8,
      top1_concentration: 8.5,
      top5_concentration: 32.1,
      top10_concentration: 52.4,
      metrics: [],
      sectors: [],
      geographic_exposure: [],
      income_risks: [],
      recommendations: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDiversification,
    } as unknown as Response);

    const res = await fetchDiversification();
    expect(res.overall_score).toBe(84);
    expect(res.rating).toBe("Well Diversified");
    expect(res.hhi_index).toBe(480.5);
    expect(res.effective_holdings).toBe(20.8);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/v1/analytics/diversification");
  });

  it("triggerFactoryReset sends POST to /api/v1/system/factory-reset", async () => {
    const mockResetResponse = {
      success: true,
      message: "Database and credentials reset",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResetResponse,
    } as unknown as Response);

    const res = await triggerFactoryReset(true);
    expect(res.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/system/factory-reset",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_credentials: true }),
      })
    );
  });

  it("fetchSyncSettings and updateSyncSettings manage daily sync config", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sync_frequency: "daily" }),
    } as unknown as Response);

    const getRes = await fetchSyncSettings();
    expect(getRes.sync_frequency).toBe("daily");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, sync_frequency: "daily" }),
    } as unknown as Response);

    const postRes = await updateSyncSettings({ sync_frequency: "daily" });
    expect(postRes.success).toBe(true);
    expect(postRes.sync_frequency).toBe("daily");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/sync/settings",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_frequency: "daily" }),
      })
    );
  });

  it("fetchIncomePlanner queries /api/v1/analytics/income-planner", async () => {
    const mockPlanner = {
      monthly_average: 150.0,
      total_annual_income: 1800.0,
      currency: "EUR",
      gap_months_count: 2,
      months: [
        {
          month: "2026-11",
          month_name: "November",
          total_amount: 50.0,
          received_amount: 0.0,
          expected_amount: 50.0,
          is_gap: true,
          gap_amount: 100.0,
          recommendations: [
            {
              ticker: "O",
              name: "Realty Income",
              current_shares: 10,
              current_price: 55.0,
              annual_dividend: 30.0,
              dividend_yield: 5.5,
              payout_frequency: "MONTHLY",
              payout_amount_per_share: 0.25,
              shares_to_fill_gap: 400.0,
              capital_needed: 22000.0,
            },
          ],
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPlanner,
    } as unknown as Response);

    const res = await fetchIncomePlanner();
    expect(res.monthly_average).toBe(150.0);
    expect(res.gap_months_count).toBe(2);
    expect(res.months[0].is_gap).toBe(true);
    expect(res.months[0].recommendations[0].ticker).toBe("O");
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/v1/analytics/income-planner");
  });
});
