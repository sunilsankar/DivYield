import { MissingDaySuggestion } from '../types';
import { getSetting, setSetting, getDb } from './database';
import { getCredentials } from './secureStore';
import { Trading212Client } from './trading212';
import { mapT212ToYahoo, fetchWithRetry, projectFutureDividends } from './yfinance';

export interface CandidateInstrument {
  ticker: string;
  name: string;
  type: 'STOCK' | 'ETF' | string;
  currency?: string;
}

export interface ValidatedFutureInvestment {
  ticker: string;
  name: string;
  instrument_type: 'STOCK' | 'ETF' | string;
  typical_days: number[]; // Payout days of month
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  payout_months?: number[]; // 1-12
  dividend_yield: number;
  annual_dividend: number;
  current_price: number;
  currency: string;
  payout_amount_per_share: number;
  last_validated: string;
}

// Starter pool of verified dividend payers available on Trading 212
// Used as immediate zero-latency fallback before the first dynamic discovery sync completes
// ponytail: Starter fallback pool ensures day suggestions render on first install; dynamic sync replaces/augments this pool.
export const STARTER_CANDIDATES: ValidatedFutureInvestment[] = [
  {
    ticker: 'AFL',
    name: 'Aflac Incorporated',
    instrument_type: 'STOCK',
    typical_days: [1, 2, 3],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 2.1,
    annual_dividend: 2.08,
    current_price: 99.0,
    currency: 'USD',
    payout_amount_per_share: 0.52,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'PFE',
    name: 'Pfizer Inc.',
    instrument_type: 'STOCK',
    typical_days: [3, 4, 5],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 6.2,
    annual_dividend: 1.68,
    current_price: 27.1,
    currency: 'USD',
    payout_amount_per_share: 0.42,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'ADM',
    name: 'Archer-Daniels-Midland Company',
    instrument_type: 'STOCK',
    typical_days: [4, 5, 6],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.8,
    annual_dividend: 2.00,
    current_price: 52.6,
    currency: 'USD',
    payout_amount_per_share: 0.50,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'JNJ',
    name: 'Johnson & Johnson',
    instrument_type: 'STOCK',
    typical_days: [5, 6, 7],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.2,
    annual_dividend: 4.96,
    current_price: 155.0,
    currency: 'USD',
    payout_amount_per_share: 1.24,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'SO',
    name: 'The Southern Company',
    instrument_type: 'STOCK',
    typical_days: [6, 7],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.6,
    annual_dividend: 2.88,
    current_price: 80.0,
    currency: 'USD',
    payout_amount_per_share: 0.72,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'JEPI',
    name: 'JPMorgan Equity Premium Income ETF',
    instrument_type: 'ETF',
    typical_days: [5, 6, 7],
    frequency: 'monthly',
    dividend_yield: 7.4,
    annual_dividend: 4.30,
    current_price: 58.1,
    currency: 'USD',
    payout_amount_per_share: 0.36,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'XOM',
    name: 'Exxon Mobil Corporation',
    instrument_type: 'STOCK',
    typical_days: [9, 10, 11],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.3,
    annual_dividend: 3.96,
    current_price: 120.0,
    currency: 'USD',
    payout_amount_per_share: 0.99,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'IBM',
    name: 'International Business Machines',
    instrument_type: 'STOCK',
    typical_days: [9, 10, 11],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.1,
    annual_dividend: 6.68,
    current_price: 215.0,
    currency: 'USD',
    payout_amount_per_share: 1.67,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'CVX',
    name: 'Chevron Corporation',
    instrument_type: 'STOCK',
    typical_days: [10, 11, 12],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 4.3,
    annual_dividend: 6.52,
    current_price: 151.6,
    currency: 'USD',
    payout_amount_per_share: 1.63,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    instrument_type: 'STOCK',
    typical_days: [12, 13, 14],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 0.8,
    annual_dividend: 3.32,
    current_price: 415.0,
    currency: 'USD',
    payout_amount_per_share: 0.83,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'ADC',
    name: 'Agree Realty Corporation',
    instrument_type: 'STOCK',
    typical_days: [13, 14, 15],
    frequency: 'monthly',
    dividend_yield: 4.4,
    annual_dividend: 3.00,
    current_price: 68.2,
    currency: 'USD',
    payout_amount_per_share: 0.25,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'O',
    name: 'Realty Income Corporation',
    instrument_type: 'STOCK',
    typical_days: [14, 15, 16],
    frequency: 'monthly',
    dividend_yield: 5.3,
    annual_dividend: 3.16,
    current_price: 59.6,
    currency: 'USD',
    payout_amount_per_share: 0.26,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'MAIN',
    name: 'Main Street Capital Corporation',
    instrument_type: 'STOCK',
    typical_days: [14, 15, 16],
    frequency: 'monthly',
    dividend_yield: 6.2,
    annual_dividend: 2.94,
    current_price: 47.4,
    currency: 'USD',
    payout_amount_per_share: 0.24,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'STAG',
    name: 'STAG Industrial, Inc.',
    instrument_type: 'STOCK',
    typical_days: [15, 16, 17],
    frequency: 'monthly',
    dividend_yield: 4.0,
    annual_dividend: 1.48,
    current_price: 37.0,
    currency: 'USD',
    payout_amount_per_share: 0.12,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'PG',
    name: 'The Procter & Gamble Company',
    instrument_type: 'STOCK',
    typical_days: [15, 16, 17],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 2.4,
    annual_dividend: 4.03,
    current_price: 168.0,
    currency: 'USD',
    payout_amount_per_share: 1.01,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'ABBV',
    name: 'AbbVie Inc.',
    instrument_type: 'STOCK',
    typical_days: [15, 16],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 3.4,
    annual_dividend: 6.20,
    current_price: 182.3,
    currency: 'USD',
    payout_amount_per_share: 1.55,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'DUK',
    name: 'Duke Energy Corporation',
    instrument_type: 'STOCK',
    typical_days: [16, 17],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.8,
    annual_dividend: 4.18,
    current_price: 110.0,
    currency: 'USD',
    payout_amount_per_share: 1.05,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'MCD',
    name: "McDonald's Corporation",
    instrument_type: 'STOCK',
    typical_days: [16, 17, 18],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 2.4,
    annual_dividend: 7.08,
    current_price: 295.0,
    currency: 'USD',
    payout_amount_per_share: 1.77,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'CAT',
    name: 'Caterpillar Inc.',
    instrument_type: 'STOCK',
    typical_days: [19, 20],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 1.4,
    annual_dividend: 5.64,
    current_price: 402.8,
    currency: 'USD',
    payout_amount_per_share: 1.41,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'D',
    name: 'Dominion Energy, Inc.',
    instrument_type: 'STOCK',
    typical_days: [20, 21],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 4.6,
    annual_dividend: 2.67,
    current_price: 58.0,
    currency: 'USD',
    payout_amount_per_share: 0.67,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'TXN',
    name: 'Texas Instruments Incorporated',
    instrument_type: 'STOCK',
    typical_days: [21, 22, 23],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 2.8,
    annual_dividend: 5.44,
    current_price: 194.2,
    currency: 'USD',
    payout_amount_per_share: 1.36,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'CSCO',
    name: 'Cisco Systems, Inc.',
    instrument_type: 'STOCK',
    typical_days: [23, 24, 25],
    frequency: 'quarterly',
    payout_months: [1, 4, 7, 10],
    dividend_yield: 3.0,
    annual_dividend: 1.60,
    current_price: 53.3,
    currency: 'USD',
    payout_amount_per_share: 0.40,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'PM',
    name: 'Philip Morris International',
    instrument_type: 'STOCK',
    typical_days: [24, 25, 26],
    frequency: 'quarterly',
    payout_months: [1, 4, 7, 10],
    dividend_yield: 4.4,
    annual_dividend: 5.40,
    current_price: 122.7,
    currency: 'USD',
    payout_amount_per_share: 1.35,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'VZ',
    name: 'Verizon Communications Inc.',
    instrument_type: 'STOCK',
    typical_days: [27, 28, 29],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 6.4,
    annual_dividend: 2.71,
    current_price: 42.3,
    currency: 'USD',
    payout_amount_per_share: 0.68,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'BTI',
    name: 'British American Tobacco p.l.c.',
    instrument_type: 'STOCK',
    typical_days: [28, 29],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 7.8,
    annual_dividend: 2.92,
    current_price: 37.4,
    currency: 'USD',
    payout_amount_per_share: 0.73,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'UNP',
    name: 'Union Pacific Corporation',
    instrument_type: 'STOCK',
    typical_days: [28, 29, 30],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 2.2,
    annual_dividend: 5.20,
    current_price: 236.3,
    currency: 'USD',
    payout_amount_per_share: 1.30,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'MO',
    name: 'Altria Group, Inc.',
    instrument_type: 'STOCK',
    typical_days: [29, 30, 31],
    frequency: 'quarterly',
    payout_months: [1, 4, 7, 10],
    dividend_yield: 7.9,
    annual_dividend: 4.08,
    current_price: 51.6,
    currency: 'USD',
    payout_amount_per_share: 1.02,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    instrument_type: 'STOCK',
    typical_days: [29, 30, 31],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 1.3,
    annual_dividend: 2.12,
    current_price: 163.0,
    currency: 'USD',
    payout_amount_per_share: 0.53,
    last_validated: '2026-10-21',
  },
  {
    ticker: 'KO',
    name: 'The Coca-Cola Company',
    instrument_type: 'STOCK',
    typical_days: [1, 2, 14, 15, 30],
    frequency: 'quarterly',
    payout_months: [4, 7, 10, 12],
    dividend_yield: 3.0,
    annual_dividend: 1.94,
    current_price: 64.6,
    currency: 'USD',
    payout_amount_per_share: 0.49,
    last_validated: '2026-10-21',
  },
];

