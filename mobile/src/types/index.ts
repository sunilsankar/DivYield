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

export type TabKey = 'dashboard' | 'holdings' | 'calendar' | 'analytics' | 'settings';
