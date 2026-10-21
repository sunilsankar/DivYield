import { MissingDaySuggestion } from '../types';

export interface DividendStockCandidate {
  ticker: string;
  name: string;
  typical_days: number[]; // Payout days of month
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  payout_months?: number[]; // 1-12; undefined means all months (e.g. monthly)
  dividend_yield: number; // e.g. 5.2 for 5.2%
  annual_dividend: number;
  current_price: number;
  currency: string;
  is_verified_t212: boolean;
}

// Curated universe of high-quality dividend payers available on Trading 212
// Covers early, mid, and late calendar days across monthly and quarterly schedules
// ponytail: Curated universe provides instant offline validation; yfinance refresh updates yields asynchronously without blocking UI.
export const VERIFIED_DIVIDEND_CANDIDATES: DividendStockCandidate[] = [
  // Early Month (Days 1 - 7)
  {
    ticker: 'AFL',
    name: 'Aflac Incorporated',
    typical_days: [1, 2, 3],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 2.1,
    annual_dividend: 2.08,
    current_price: 99.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'PFE',
    name: 'Pfizer Inc.',
    typical_days: [3, 4, 5],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 6.2,
    annual_dividend: 1.68,
    current_price: 27.1,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'ADM',
    name: 'Archer-Daniels-Midland Company',
    typical_days: [4, 5, 6],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.8,
    annual_dividend: 2.00,
    current_price: 52.6,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'JNJ',
    name: 'Johnson & Johnson',
    typical_days: [5, 6, 7],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.2,
    annual_dividend: 4.96,
    current_price: 155.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'SO',
    name: 'The Southern Company',
    typical_days: [6, 7],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.6,
    annual_dividend: 2.88,
    current_price: 80.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'JEPI',
    name: 'JPMorgan Equity Premium Income ETF',
    typical_days: [5, 6, 7],
    frequency: 'monthly',
    dividend_yield: 7.4,
    annual_dividend: 4.30,
    current_price: 58.1,
    currency: 'USD',
    is_verified_t212: true,
  },

  // Mid-Early (Days 8 - 14)
  {
    ticker: 'XOM',
    name: 'Exxon Mobil Corporation',
    typical_days: [9, 10, 11],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.3,
    annual_dividend: 3.96,
    current_price: 120.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'IBM',
    name: 'International Business Machines',
    typical_days: [9, 10, 11],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.1,
    annual_dividend: 6.68,
    current_price: 215.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'CVX',
    name: 'Chevron Corporation',
    typical_days: [10, 11, 12],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 4.3,
    annual_dividend: 6.52,
    current_price: 151.6,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    typical_days: [12, 13, 14],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 0.8,
    annual_dividend: 3.32,
    current_price: 415.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'ADC',
    name: 'Agree Realty Corporation',
    typical_days: [13, 14, 15],
    frequency: 'monthly',
    dividend_yield: 4.4,
    annual_dividend: 3.00,
    current_price: 68.2,
    currency: 'USD',
    is_verified_t212: true,
  },

  // Mid Month (Days 15 - 20)
  {
    ticker: 'O',
    name: 'Realty Income Corporation',
    typical_days: [14, 15, 16],
    frequency: 'monthly',
    dividend_yield: 5.3,
    annual_dividend: 3.16,
    current_price: 59.6,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'MAIN',
    name: 'Main Street Capital Corporation',
    typical_days: [14, 15, 16],
    frequency: 'monthly',
    dividend_yield: 6.2,
    annual_dividend: 2.94,
    current_price: 47.4,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'STAG',
    name: 'STAG Industrial, Inc.',
    typical_days: [15, 16, 17],
    frequency: 'monthly',
    dividend_yield: 4.0,
    annual_dividend: 1.48,
    current_price: 37.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'PG',
    name: 'The Procter & Gamble Company',
    typical_days: [15, 16, 17],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 2.4,
    annual_dividend: 4.03,
    current_price: 168.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'ABBV',
    name: 'AbbVie Inc.',
    typical_days: [15, 16],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 3.4,
    annual_dividend: 6.20,
    current_price: 182.3,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'DUK',
    name: 'Duke Energy Corporation',
    typical_days: [16, 17],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 3.8,
    annual_dividend: 4.18,
    current_price: 110.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'MCD',
    name: "McDonald's Corporation",
    typical_days: [16, 17, 18],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 2.4,
    annual_dividend: 7.08,
    current_price: 295.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'CAT',
    name: 'Caterpillar Inc.',
    typical_days: [19, 20],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 1.4,
    annual_dividend: 5.64,
    current_price: 402.8,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'D',
    name: 'Dominion Energy, Inc.',
    typical_days: [20, 21],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 4.6,
    annual_dividend: 2.67,
    current_price: 58.0,
    currency: 'USD',
    is_verified_t212: true,
  },

  // Mid-Late (Days 21 - 26)
  {
    ticker: 'TXN',
    name: 'Texas Instruments Incorporated',
    typical_days: [21, 22, 23],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 2.8,
    annual_dividend: 5.44,
    current_price: 194.2,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'CSCO',
    name: 'Cisco Systems, Inc.',
    typical_days: [23, 24, 25],
    frequency: 'quarterly',
    payout_months: [1, 4, 7, 10],
    dividend_yield: 3.0,
    annual_dividend: 1.60,
    current_price: 53.3,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'PM',
    name: 'Philip Morris International',
    typical_days: [24, 25, 26],
    frequency: 'quarterly',
    payout_months: [1, 4, 7, 10],
    dividend_yield: 4.4,
    annual_dividend: 5.40,
    current_price: 122.7,
    currency: 'USD',
    is_verified_t212: true,
  },

  // Late Month (Days 27 - 31)
  {
    ticker: 'VZ',
    name: 'Verizon Communications Inc.',
    typical_days: [27, 28, 29],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 6.4,
    annual_dividend: 2.71,
    current_price: 42.3,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'BTI',
    name: 'British American Tobacco p.l.c.',
    typical_days: [28, 29],
    frequency: 'quarterly',
    payout_months: [2, 5, 8, 11],
    dividend_yield: 7.8,
    annual_dividend: 2.92,
    current_price: 37.4,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'UNP',
    name: 'Union Pacific Corporation',
    typical_days: [28, 29, 30],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 2.2,
    annual_dividend: 5.20,
    current_price: 236.3,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'MO',
    name: 'Altria Group, Inc.',
    typical_days: [29, 30, 31],
    frequency: 'quarterly',
    payout_months: [1, 4, 7, 10],
    dividend_yield: 7.9,
    annual_dividend: 4.08,
    current_price: 51.6,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    typical_days: [29, 30, 31],
    frequency: 'quarterly',
    payout_months: [3, 6, 9, 12],
    dividend_yield: 1.3,
    annual_dividend: 2.12,
    current_price: 163.0,
    currency: 'USD',
    is_verified_t212: true,
  },
  {
    ticker: 'KO',
    name: 'The Coca-Cola Company',
    typical_days: [1, 2, 14, 15, 30],
    frequency: 'quarterly',
    payout_months: [4, 7, 10, 12],
    dividend_yield: 3.0,
    annual_dividend: 1.94,
    current_price: 64.6,
    currency: 'USD',
    is_verified_t212: true,
  },
];

