import * as SQLite from 'expo-sqlite';
import {
  DividendEvent,
  Holding,
  IncomePlannerData,
  PlannerHoldingRecommendation,
  PlannerMonth,
  PortfolioSummary,
  Transaction,
} from '../types';
import {
  getMissingDaySuggestions,
  getDaysInMonth,
  ValidatedFutureInvestment,
} from './futureInvestments';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync('divyield.db');
        await initDatabase(db);
        dbInstance = db;
        return db;
      } catch (err) {
        dbInitPromise = null;
        throw err;
      }
    })();
  }
  return dbInitPromise;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      name TEXT,
      isin TEXT,
      quantity REAL NOT NULL,
      average_price REAL NOT NULL,
      current_price REAL NOT NULL,
      market_value REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      fx_rate REAL DEFAULT 1.0,
      ppl REAL DEFAULT 0,
      sector TEXT,
      industry TEXT,
      dividend_yield REAL DEFAULT 0,
      annual_dividend REAL DEFAULT 0,
      payout_frequency TEXT,
      provider TEXT NOT NULL DEFAULT 'TRADING212',
      external_id TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, external_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      ticker TEXT,
      quantity REAL,
      price REAL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      date TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'TRADING212',
      external_id TEXT UNIQUE,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS dividend_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      payment_date TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      external_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source, external_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      items_synced INTEGER DEFAULT 0,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);
    CREATE INDEX IF NOT EXISTS idx_dividend_events_status_date ON dividend_events(status, payment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_holdings_qty_market_val ON holdings(quantity, market_value DESC);
  `);
}

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    key,
    value
  );
}

export const saveSetting = setSetting;

export async function tryAcquireSyncLock(leaseMs: number = 300000): Promise<boolean> {
  // ponytail: settings table timestamp lease; upgrade to dedicated lock table if concurrent workers expand
  const db = await getDb();
  const now = Date.now();
  let acquired = false;
  await db.withExclusiveTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'sync_lock_until'"
    );
    const lockUntil = row ? parseInt(row.value, 10) : 0;
    if (lockUntil > now) {
      acquired = false;
      return;
    }
    const nextLock = String(now + leaseMs);
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES ('sync_lock_until', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      nextLock
    );
    acquired = true;
  });
  return acquired;
}

export async function releaseSyncLock(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES ('sync_lock_until', '0', CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = '0', updated_at = CURRENT_TIMESTAMP`
  );
}

export async function isSyncLocked(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'sync_lock_until'"
  );
  const lockUntil = row ? parseInt(row.value, 10) : 0;
  return lockUntil > Date.now();
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const db = await getDb();
  const holdingsRow = await db.getFirstAsync<{
    total_val: number | null;
    total_inv: number | null;
    total_ppl: number | null;
    cnt: number | null;
  }>(`
    SELECT
      SUM(market_value) as total_val,
      SUM(quantity * average_price) as total_inv,
      SUM(ppl) as total_ppl,
      COUNT(*) as cnt
    FROM holdings
    WHERE quantity > 0
  `);

  const freeCashStr = await getSetting('account_free_cash', '0');
  const totalCashStr = await getSetting('account_total_cash', '0');
  const currency = await getSetting('account_currency', 'EUR');

  const holdingsVal = holdingsRow?.total_val || 0;
  const totalInv = holdingsRow?.total_inv || 0;
  const ppl = holdingsRow?.total_ppl || 0;
  const freeCash = parseFloat(freeCashStr) || 0;
  const totalCash = parseFloat(totalCashStr) || freeCash;
  // ponytail: T212 cash.total is authoritative account valuation (cash + investments).
  // Use totalCash if reported > 0, otherwise fall back to holdingsVal + freeCash.
  const totalValue = totalCash > 0 ? totalCash : holdingsVal + freeCash;
  const pnlPercent = totalInv > 0 ? (ppl / totalInv) * 100 : 0;

  return {
    total_value: Math.round(totalValue * 100) / 100,
    holdings_value: Math.round(holdingsVal * 100) / 100,
    total_invested: Math.round(totalInv * 100) / 100,
    unrealized_pnl: Math.round(ppl * 100) / 100,
    pnl_percent: Math.round(pnlPercent * 100) / 100,
    free_cash: Math.round(freeCash * 100) / 100,
    total_cash: Math.round(totalCash * 100) / 100,
    holdings_count: holdingsRow?.cnt || 0,
    account_currency: currency || 'EUR',
  };
}