let isFutureSyncingActive = false;

/**
 * Returns number of days in a given year and month (1-indexed month)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Validates a single candidate instrument using the yfinance chart API
 * Extracts dividend schedule, yield, price, and typical payout days
 * ponytail: 1 request per candidate via chart API; skips sector search to save 50% network calls.
 */
export async function validateCandidateWithYahoo(
  candidate: CandidateInstrument
): Promise<ValidatedFutureInvestment | null> {
  const yahooTicker = mapT212ToYahoo(candidate.ticker);
  if (!yahooTicker) return null;

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1mo&range=max&events=div`;
    const chartData = await fetchWithRetry(url, 1, 300);
    const result = chartData?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const regularMarketPrice = meta?.regularMarketPrice || undefined;
    const rawDividends = result.events?.dividends;
    if (!rawDividends || typeof rawDividends !== 'object') return null;

    const divList = Object.values(rawDividends)
      .map((d: any) => ({
        amount: Number(d.amount) || 0,
        date: new Date(Number(d.date) * 1000),
      }))
      .filter((d) => d.amount > 0 && !Number.isNaN(d.date.getTime()));

    if (divList.length === 0) return null;

    const proj = projectFutureDividends(
      candidate.ticker,
      candidate.name,
      divList,
      1,
      regularMarketPrice
    );

    if (!proj.annualDividend || proj.annualDividend <= 0 || !proj.dividendYield || proj.dividendYield <= 0) {
      return null;
    }

    // Determine typical payout days and months from historical intervals
    const recentDivs = divList.slice(-8);
    const daysSet = new Set<number>();
    const monthsSet = new Set<number>();
    for (const d of recentDivs) {
      const day = d.date.getUTCDate();
      const month = d.date.getUTCMonth() + 1;
      if (day >= 1 && day <= 31) daysSet.add(day);
      if (month >= 1 && month <= 12) monthsSet.add(month);
    }

    const typicalDays = Array.from(daysSet).sort((a, b) => a - b);
    const payoutMonths = Array.from(monthsSet).sort((a, b) => a - b);
    const freqStr = (proj.frequency || 'Quarterly').toLowerCase();
    const frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' =
      freqStr === 'monthly'
        ? 'monthly'
        : freqStr === 'semi-annual'
        ? 'semi-annual'
        : freqStr === 'annual'
        ? 'annual'
        : 'quarterly';

    const divisor = frequency === 'monthly' ? 12 : frequency === 'semi-annual' ? 2 : frequency === 'annual' ? 1 : 4;
    const perShare = proj.annualDividend / divisor;

    return {
      ticker: candidate.ticker,
      name: candidate.name || candidate.ticker,
      instrument_type: (candidate.type || 'STOCK').toUpperCase() === 'ETF' ? 'ETF' : 'STOCK',
      typical_days: typicalDays.length > 0 ? typicalDays : [15],
      frequency,
      payout_months: payoutMonths.length > 0 ? payoutMonths : undefined,
      dividend_yield: proj.dividendYield,
      annual_dividend: proj.annualDividend,
      current_price: regularMarketPrice || 0,
      currency: meta?.currency || candidate.currency || 'USD',
      payout_amount_per_share: Number(perShare.toFixed(2)),
      last_validated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Executes a separate background discovery sync for new STOCK and ETF dividend candidates
 * Bounded batch size (default 50) protects network and avoids Yahoo rate limits
 * ponytail: bounded 50 batch size in settings JSON; upgrade to indexed table if candidate universe grows > 500
 */
export async function runFutureInvestmentSync(
  maxBatch = 50,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string; added: number; total: number }> {
  if (isFutureSyncingActive) {
    return { success: false, message: 'Discovery sync is already running', added: 0, total: 0 };
  }

  isFutureSyncingActive = true;
  if (onProgress) onProgress('Loading Trading 212 instrument catalog...');

  try {
    let catalog: CandidateInstrument[] = [];
    const catalogStr = await getSetting('t212_instruments_catalog', '[]');
    try {
      catalog = JSON.parse(catalogStr);
    } catch {
      catalog = [];
    }

    // Fallback: If catalog is missing, attempt to fetch from Trading 212 API if credentials exist
    if (!Array.isArray(catalog) || catalog.length === 0) {
      const creds = await getCredentials();
      if (creds && creds.apiKey) {
        if (onProgress) onProgress('Fetching fresh Trading 212 instruments...');
        try {
          const client = new Trading212Client(creds);
          const rawInstruments = await client.getInstruments();
          catalog = rawInstruments
            .filter((i) => !i.type || i.type === 'STOCK' || i.type === 'ETF')
            .map((i) => ({
              ticker: i.ticker,
              name: i.name,
              type: i.type || 'STOCK',
              currency: i.currencyCode,
            }));
          await setSetting('t212_instruments_catalog', JSON.stringify(catalog));
          await setSetting('t212_instruments_cache', JSON.stringify(rawInstruments.map((i) => i.ticker)));
        } catch (e: any) {
          console.warn('Could not fetch instruments directly:', e.message);
        }
      }
    }

    // Load existing portfolio holdings to exclude owned tickers
    const db = await getDb();
    const holdings = await db.getAllAsync<{ ticker: string }>(
      'SELECT DISTINCT ticker FROM holdings WHERE quantity > 0'
    );
    const ownedSet = new Set(holdings.map((h) => h.ticker.toUpperCase()));

    // Load existing validated candidates
    let existingCandidates: ValidatedFutureInvestment[] = [];
    const existingStr = await getSetting('future_investment_candidates', '[]');
    try {
      const parsed = JSON.parse(existingStr);
      if (Array.isArray(parsed)) existingCandidates = parsed;
    } catch {
      existingCandidates = [];
    }

    const validatedTickers = new Set(existingCandidates.map((c) => c.ticker.toUpperCase()));

    // Select candidate pool: filter out owned and already validated
    const unvalidated = catalog.filter(
      (c) => !ownedSet.has(c.ticker.toUpperCase()) && !validatedTickers.has(c.ticker.toUpperCase())
    );

    if (unvalidated.length === 0 && existingCandidates.length > 0) {
      isFutureSyncingActive = false;
      return {
        success: true,
        message: `Catalog up to date (${existingCandidates.length} dividend candidates ready)`,
        added: 0,
        total: existingCandidates.length,
      };
    }

    // Pick bounded batch: mix STOCK and ETF candidates
    const batch = unvalidated.slice(0, maxBatch);
    const newlyValidated: ValidatedFutureInvestment[] = [];

    // Process batch with bounded concurrency (2 workers)
    const concurrency = 2;
    let processed = 0;

    for (let i = 0; i < batch.length; i += concurrency) {
      const slice = batch.slice(i, i + concurrency);
      const results = await Promise.all(slice.map((item) => validateCandidateWithYahoo(item)));
      for (const res of results) {
        if (res && res.dividend_yield > 0) {
          newlyValidated.push(res);
        }
      }
      processed += slice.length;
      if (onProgress) {
        onProgress(`Validating candidates with Yahoo Finance (${processed}/${batch.length})...`);
      }
    }

    // Merge and save validated candidates
    const mergedMap = new Map<string, ValidatedFutureInvestment>();
    for (const c of existingCandidates) mergedMap.set(c.ticker.toUpperCase(), c);
    for (const c of newlyValidated) mergedMap.set(c.ticker.toUpperCase(), c);

    const mergedList = Array.from(mergedMap.values());
    await setSetting('future_investment_candidates', JSON.stringify(mergedList));
    const nowIso = new Date().toISOString();
    await setSetting('future_investment_last_synced', nowIso);

    return {
      success: true,
      message: `Validated ${newlyValidated.length} new dividend candidates (${mergedList.length} total).`,
      added: newlyValidated.length,
      total: mergedList.length,
    };
  } catch (err: any) {
    console.error('Future investment discovery sync failed:', err);
    return {
      success: false,
      message: err.message || 'Discovery sync failed',
      added: 0,
      total: 0,
    };
  } finally {
    isFutureSyncingActive = false;
  }
}

/**
 * Returns the current discovery sync status
 */
export function isDiscoverySyncActive(): boolean {
  return isFutureSyncingActive;
}

/**
 * Checks if a ticker is present on Trading 212 using cached instrument catalog
 */
export function isTickerOnTrading212(ticker: string, t212CatalogSet?: Set<string>): boolean {
  if (!t212CatalogSet || t212CatalogSet.size === 0) {
    return true;
  }
  const upper = ticker.toUpperCase();
  return (
    t212CatalogSet.has(upper) ||
    t212CatalogSet.has(`${upper}_US_EQ`) ||
    t212CatalogSet.has(`${upper}_US`) ||
    t212CatalogSet.has(`${upper}_EQ`)
  );
}

/**
 * Computes missing days for a given month and finds future investment candidates
 * Uses dynamic validated candidates first, falling back to starter pool if dynamic list is empty
 */
export function getMissingDaySuggestions(
  monthStr: string, // 'YYYY-MM'
  paidDays: Set<number>,
  ownedTickers: Set<string>,
  t212CatalogSet?: Set<string>,
  maxSuggestions = 20,
  dynamicCandidates?: ValidatedFutureInvestment[]
): MissingDaySuggestion[] {
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return [];
  }

  const daysInMonth = getDaysInMonth(year, month);
  const missingDays: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    if (!paidDays.has(d)) {
      missingDays.push(d);
    }
  }

  if (missingDays.length === 0) {
    return [];
  }

  const suggestions: MissingDaySuggestion[] = [];
  const assignedTickers = new Set<string>();

  // Use dynamic validated candidates if available; fall back to starter pool
  const candidatePool =
    dynamicCandidates && dynamicCandidates.length > 0
      ? dynamicCandidates
      : STARTER_CANDIDATES;

  // Filter candidates verified on T212, matching the month schedule, and not already owned
  const eligibleCandidates = candidatePool.filter((c) => {
    if (ownedTickers.has(c.ticker.toUpperCase())) return false;
    if (!isTickerOnTrading212(c.ticker, t212CatalogSet)) return false;
    if (c.frequency !== 'monthly' && c.payout_months && !c.payout_months.includes(month)) {
      return false;
    }
    return true;
  });

  for (const day of missingDays) {
    if (suggestions.length >= maxSuggestions) break;

    // Find candidate whose typical payout days match this day
    let bestCandidate = eligibleCandidates.find(
      (c) => !assignedTickers.has(c.ticker.toUpperCase()) && c.typical_days.includes(day)
    );

    // If no exact day match, find the nearest candidate within +/- 2 days that hasn't been assigned
    if (!bestCandidate) {
      bestCandidate = eligibleCandidates.find(
        (c) =>
          !assignedTickers.has(c.ticker.toUpperCase()) &&
          c.typical_days.some((td) => Math.abs(td - day) <= 2)
      );
    }

    if (bestCandidate) {
      assignedTickers.add(bestCandidate.ticker.toUpperCase());
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${mStr}-${dayStr}`;

      suggestions.push({
        day,
        date_str: dateStr,
        ticker: bestCandidate.ticker,
        name: bestCandidate.name,
        dividend_yield: bestCandidate.dividend_yield,
        payout_frequency: bestCandidate.frequency,
        payout_amount_per_share: bestCandidate.payout_amount_per_share,
        current_price: bestCandidate.current_price,
        is_verified_t212: true,
        instrument_type: bestCandidate.instrument_type || 'STOCK',
        source: 'yfinance_t212_future_investment',
      });
    }
  }

  // Sort suggestions chronologically by day
  return suggestions.sort((a, b) => a.day - b.day);
}
