import {
  HealthStatus,
  UpdateCheckResult,
  ConnectionsResponse,
  ConnectionTestResult,
  PortfolioSummary,
  HoldingsApiResponse,
  TransactionsApiResponse,
  DividendsApiResponse,
  SyncResult,
  AnalyticsOverview,
  ProjectionsResponse,
  DividendGrowthResponse,
  TaxRulesData,
  NetherlandsTaxData,
} from "../types";

const API_BASE = "/api/v1";

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchUpdateCheck(): Promise<UpdateCheckResult> {
  const res = await fetch(`${API_BASE}/updates`);
  if (!res.ok) {
    throw new Error(`Update check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchConnections(): Promise<ConnectionsResponse> {
  const res = await fetch(`${API_BASE}/connections`);
  if (!res.ok) {
    throw new Error(`Failed to load connections with status ${res.status}`);
  }
  return res.json();
}

export async function saveTrading212Credentials(payload: {
  api_key: string;
  api_secret?: string;
  environment?: string;
}): Promise<{ status: string; message: string; details?: any }> {
  const res = await fetch(`${API_BASE}/credentials/trading212`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to save Trading 212 credentials (${res.status})`);
  }
  return res.json();
}

export async function testTrading212Connection(payload?: {
  api_key?: string;
  api_secret?: string;
  environment?: string;
}): Promise<ConnectionTestResult> {
  const res = await fetch(`${API_BASE}/credentials/trading212/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Trading 212 test failed (${res.status})`);
  }
  return res.json();
}

export async function deleteTrading212Credentials(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/credentials/trading212`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to disconnect Trading 212 (${res.status})`);
  }
  return res.json();
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE}/portfolio`);
  if (!res.ok) {
    throw new Error(`Failed to load portfolio summary (${res.status})`);
  }
  return res.json();
}

export async function fetchHoldings(): Promise<HoldingsApiResponse> {
  const res = await fetch(`${API_BASE}/holdings`);
  if (!res.ok) {
    throw new Error(`Failed to load holdings (${res.status})`);
  }
  return res.json();
}

export async function fetchTransactions(
  limit: number = 50,
  offset: number = 0,
  ticker?: string,
  type?: string
): Promise<TransactionsApiResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (ticker) params.append("ticker", ticker);
  if (type && type !== "ALL") params.append("type", type);

  const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to load transactions (${res.status})`);
  }
  return res.json();
}

export async function fetchDividends(): Promise<DividendsApiResponse> {
  const res = await fetch(`${API_BASE}/dividends`);
  if (!res.ok) {
    throw new Error(`Failed to load received dividends (${res.status})`);
  }
  return res.json();
}

export async function fetchExpectedDividends(): Promise<DividendsApiResponse> {
  const res = await fetch(`${API_BASE}/dividends/expected`);
  if (!res.ok) {
    throw new Error(`Failed to load expected dividends (${res.status})`);
  }
  return res.json();
}

export async function triggerSync(): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/sync`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Sync failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchSyncStatus(): Promise<{
  is_syncing: boolean;
  last_synced?: string | null;
  trading212_status: string;
  trading212_error?: string | null;
  current_step?: number;
  total_steps?: number;
  step_message?: string | null;
}> {
  const res = await fetch(`${API_BASE}/sync/status`);
  if (!res.ok) {
    throw new Error(`Failed to load sync status (${res.status})`);
  }
  return res.json();
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) {
    throw new Error(`Failed to load analytics overview (${res.status})`);
  }
  return res.json();
}

export async function fetchProjections(params?: {
  years?: number;
  dividend_growth_rate?: number;
  dividend_reinvestment?: boolean;
  annual_contribution?: number;
  expected_price_growth?: number;
}): Promise<ProjectionsResponse> {
  const query = new URLSearchParams();
  if (params?.years) query.set("years", params.years.toString());
  if (params?.dividend_growth_rate !== undefined)
    query.set("dividend_growth_rate", params.dividend_growth_rate.toString());
  if (params?.dividend_reinvestment !== undefined)
    query.set("dividend_reinvestment", params.dividend_reinvestment.toString());
  if (params?.annual_contribution !== undefined)
    query.set("annual_contribution", params.annual_contribution.toString());
  if (params?.expected_price_growth !== undefined)
    query.set("expected_price_growth", params.expected_price_growth.toString());

  const qs = query.toString();
  const url = `${API_BASE}/analytics/projections${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load projections (${res.status})`);
  }
  return res.json();
}

export async function fetchDividendGrowth(): Promise<DividendGrowthResponse> {
  const res = await fetch(`${API_BASE}/analytics/growth`);
  if (!res.ok) {
    throw new Error(`Failed to load dividend growth (${res.status})`);
  }
  return res.json();
}

export async function fetchTaxRules(): Promise<TaxRulesData> {
  const res = await fetch(`${API_BASE}/tax/rules`);
  if (!res.ok) {
    throw new Error(`Failed to load tax rules (${res.status})`);
  }
  return res.json();
}

export async function fetchNetherlandsTax(params: {
  year?: number;
  has_fiscal_partner?: boolean;
  investments_override?: number;
  cash_override?: number;
}): Promise<NetherlandsTaxData> {
  const query = new URLSearchParams();
  if (params.year) query.set("year", params.year.toString());
  if (params.has_fiscal_partner !== undefined)
    query.set("has_fiscal_partner", params.has_fiscal_partner.toString());
  if (params.investments_override !== undefined)
    query.set("investments_override", params.investments_override.toString());
  if (params.cash_override !== undefined)
    query.set("cash_override", params.cash_override.toString());

  const qs = query.toString();
  const url = `${API_BASE}/tax/netherlands${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to calculate tax (${res.status})`);
  }
  return res.json();
}

export function getTaxExportUrl(year: number = 2025, hasFiscalPartner: boolean = false): string {
  return `${API_BASE}/tax/netherlands/export?year=${year}&has_fiscal_partner=${hasFiscalPartner}`;
}

export interface CashInterestItem {
  id: number;
  source: string;
  period_start: string;
  period_end: string;
  average_balance: number;
  annual_rate: number;
  interest_earned: number;
  notes?: string | null;
  created_at?: string | null;
}

export interface CashInterestResponse {
  periods: CashInterestItem[];
  total_interest_ytd: number;
}

export async function fetchCashInterest(): Promise<CashInterestResponse> {
  const res = await fetch(`${API_BASE}/data-tools/cash-interest`);
  if (!res.ok) throw new Error(`Failed to load cash interest (${res.status})`);
  return res.json();
}

export async function estimateCashInterest(req: {
  average_balance: number;
  annual_rate_percent: number;
  period_start?: string;
  period_end?: string;
  notes?: string;
}): Promise<CashInterestItem> {
  const res = await fetch(`${API_BASE}/data-tools/cash-interest/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(detail.detail || `Failed (${res.status})`);
  }
  return res.json();
}