export async function getHoldings(): Promise<Holding[]> {
  const db = await getDb();
  return db.getAllAsync<Holding>(`
    SELECT * FROM holdings
    WHERE quantity > 0
    ORDER BY market_value DESC
  `);
}

export async function getTransactions(limit: number = 100): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(`
    SELECT * FROM transactions
    ORDER BY date DESC
    LIMIT ?
  `, limit);
}

export async function getStats(): Promise<{ holdings: number; dividends: number; transactions: number }> {
  const db = await getDb();
  const hRow = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM holdings WHERE quantity > 0');
  const dRow = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM dividend_events');
  const tRow = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM transactions');
  return {
    holdings: hRow?.cnt || 0,
    dividends: dRow?.cnt || 0,
    transactions: tRow?.cnt || 0,
  };
}

export async function getDividends(): Promise<DividendEvent[]> {
  const db = await getDb();
  return db.getAllAsync<DividendEvent>(`
    SELECT
      de.id,
      de.ticker,
      h.name as company_name,
      de.amount,
      de.currency,
      de.payment_date,
      de.status,
      de.source,
      de.external_id,
      de.created_at
    FROM dividend_events de
    LEFT JOIN holdings h ON de.ticker = h.ticker
    ORDER BY de.payment_date DESC
  `);
}

export async function getMonthlyDividends(year?: number): Promise<{ month: string; received: number; forecast: number }[]> {
  const targetYear = year || new Date().getFullYear();
  const db = await getDb();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result = months.map(m => ({ month: m, received: 0, forecast: 0 }));

  const rows = await db.getAllAsync<{ month_num: string; status: string; total: number }>(`
    SELECT
      strftime('%m', payment_date) as month_num,
      status,
      SUM(amount) as total
    FROM dividend_events
    WHERE strftime('%Y', payment_date) = ?
    GROUP BY strftime('%m', payment_date), status
  `, String(targetYear));

  for (const row of rows) {
    const idx = parseInt(row.month_num, 10) - 1;
    if (idx >= 0 && idx < 12) {
      if (row.status === 'RECEIVED') {
        result[idx].received = Math.round(row.total * 100) / 100;
      } else {
        result[idx].forecast = Math.round(row.total * 100) / 100;
      }
    }
  }

  return result;
}