/**
 * Returns number of days in a given year and month (1-indexed month)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Checks if a ticker is present on Trading 212 using cached instrument catalog
 */
export function isTickerOnTrading212(ticker: string, t212CatalogSet?: Set<string>): boolean {
  if (!t212CatalogSet || t212CatalogSet.size === 0) {
    // If cache not yet populated, all curated candidates are verified Trading 212 stocks
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
 */
export function getMissingDaySuggestions(
  monthStr: string, // 'YYYY-MM'
  paidDays: Set<number>,
  ownedTickers: Set<string>,
  t212CatalogSet?: Set<string>,
  maxSuggestions = 20
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

  // Filter candidates verified on T212, matching the month schedule, and not already owned
  const eligibleCandidates = VERIFIED_DIVIDEND_CANDIDATES.filter((c) => {
    if (ownedTickers.has(c.ticker)) return false;
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
      (c) => !assignedTickers.has(c.ticker) && c.typical_days.includes(day)
    );

    // If no exact day match, find the nearest candidate within +/- 2 days that hasn't been assigned
    if (!bestCandidate) {
      bestCandidate = eligibleCandidates.find(
        (c) =>
          !assignedTickers.has(c.ticker) &&
          c.typical_days.some((td) => Math.abs(td - day) <= 2)
      );
    }

    if (bestCandidate) {
      assignedTickers.add(bestCandidate.ticker);
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${mStr}-${dayStr}`;
      const perShare =
        bestCandidate.annual_dividend / (bestCandidate.frequency === 'monthly' ? 12 : 4);

      suggestions.push({
        day,
        date_str: dateStr,
        ticker: bestCandidate.ticker,
        name: bestCandidate.name,
        dividend_yield: bestCandidate.dividend_yield,
        payout_frequency: bestCandidate.frequency,
        payout_amount_per_share: Number(perShare.toFixed(2)),
        current_price: bestCandidate.current_price,
        is_verified_t212: true,
        source: 'yfinance_t212_future_investment',
      });
    }
  }

  // Sort suggestions chronologically by day
  return suggestions.sort((a, b) => a.day - b.day);
}