export async function createManualHolding(req: {
  ticker: string;
  quantity: number;
  average_price: number;
  name?: string;
  currency?: string;
  sector?: string;
  annual_dividend?: number;
  dividend_yield?: number;
  payout_frequency?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/data-tools/manual-holdings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(detail.detail || `Failed (${res.status})`);
  }
  return res.json();
}

export async function createManualTransaction(req: {
  ticker?: string;
  type: string;
  amount: number;
  currency?: string;
  date?: string;
  quantity?: number;
  price?: number;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/data-tools/manual-transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(detail.detail || `Failed (${res.status})`);
  }
  return res.json();
}

export function getDataToolsExportUrl(dataset: "holdings" | "transactions" | "dividends"): string {
  return `${API_BASE}/data-tools/export.csv?dataset=${dataset}`;
}

export function getExportTransactionsUrl(): string {
  return `${API_BASE}/export/transactions`;
}

export function getExportDividendsUrl(): string {
  return `${API_BASE}/export/dividends`;
}

export function getExportYahooUrl(): string {
  return `${API_BASE}/export/yahoo`;
}

export async function fetchCalendar(params?: {
  year?: number;
  month?: number;
  from_date?: string;
  to_date?: string;
  ticker?: string;
  status?: "RECEIVED" | "EXPECTED";
}): Promise<{
  events: Array<{
    id?: number;
    ticker: string;
    company_name?: string;
    date?: string;
    ex_date?: string;
    payment_date?: string;
    amount: number;
    currency: string;
    status: string;
    source: string;
    updated_at?: string;
  }>;
  total_received: number;
  total_expected: number;
  total_amount: number;
  currency: string;
  count: number;
}> {
  const query = new URLSearchParams();
  if (params?.year) query.set("year", params.year.toString());
  if (params?.month) query.set("month", params.month.toString());
  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);
  if (params?.ticker) query.set("ticker", params.ticker);
  if (params?.status) query.set("status", params.status);

  const qs = query.toString();
  const res = await fetch(`${API_BASE}/calendar${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    throw new Error(`Failed to load calendar events (${res.status})`);
  }
  return res.json();
}

export async function fetchAnalyticsAllocation(): Promise<{
  total_value: number;
  currency: string;
  sectors: Array<{ sector: string; value: number; percentage: number }>;
  top_holdings: Array<{ ticker: string; name: string; value: number; percentage: number }>;
  single_stock_warnings: string[];
  sector_warnings: string[];
}> {
  const res = await fetch(`${API_BASE}/analytics/allocation`);
  if (!res.ok) throw new Error(`Failed to fetch allocation (${res.status})`);
  return res.json();
}

export async function fetchAnalyticsDividends(): Promise<{
  annual_dividend_income: number;
  current_portfolio_yield: number;
  yield_on_cost: number;
  currency: string;
  frequency_breakdown: Array<{ frequency: string; count: number; annual_amount: number; percentage: number }>;
  income_by_holding: Array<{ ticker: string; name: string; annual_dividend: number; yield_percent: number; percentage_of_total_income: number }>;
}> {
  const res = await fetch(`${API_BASE}/analytics/dividends`);
  if (!res.ok) throw new Error(`Failed to fetch dividend analytics (${res.status})`);
  return res.json();
}

export async function fetchAnalyticsValue(): Promise<{
  total_portfolio_value: number;
  holdings_value: number;
  uninvested_cash: number;
  total_invested: number;
  unrealized_pnl: number;
  pnl_percent: number;
  holdings_count: number;
  currency: string;
}> {
  const res = await fetch(`${API_BASE}/analytics/value`);
  if (!res.ok) throw new Error(`Failed to fetch portfolio value analytics (${res.status})`);
  return res.json();
}

export async function fetchTaxSummary(year: number = 2025, hasFiscalPartner: boolean = false): Promise<{
  jurisdiction: string;
  tax_year: number;
  status: string;
  taxable_assets: number;
  tax_free_allowance: number;
  estimated_tax_liability: number;
  withholding_tax_credit: number;
  estimated_net_liability: number;
  is_below_threshold: boolean;
  currency: string;
}> {
  const res = await fetch(`${API_BASE}/tax/summary?year=${year}&has_fiscal_partner=${hasFiscalPartner}`);
  if (!res.ok) throw new Error(`Failed to fetch tax summary (${res.status})`);
  return res.json();
}

export async function importCsv(dataset: "holdings" | "transactions" | "dividends", body: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/data-tools/import.csv?dataset=${dataset}`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(detail.detail || `Failed (${res.status})`);
  }
  return res.json();
}