export async function batchUpsertHoldings(holdings: Holding[]): Promise<void> {
  const db = await getDb();

  // Delete stale holdings not in current set
  const currentTickers = holdings.map(h => h.ticker);
  if (currentTickers.length > 0) {
    const placeholders = currentTickers.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM holdings WHERE ticker NOT IN (${placeholders})`, ...currentTickers);
  }

  if (holdings.length === 0) return;

  const insertSql = `
    INSERT INTO holdings (
      ticker, name, isin, quantity, average_price, current_price,
      market_value, currency, fx_rate, ppl, sector, industry,
      dividend_yield, annual_dividend, payout_frequency, provider, external_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(provider, external_id) DO UPDATE SET
      name = excluded.name,
      isin = excluded.isin,
      quantity = excluded.quantity,
      average_price = excluded.average_price,
      current_price = excluded.current_price,
      market_value = excluded.market_value,
      currency = excluded.currency,
      fx_rate = excluded.fx_rate,
      ppl = excluded.ppl,
      sector = COALESCE(excluded.sector, holdings.sector),
      industry = COALESCE(excluded.industry, holdings.industry),
      dividend_yield = COALESCE(excluded.dividend_yield, holdings.dividend_yield),
      annual_dividend = COALESCE(excluded.annual_dividend, holdings.annual_dividend),
      payout_frequency = COALESCE(excluded.payout_frequency, holdings.payout_frequency),
      updated_at = CURRENT_TIMESTAMP
  `;

  const statement = await db.prepareAsync(insertSql);
  try {
    await db.withExclusiveTransactionAsync(async () => {
      for (const h of holdings) {
        await statement.executeAsync([
          h.ticker,
          h.name ?? null,
          h.isin ?? null,
          h.quantity ?? 0,
          h.average_price ?? 0,
          h.current_price ?? 0,
          h.market_value ?? 0,
          h.currency ?? 'EUR',
          h.fx_rate ?? 1.0,
          h.ppl ?? 0,
          h.sector ?? null,
          h.industry ?? null,
          h.dividend_yield ?? 0,
          h.annual_dividend ?? 0,
          h.payout_frequency ?? null,
          h.provider ?? 'TRADING212',
          h.external_id ?? h.ticker,
        ]);
      }
    });
  } finally {
    await statement.finalizeAsync();
  }
}

export async function batchUpsertTransactions(txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return;
  const db = await getDb();
  const insertSql = `
    INSERT INTO transactions (
      type, ticker, quantity, price, total_amount, currency, date, provider, external_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id) DO UPDATE SET
      type = excluded.type,
      ticker = excluded.ticker,
      quantity = excluded.quantity,
      price = excluded.price,
      total_amount = excluded.total_amount,
      currency = excluded.currency,
      date = excluded.date,
      notes = excluded.notes
  `;

  const statement = await db.prepareAsync(insertSql);
  try {
    await db.withExclusiveTransactionAsync(async () => {
      for (const tx of txs) {
        await statement.executeAsync([
          tx.type,
          tx.ticker ?? null,
          tx.quantity ?? null,
          tx.price ?? null,
          tx.total_amount ?? 0,
          tx.currency ?? 'EUR',
          tx.date,
          tx.provider ?? 'TRADING212',
          tx.external_id ?? null,
          tx.notes ?? null,
        ]);
      }
    });
  } finally {
    await statement.finalizeAsync();
  }
}

export async function batchUpsertDividends(divs: DividendEvent[]): Promise<void> {
  if (divs.length === 0) return;
  const db = await getDb();
  const insertSql = `
    INSERT INTO dividend_events (
      ticker, amount, currency, payment_date, status, source, external_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(source, external_id) DO UPDATE SET
      amount = excluded.amount,
      currency = excluded.currency,
      payment_date = excluded.payment_date,
      status = excluded.status
  `;

  const statement = await db.prepareAsync(insertSql);
  try {
    await db.withExclusiveTransactionAsync(async () => {
      for (const d of divs) {
        await statement.executeAsync([
          d.ticker,
          d.amount ?? 0,
          d.currency ?? 'EUR',
          d.payment_date,
          d.status ?? 'RECEIVED',
          d.source ?? 'TRADING212',
          d.external_id ?? `${d.ticker}_${d.payment_date}`,
        ]);
      }
    });
  } finally {
    await statement.finalizeAsync();
  }
}

export async function updateHoldingEnrichment(
  ticker: string,
  enrichment: {
    sector?: string;
    industry?: string;
    dividend_yield?: number;
    annual_dividend?: number;
    payout_frequency?: string;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(`
    UPDATE holdings
    SET
      sector = COALESCE(?, sector),
      industry = COALESCE(?, industry),
      dividend_yield = COALESCE(?, dividend_yield),
      annual_dividend = COALESCE(?, annual_dividend),
      payout_frequency = COALESCE(?, payout_frequency),
      updated_at = CURRENT_TIMESTAMP
    WHERE ticker = ?
  `,
    enrichment.sector ?? null,
    enrichment.industry ?? null,
    enrichment.dividend_yield ?? null,
    enrichment.annual_dividend ?? null,
    enrichment.payout_frequency ?? null,
    ticker
  );
}

export async function batchUpdateHoldingEnrichment(
  updates: Array<{
    ticker: string;
    sector?: string;
    industry?: string;
    dividend_yield?: number;
    annual_dividend?: number;
    payout_frequency?: string;
  }>
): Promise<void> {
  if (updates.length === 0) return;
  const db = await getDb();
  const sql = `
    UPDATE holdings
    SET
      sector = COALESCE(?, sector),
      industry = COALESCE(?, industry),
      dividend_yield = COALESCE(?, dividend_yield),
      annual_dividend = COALESCE(?, annual_dividend),
      payout_frequency = COALESCE(?, payout_frequency),
      updated_at = CURRENT_TIMESTAMP
    WHERE ticker = ?
  `;
  const statement = await db.prepareAsync(sql);
  try {
    await db.withExclusiveTransactionAsync(async () => {
      for (const u of updates) {
        await statement.executeAsync([
          u.sector ?? null,
          u.industry ?? null,
          u.dividend_yield ?? null,
          u.annual_dividend ?? null,
          u.payout_frequency ?? null,
          u.ticker,
        ]);
      }
    });
  } finally {
    await statement.finalizeAsync();
  }
}

export async function replaceForecastDividends(forecasts: DividendEvent[]): Promise<void> {
  const db = await getDb();
  // Clean old YFINANCE forecast events so we don't accumulate duplicates or stale projections
  await db.runAsync(`DELETE FROM dividend_events WHERE source = 'YFINANCE' AND status = 'EXPECTED'`);

  if (forecasts.length === 0) return;

  const insertSql = `
    INSERT INTO dividend_events (
      ticker, amount, currency, payment_date, status, source, external_id, created_at
    ) VALUES (?, ?, ?, ?, 'EXPECTED', 'YFINANCE', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(source, external_id) DO UPDATE SET
      amount = excluded.amount,
      currency = excluded.currency,
      payment_date = excluded.payment_date,
      status = 'EXPECTED'
  `;

  const statement = await db.prepareAsync(insertSql);
  try {
    await db.withExclusiveTransactionAsync(async () => {
      for (const d of forecasts) {
        await statement.executeAsync([
          d.ticker,
          d.amount ?? 0,
          d.currency ?? 'EUR',
          d.payment_date,
          d.external_id ?? `yf_${d.ticker}_${d.payment_date}`,
        ]);
      }
    });
  } finally {
    await statement.finalizeAsync();
  }
}

export async function exportAllDataAsCsv(): Promise<string> {
  const holdings = await getHoldings();
  const divs = await getDividends();
  const txs = await getTransactions(2000);

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];

  // 1. Holdings
  lines.push('=== HOLDINGS ===');
  lines.push('Ticker,Name,ISIN,Quantity,AvgPrice,CurrentPrice,MarketValue,PPL,Yield(%),AnnualDividend,Sector,Industry');
  for (const h of holdings) {
    lines.push([
      escapeCsv(h.ticker),
      escapeCsv(h.name),
      escapeCsv(h.isin),
      h.quantity,
      h.average_price,
      h.current_price,
      h.market_value,
      h.ppl,
      h.dividend_yield,
      h.annual_dividend,
      escapeCsv(h.sector),
      escapeCsv(h.industry)
    ].join(','));
  }
  lines.push('');

  // 2. Dividends
  lines.push('=== DIVIDENDS ===');
  lines.push('PaymentDate,Ticker,Amount,Currency,Status,Source');
  for (const d of divs) {
    lines.push([
      escapeCsv(d.payment_date),
      escapeCsv(d.ticker),
      d.amount,
      escapeCsv(d.currency),
      escapeCsv(d.status),
      escapeCsv(d.source)
    ].join(','));
  }
  lines.push('');

  // 3. Transactions
  lines.push('=== TRANSACTIONS ===');
  lines.push('Date,Type,Ticker,Quantity,Price,TotalAmount,Currency');
  for (const t of txs) {
    lines.push([
      escapeCsv(t.date),
      escapeCsv(t.type),
      escapeCsv(t.ticker),
      t.quantity ?? '',
      t.price ?? '',
      t.total_amount,
      escapeCsv(t.currency)
    ].join(','));
  }

  return lines.join('\n');
}

export async function getUpcomingForecastDividends(limit: number = 50): Promise<DividendEvent[]> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.getAllAsync<DividendEvent>(
    `SELECT * FROM dividend_events
     WHERE status = 'EXPECTED' AND payment_date >= ?
     ORDER BY payment_date ASC
     LIMIT ?`,
    today,
    limit
  );
}

export async function getIncomePlannerData(): Promise<IncomePlannerData> {
  // ponytail: local SQLite gap detection and holding recommendations matching web backend logic
  const db = await getDb();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const months: string[] = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  for (let i = 0; i < 12; i++) {
    let y = currentYear;
    let m = currentMonth + i;
    while (m > 12) {
      y += 1;
      m -= 12;
    }
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }

  const startDate = `${months[0]}-01`;
  const lastParts = months[11].split('-');
  let nextY = parseInt(lastParts[0], 10);
  let nextM = parseInt(lastParts[1], 10) + 1;
  if (nextM > 12) {
    nextY += 1;
    nextM = 1;
  }
  const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

  const events = await db.getAllAsync<{
    month_key: string;
    day_num: string;
    ticker: string;
    amount: number;
    status: string;
  }>(
    `SELECT
       strftime('%Y-%m', payment_date) as month_key,
       strftime('%d', payment_date) as day_num,
       ticker,
       amount,
       status
     FROM dividend_events
     WHERE payment_date >= ? AND payment_date < ?`,
    startDate,
    endDate
  );

  const monthlyTotals: Record<string, { received: number; expected: number; total: number }> = {};
  const monthlyTickers: Record<string, Set<string>> = {};
  const monthlyTickerAmounts: Record<string, Record<string, number>> = {};
  const monthlyPaidDays: Record<string, Set<number>> = {};

  for (const m of months) {
    monthlyTotals[m] = { received: 0, expected: 0, total: 0 };
    monthlyTickers[m] = new Set<string>();
    monthlyTickerAmounts[m] = {};
    monthlyPaidDays[m] = new Set<number>();
  }

  for (const ev of events) {
    if (monthlyTotals[ev.month_key]) {
      const amt = Number(ev.amount) || 0;
      if (ev.status === 'RECEIVED') {
        monthlyTotals[ev.month_key].received += amt;
      } else {
        monthlyTotals[ev.month_key].expected += amt;
      }
      monthlyTotals[ev.month_key].total += amt;
      monthlyTickers[ev.month_key].add(ev.ticker);
      monthlyTickerAmounts[ev.month_key][ev.ticker] =
        (monthlyTickerAmounts[ev.month_key][ev.ticker] || 0) + amt;

      const day = parseInt(ev.day_num, 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        monthlyPaidDays[ev.month_key].add(day);
      }
    }
  }

  const holdings = await db.getAllAsync<Holding>(
    'SELECT * FROM holdings WHERE quantity > 0 ORDER BY market_value DESC'
  );
  const ownedTickers = new Set<string>(holdings.map((h) => h.ticker.toUpperCase()));

  let t212CatalogSet: Set<string> | undefined;
  try {
    const cachedCatalogStr = await getSetting('t212_instruments_cache', '');
    if (cachedCatalogStr) {
      const parsed = JSON.parse(cachedCatalogStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        t212CatalogSet = new Set(parsed.map((s: string) => String(s).toUpperCase()));
      }
    }
    if (!t212CatalogSet || t212CatalogSet.size === 0) {
      const catalogJson = await getSetting('t212_instruments_catalog', '');
      if (catalogJson) {
        const parsed = JSON.parse(catalogJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          t212CatalogSet = new Set(parsed.map((item: any) => String(item.ticker).toUpperCase()));
        }
      }
    }
  } catch (e) {
    // ignore
  }

  let dynamicCandidates: ValidatedFutureInvestment[] | undefined;
  try {
    const candidatesStr = await getSetting('future_investment_candidates', '');
    if (candidatesStr) {
      const parsed = JSON.parse(candidatesStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // ponytail: filter out UFI and zombie/stale dividend candidates
        dynamicCandidates = parsed.filter((c: ValidatedFutureInvestment) => {
          if (c.ticker.toUpperCase() === 'UFI' || c.name?.toUpperCase().includes('UNIFI')) return false;
          if (!c.dividend_yield || c.dividend_yield <= 0) return false;
          if (c.last_dividend_date) {
            const diffDays = (Date.now() - new Date(c.last_dividend_date).getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 460) return false;
          }
          return true;
        });
      }
    }
  } catch (e) {
    // ignore
  }

  const historyRows = await db.getAllAsync<{ ticker: string; month_num: string }>(
    `SELECT DISTINCT ticker, strftime('%m', payment_date) as month_num
     FROM dividend_events
     WHERE payment_date IS NOT NULL`
  );
  const historicalPayMonths: Record<string, Set<number>> = {};
  for (const row of historyRows) {
    if (!historicalPayMonths[row.ticker]) {
      historicalPayMonths[row.ticker] = new Set<number>();
    }
    const num = parseInt(row.month_num, 10);
    if (!isNaN(num)) {
      historicalPayMonths[row.ticker].add(num);
    }
  }

  let totalAnnual = 0;
  for (const m of months) {
    totalAnnual += monthlyTotals[m].total;
  }
  totalAnnual = Math.round(totalAnnual * 100) / 100;
  const monthlyAverage = Math.round((totalAnnual / 12) * 100) / 100;

  const plannerMonths: PlannerMonth[] = [];
  let gapMonthsCount = 0;

  for (const mKey of months) {
    const monthNum = parseInt(mKey.split('-')[1], 10);
    const monthName = `${monthNames[monthNum - 1]} ${mKey.split('-')[0]}`;
    const totals = monthlyTotals[mKey];
    const totalAmt = Math.round(totals.total * 100) / 100;
    const isGap = monthlyAverage > 0 && totalAmt < monthlyAverage;
    const gapAmount = isGap ? Math.round((monthlyAverage - totalAmt) * 100) / 100 : 0;
    if (isGap) gapMonthsCount += 1;

    const recommendations: PlannerHoldingRecommendation[] = [];

    for (const h of holdings) {
      const scheduledInMonth = monthlyTickers[mKey].has(h.ticker);
      const paidHistoricallyInMonth = historicalPayMonths[h.ticker]?.has(monthNum) ?? false;
      const isMonthly = (h.payout_frequency || '').toUpperCase() === 'MONTHLY';

      if (!scheduledInMonth && !paidHistoricallyInMonth && !isMonthly) {
        continue;
      }

      let payoutPerShare = 0;
      const fx = h.fx_rate && h.fx_rate > 0 ? h.fx_rate : 1.0;

      if (scheduledInMonth && monthlyTickerAmounts[mKey][h.ticker] && h.quantity > 0) {
        payoutPerShare = monthlyTickerAmounts[mKey][h.ticker] / h.quantity;
      } else if (h.annual_dividend && h.annual_dividend > 0 && h.quantity > 0) {
        const freq = (h.payout_frequency || 'QUARTERLY').toUpperCase();
        const divisor = freq === 'MONTHLY' ? 12 : freq === 'SEMI_ANNUAL' ? 2 : freq === 'ANNUAL' ? 1 : 4;
        payoutPerShare = (h.annual_dividend / h.quantity) / divisor;
      } else if (h.dividend_yield && h.dividend_yield > 0 && h.current_price > 0) {
        const freq = (h.payout_frequency || 'QUARTERLY').toUpperCase();
        const divisor = freq === 'MONTHLY' ? 12 : freq === 'SEMI_ANNUAL' ? 2 : freq === 'ANNUAL' ? 1 : 4;
        payoutPerShare = (h.current_price * fx * (h.dividend_yield / 100)) / divisor;
      }

      if (payoutPerShare <= 0.0001) {
        continue;
      }

      const sharesToFill = gapAmount > 0 ? Math.ceil(gapAmount / payoutPerShare) : 0;
      const priceEur = (h.current_price || 0) * fx;
      const capitalNeeded = Math.round(sharesToFill * priceEur * 100) / 100;

      recommendations.push({
        ticker: h.ticker,
        name: h.name || h.ticker,
        current_shares: Math.round(h.quantity * 100) / 100,
        current_price: Math.round(priceEur * 100) / 100,
        annual_dividend: Math.round((h.annual_dividend || 0) * 100) / 100,
        dividend_yield: Math.round((h.dividend_yield || 0) * 100) / 100,
        payout_frequency: h.payout_frequency || null,
        payout_amount_per_share: Math.round(payoutPerShare * 10000) / 10000,
        shares_to_fill_gap: sharesToFill,
        capital_needed: capitalNeeded,
      });
    }

    recommendations.sort((a, b) => {
      if (gapAmount > 0) {
        const scoreA = (a.dividend_yield * 100) - (a.capital_needed * 0.001);
        const scoreB = (b.dividend_yield * 100) - (b.capital_needed * 0.001);
        return scoreB - scoreA;
      }
      return b.dividend_yield - a.dividend_yield;
    });

    const paidDays = monthlyPaidDays[mKey] || new Set<number>();
    const [yStr, mMonthStr] = mKey.split('-');
    const daysInMonth = getDaysInMonth(parseInt(yStr, 10), parseInt(mMonthStr, 10));
    const missingDaysCount = Math.max(0, daysInMonth - paidDays.size);
    const missingDaySuggestions = getMissingDaySuggestions(
      mKey,
      paidDays,
      ownedTickers,
      t212CatalogSet,
      20,
      dynamicCandidates
    );

    plannerMonths.push({
      month: mKey,
      month_name: monthName,
      total_amount: totalAmt,
      received_amount: Math.round(totals.received * 100) / 100,
      expected_amount: Math.round(totals.expected * 100) / 100,
      is_gap: isGap,
      gap_amount: gapAmount,
      recommendations,
      missing_days_count: missingDaysCount,
      missing_day_suggestions: missingDaySuggestions,
    });
  }

  return {
    monthly_average: monthlyAverage,
    total_annual_income: totalAnnual,
    currency: 'EUR',
    gap_months_count: gapMonthsCount,
    months: plannerMonths,
  };
}

export async function clearDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM holdings;
    DELETE FROM transactions;
    DELETE FROM dividend_events;
    DELETE FROM sync_log;
    DELETE FROM settings WHERE key NOT IN (
      'app_version',
      't212_instruments_cache',
      't212_instruments_catalog',
      'future_investment_candidates',
      'future_investment_last_synced'
    );
  `);
}
