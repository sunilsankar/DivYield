export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  app: string;
  database: string;
  timestamp: string;
  latencyMs?: number;
}

export interface Holding {
  id: number;
  ticker: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  dividendYield: number;
  annualDividend: number;
  sector: string;
  currency: string;
}

export interface ApiHolding {
  id: number;
  provider: string;
  external_id?: string | null;
  ticker: string;
  name: string;
  isin?: string | null;
  currency: string;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
  unrealized_gain: number;
  unrealized_gain_percent: number;
  sector?: string | null;
  industry?: string | null;
  dividend_yield?: number;
  annual_dividend?: number;
  payout_frequency?: string | null;
  eodhd_symbol?: string | null;
  updated_at?: string | null;
}

export type HoldingItem = ApiHolding;

export interface HoldingsApiResponse {
  holdings: ApiHolding[];
  count: number;
  total_market_value: number;
  currency: string;
}

export interface PortfolioSummary {
  total_value: number;
  holdings_value: number;
  total_invested: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  free_cash: number;
  total_cash: number;
  currency: string;
  holdings_count: number;
  last_synced?: string | null;
}

export interface Transaction {
  id: number;
  date: string;
  ticker: string;
  type: string;
  quantity: number;
  price: number;
  amount: number;
  fees: number;
  currency: string;
  external_id?: string | null;
  source: string;
  notes?: string | null;
  synced_at?: string | null;
}

export interface TransactionsApiResponse {
  transactions: Transaction[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface ApiDividendItem {
  id: number;
  ticker: string;
  company_name?: string | null;
  declaration_date?: string | null;
  ex_dividend_date?: string | null;
  record_date?: string | null;
  payment_date?: string | null;
  amount: number;
  currency: string;
  source: string;
  status: string;
  external_id?: string | null;
  updated_at?: string | null;
}

export interface DividendsApiResponse {
  dividends: ApiDividendItem[];
  total_amount: number;
  currency: string;
  count: number;
}

export interface DividendEvent {
  id: number;
  ticker: string;
  name: string;
  exDate: string;
  payDate: string;
  amountPerShare: number;
  totalAmount: number;
  currency: string;
  status: "RECEIVED" | "EXPECTED";
}

export interface MonthlyDividend {
  month: string;
  received: number;
  expected: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  color: string;
}

export interface Trading212Status {
  configured: boolean;
  environment?: "live" | "demo" | string;
  masked_key?: string | null;
  status: "connected" | "disconnected" | "invalid_credentials" | "access_denied" | "rate_limited" | "error" | "untested";
  last_checked?: string | null;
  error_message?: string | null;
  account_currency?: string | null;
}

export interface EODHDStatus {
  configured: boolean;
  masked_token?: string | null;
  status: "connected" | "disconnected" | "invalid_credentials" | "error" | "untested";
  has_dividend_calendar?: boolean | null;
  last_checked?: string | null;
  error_message?: string | null;
}

export interface ConnectionsResponse {
  trading212: Trading212Status;
  eodhd: EODHDStatus;
}

export interface ConnectionTestResult {
  status: string;
  environment?: string;
  account_currency?: string;
  permissions?: {
    account_data?: boolean;
    metadata?: boolean;
    orders_execute?: boolean;
  };
  has_dividend_calendar?: boolean;
  warning?: string | null;
  message?: string;
}

export interface SyncResult {
  success: boolean;
  status: string;
  message: string;
  holdings_count?: number;
  orders_count?: number;
  transactions_count?: number;
  dividends_count?: number;
  instruments_enriched?: number;
  expected_dividends_added?: number;
  account_currency?: string;
  free_cash?: number;
  total_cash?: number;
  last_synced?: string | null;
  eodhd_status?: string | null;
  error?: string | null;
}

export interface InstrumentMappingItem {
  id: number;
  trading212_identifier: string;
  trading212_ticker?: string | null;
  eodhd_symbol: string;
  confidence: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MappingsResponse {
  mappings: InstrumentMappingItem[];
  count: number;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  type: string;
  country: string;
}

export interface ConcentrationItem {
  name: string;
  ticker: string;
  value: number;
  percentage: number;
  warning: boolean;
}

export interface SectorConcentrationItem {
  sector: string;
  value: number;
  percentage: number;
  count: number;
  warning: boolean;
}

export interface FrequencyItem {
  frequency: string;
  count: number;
  annual_amount: number;
  percentage: number;
}

export interface IncomeByHoldingItem {
  ticker: string;
  name: string;
  annual_dividend: number;
  yield_percent: number;
  percentage_of_total_income: number;
}

export interface AnalyticsOverview {
  total_portfolio_value: number;
  total_invested: number;
  total_unrealized_pnl: number;
  total_unrealized_pnl_percent: number;
  total_annual_dividend: number;
  portfolio_yield: number;
  yield_on_cost: number;
  top1_concentration: number;
  top3_concentration: number;
  top5_concentration: number;
  single_stock_warnings: string[];
  sector_warnings: string[];
  holdings_concentration: ConcentrationItem[];
  sector_breakdown: SectorConcentrationItem[];
  frequency_breakdown: FrequencyItem[];
  income_by_holding: IncomeByHoldingItem[];
}

export interface ProjectionYearItem {
  year: number;
  portfolio_value: number;
  annual_dividend: number;
  monthly_dividend: number;
  cumulative_dividends: number;
  yield_on_cost: number;
}

export interface ProjectionsResponse {
  initial_value: number;
  initial_annual_dividend: number;
  dividend_growth_rate: number;
  dividend_reinvestment: boolean;
  annual_contribution: number;
  years: number;
  projections: ProjectionYearItem[];
}

export interface HistoricalAnnualGrowthItem {
  year: number;
  received_amount: number;
  growth_rate_percent?: number | null;
}

export interface DividendGrowthResponse {
  years: HistoricalAnnualGrowthItem[];
  cagr_percent?: number | null;
}

export interface NetherlandsTaxData {
  jurisdiction: string;
  tax_year: number;
  status: string;
  source_data_date: string;
  assumptions: string[];
  total_assets: number;
  total_investments: number;
  total_cash: number;
  tax_free_allowance: number;
  taxable_assets: number;
  deemed_return_investments: number;
  deemed_return_cash: number;
  total_deemed_return: number;
  effective_return_rate: number;
  taxable_benefit: number;
  tax_rate: number;
  estimated_tax_liability: number;
  withholding_tax_credit: number;
  estimated_net_liability: number;
  is_below_threshold: boolean;
  total_dividends_received?: number;
}

export interface TaxRuleItem {
  year: number;
  savings_rate: number;
  investments_rate: number;
  tax_free_threshold_single: number;
  tax_free_threshold_partner: number;
  tax_rate: number;
  status: string;
}

export interface TaxRulesData {
  jurisdiction: string;
  supported_years: number[];
  rules: TaxRuleItem[];
}

export type NetherlandsTaxResult = NetherlandsTaxData;
export type TaxRulesResponse = TaxRulesData;
export type ProjectionsResult = ProjectionsResponse;
export type DividendGrowthResult = DividendGrowthResponse;

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


