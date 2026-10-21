export interface Holding {
  id?: number;
  ticker: string;
  name?: string | null;
  isin?: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
  currency: string;
  fx_rate?: number;
  ppl: number;
  sector?: string | null;
  industry?: string | null;
  dividend_yield?: number;
  annual_dividend?: number;
  payout_frequency?: string | null;
  provider: string;
  external_id?: string | null;
  updated_at?: string;
}

export interface Transaction {
  id?: number;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'CASH' | 'INTEREST';
  ticker?: string | null;
  quantity?: number | null;
  price?: number | null;
  total_amount: number;
  currency: string;
  date: string;
  provider: string;
  external_id?: string | null;
  notes?: string | null;
}

export interface DividendEvent {
  id?: number;
  ticker: string;
  company_name?: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  ex_dividend_date?: string | null;
  status: 'RECEIVED' | 'EXPECTED' | 'FORECAST';
  source: 'TRADING212' | 'YAHOO' | 'YFINANCE' | string;
  external_id?: string | null;
  created_at?: string;
}

export interface PortfolioSummary {
  total_value: number;
  holdings_value: number;
  total_invested: number;
  unrealized_pnl: number;
  pnl_percent: number;
  free_cash: number;
  total_cash: number;
  holdings_count: number;
  account_currency: string;
}

export interface SyncProgress {
  is_syncing: boolean;
  current_step: number;
  total_steps: number;
  step_message: string;
  last_synced?: string | null;
}

export interface Trading212Credentials {
  apiKey: string;
  apiSecret: string;
  environment: 'live' | 'demo';
}

export interface PlannerHoldingRecommendation {
  ticker: string;
  name: string;
  current_shares: number;
  current_price: number;
  annual_dividend: number;
  dividend_yield: number;
  payout_frequency: string | null;
  payout_amount_per_share: number;
  shares_to_fill_gap: number;
  capital_needed: number;
}

export interface MissingDaySuggestion {
  day: number;
  date_str: string;
  ticker: string;
  name: string;
  dividend_yield: number;
  payout_frequency: string;
  payout_amount_per_share?: number;
  current_price?: number;
  is_verified_t212: boolean;
  instrument_type?: 'STOCK' | 'ETF' | string;
  source: 'yfinance_t212_future_investment';
}

export interface PlannerMonth {
  month: string;
  month_name: string;
  total_amount: number;
  received_amount: number;
  expected_amount: number;
  is_gap: boolean;
  gap_amount: number;
  recommendations: PlannerHoldingRecommendation[];
  missing_days_count?: number;
  missing_day_suggestions?: MissingDaySuggestion[];
}

export interface IncomePlannerData {
  monthly_average: number;
  total_annual_income: number;
  currency: string;
  gap_months_count: number;
  months: PlannerMonth[];
}

export type TabKey = 'dashboard' | 'holdings' | 'calendar' | 'planner' | 'history' | 'analytics' | 'settings';
