// Yahoo Finance client for mobile (rate-limited, no API key required)

export interface YahooDividendProjection {
  ticker: string;
  companyName: string;
  paymentDate: string; // YYYY-MM-DD
  amountPerShare: number;
  projectedTotal: number;
  frequency: string; // 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual'
}

export interface YahooEnrichmentResult {
  ticker: string;
  yahooTicker: string;
  sector?: string;
  industry?: string;
  regularMarketPrice?: number;
  dividendYield?: number;
  annualDividend?: number;
  payoutFrequency?: string;
  futureDividends: YahooDividendProjection[];
}

// Map Trading 212 ticker format to Yahoo Finance ticker
export function mapT212ToYahoo(ticker: string): string {
  if (!ticker) return '';
  let t = ticker.trim().toUpperCase();

  // Common overrides
  const overrides: Record<string, string> = {
    FB: 'META',
    GOOG: 'GOOGL',
  };
  if (overrides[t]) return overrides[t];

  // Strip exchange suffix if formatted like TICKER_US, TICKER_NL, etc.
  if (t.includes('_')) {
    const [sym, exch] = t.split('_');
    const suffixMap: Record<string, string> = {
      US: '',
      NL: '.AS',
      UK: '.L',
      GB: '.L',
      DE: '.DE',
      FR: '.PA',
      ES: '.MC',
      IT: '.MI',
      CH: '.SW',
    };
    const suffix = suffixMap[exch] ?? '';
    return `${sym}${suffix}`;
  }

  // T212 often uses lowercase trailing letter for exchange: e.g. ASMLa -> ASML.AS
  const raw = ticker.trim();
  const lastChar = raw.slice(-1);
  const base = raw.slice(0, -1).toUpperCase();

  if (lastChar === 'a' && base.length >= 2) return `${base}.AS`;
  if (lastChar === 'l' && base.length >= 2) return `${base}.L`;
  if (lastChar === 'd' && base.length >= 2) return `${base}.DE`;
  if (lastChar === 'p' && base.length >= 2) return `${base}.PA`;
  if (lastChar === 'e' && base.length >= 2) return `${base}.MC`;

  return t;
}

// Rate limiter: delay between external requests to avoid 429
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 2, delayMs = 350): Promise<any> {
  // ponytail: in-memory pacing lock, fine for sequential sync on mobile
  await delay(delayMs);
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
          Accept: 'application/json',
        },
      });

      if (res.status === 429) {
        if (i < retries) {
          await delay(1200 * (i + 1));
          continue;
        }
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (i < retries) await delay(800 * (i + 1));
    }
  }
  return null;
}

// Fetch Sector and Industry via search API
export async function fetchSectorIndustry(yahooTicker: string): Promise<{ sector?: string; industry?: string }> {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooTicker)}`;
    const data = await fetchWithRetry(url, 1, 250);
    const quote = data?.quotes?.find((q: any) => q.symbol === yahooTicker || q.symbol?.startsWith(yahooTicker)) || data?.quotes?.[0];
    return {
      sector: quote?.sector || undefined,
      industry: quote?.industry || undefined,
    };
  } catch {
    return {};
  }
}

export function projectFutureDividends(
  t212Ticker: string,
  companyName: string,
  divList: { amount: number; date: Date }[],
  shares: number = 0,
  regularMarketPrice?: number
): {
  futureDividends: YahooDividendProjection[];
  frequency: string;
  annualDividend?: number;
  dividendYield?: number;
} {
  const futureDividends: YahooDividendProjection[] = [];
  let frequency = 'Quarterly';
  let annualDividend: number | undefined = undefined;
  let dividendYield: number | undefined = undefined;

  if (!divList || divList.length === 0) {
    return { futureDividends, frequency, annualDividend, dividendYield };
  }

  const sorted = [...divList].sort((a, b) => a.date.getTime() - b.date.getTime());
  const lastDiv = sorted[sorted.length - 1];
  const lastAmount = lastDiv.amount;

  // Determine payout frequency from historical intervals
  if (sorted.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diffDays = Math.round((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 10) intervals.push(diffDays);
    }
    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval <= 45) frequency = 'Monthly';
      else if (avgInterval <= 120) frequency = 'Quarterly';
      else if (avgInterval <= 240) frequency = 'Semi-Annual';
      else frequency = 'Annual';
    }
  }

  const paymentsPerYear = frequency === 'Monthly' ? 12 : frequency === 'Quarterly' ? 4 : frequency === 'Semi-Annual' ? 2 : 1;
  annualDividend = lastAmount * paymentsPerYear;
  if (regularMarketPrice && regularMarketPrice > 0) {
    dividendYield = Number(((annualDividend / regularMarketPrice) * 100).toFixed(2));
  }

  // Project next 12 months of dividends
  const stepMonths = 12 / paymentsPerYear;
  const now = new Date();
  let nextDate = new Date(lastDiv.date);

  // Advance to the next future date
  while (nextDate <= now) {
    nextDate.setMonth(nextDate.getMonth() + stepMonths);
  }

  const oneYearAhead = new Date();
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

  while (nextDate <= oneYearAhead) {
    const dateStr = nextDate.toISOString().split('T')[0];
    futureDividends.push({
      ticker: t212Ticker,
      companyName: companyName || t212Ticker,
      paymentDate: dateStr,
      amountPerShare: lastAmount,
      projectedTotal: Number((lastAmount * (shares > 0 ? shares : 1)).toFixed(2)),
      frequency,
    });
    nextDate = new Date(nextDate);
    nextDate.setMonth(nextDate.getMonth() + stepMonths);
  }

  return { futureDividends, frequency, annualDividend, dividendYield };
}

// Fetch Dividend History and project upcoming dividends for the next 12 months
export async function enrichInstrument(
  t212Ticker: string,
  companyName?: string | null,
  shares: number = 0
): Promise<YahooEnrichmentResult | null> {
  const yahooTicker = mapT212ToYahoo(t212Ticker);
  if (!yahooTicker) return null;

  try {
    const [secInd, chartData] = await Promise.all([
      fetchSectorIndustry(yahooTicker),
      fetchWithRetry(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1mo&range=2y&events=div`,
        2,
        300
      ),
    ]);

    const result = chartData?.chart?.result?.[0];
    const meta = result?.meta;
    const regularMarketPrice = meta?.regularMarketPrice || undefined;

    const rawDividends = result?.events?.dividends;
    let divProjections: YahooDividendProjection[] = [];
    let frequency = 'Quarterly';
    let annualDividend: number | undefined = undefined;
    let dividendYield: number | undefined = undefined;

    if (rawDividends && typeof rawDividends === 'object') {
      const divList = Object.values(rawDividends)
        .map((d: any) => ({
          amount: Number(d.amount) || 0,
          date: new Date(Number(d.date) * 1000),
        }));

      const proj = projectFutureDividends(
        t212Ticker,
        companyName || t212Ticker,
        divList,
        shares,
        regularMarketPrice
      );
      divProjections = proj.futureDividends;
      frequency = proj.frequency;
      annualDividend = proj.annualDividend;
      dividendYield = proj.dividendYield;
    }

    return {
      ticker: t212Ticker,
      yahooTicker,
      sector: secInd?.sector,
      industry: secInd?.industry,
      regularMarketPrice,
      dividendYield,
      annualDividend,
      payoutFrequency: frequency,
      futureDividends: divProjections,
    };
  } catch (err) {
    console.warn(`[yfinance] Failed to enrich ${t212Ticker}:`, err);
    return null;
  }
}
