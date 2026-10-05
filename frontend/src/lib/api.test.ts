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
});
