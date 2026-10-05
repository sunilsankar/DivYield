import { DividendEvent, Holding, SyncProgress, Transaction } from '../types';
import {
  batchUpsertDividends,
  batchUpsertHoldings,
  batchUpsertTransactions,
  getDb,
  setSetting,
} from './database';
import { getCredentials } from './secureStore';
import { Trading212Client } from './trading212';

let isSyncingActive = false;

export async function runSync(onProgress?: (progress: SyncProgress) => void): Promise<{
  success: boolean;
  message: string;
  holdingsCount?: number;
  dividendsCount?: number;
}> {
  if (isSyncingActive) {
    return { success: false, message: 'Sync is already running' };
  }

  isSyncingActive = true;
  const updateProgress = (step: number, message: string) => {
    if (onProgress) {
      onProgress({
        is_syncing: true,
        current_step: step,
        total_steps: 7,
        step_message: message,
      });
    }
  };

  try {
    const creds = await getCredentials();
    if (!creds || !creds.apiKey) {
      throw new Error('Please configure your Trading 212 API key in Settings.');
    }

    const client = new Trading212Client(creds);

    // Step 1: Cash balances
    updateProgress(1, 'Fetching account balances & cash...');
    const cash = await client.getCash();
    const accountCurrency = cash.currency || 'EUR';
    await setSetting('account_currency', accountCurrency);
    await setSetting('account_free_cash', String(cash.free || 0));
    await setSetting('account_total_cash', String(cash.total || 0));
    await setSetting('account_ppl', String(cash.ppl || 0));

    // Step 2: Instruments metadata
    updateProgress(2, 'Loading instrument metadata & ISINs...');
    let instruments: Array<{ ticker: string; name: string; isin: string; currencyCode: string }> = [];
    try {
      instruments = await client.getInstruments();
    } catch (e) {
      console.warn('Metadata fetch fallback:', e);
    }
    const metaMap = new Map<string, { name: string; isin: string; currency: string }>();
    const instrumentCurrencies = new Map<string, string>();
    for (const inst of instruments) {
      metaMap.set(inst.ticker, {
        name: inst.name,
        isin: inst.isin,
        currency: inst.currencyCode,
      });
      instrumentCurrencies.set(inst.ticker, inst.currencyCode);
    }

    // Step 3: Portfolio holdings & FX rates
    updateProgress(3, 'Synchronizing open holdings & live FX...');
    const portfolio = await client.getPortfolio();

    // Derive FX rates
    const rates: Record<string, number> = { EUR: 1.0, GBX: 0.01175, GBP: 1.175, USD: 0.92 };
    const currencyTotals: Record<string, { localPnl: number; eurPnl: number }> = {};
    for (const pos of portfolio) {
      const curr = instrumentCurrencies.get(pos.ticker) || 'USD';
      if (curr === 'EUR') continue;

      const localPnl = (pos.currentPrice - pos.averagePrice) * pos.quantity;
      const pureEurPnl = pos.ppl - (pos.fxPpl || 0.0);
      if (Math.abs(localPnl) > 0.01) {
        if (!currencyTotals[curr]) currencyTotals[curr] = { localPnl: 0, eurPnl: 0 };
        currencyTotals[curr].localPnl += localPnl;
        currencyTotals[curr].eurPnl += pureEurPnl;
      }
    }
    for (const [curr, totals] of Object.entries(currencyTotals)) {
      if (Math.abs(totals.localPnl) > 1.0) {
        const derived = totals.eurPnl / totals.localPnl;
        if (derived > 0.0001 && derived < 100.0) {
          rates[curr] = derived;
        }
      }
    }
    if (rates.GBP && !currencyTotals.GBX) rates.GBX = rates.GBP / 100.0;
    if (rates.GBX && !currencyTotals.GBP) rates.GBP = rates.GBX * 100.0;

    const holdings: Holding[] = portfolio.map(pos => {
      const meta = metaMap.get(pos.ticker);
      const curr = meta?.currency || 'EUR';
      const fx = rates[curr] || 1.0;

      const rawMarketVal = pos.quantity * pos.currentPrice;
      const marketValEur = rawMarketVal * fx;
      const investedEur = marketValEur - pos.ppl;
      const avgPriceEur = pos.quantity > 0 ? investedEur / pos.quantity : 0;
      const currentPriceEur = pos.currentPrice * fx;

      return {
        ticker: pos.ticker,
        name: meta?.name || pos.ticker,
        isin: meta?.isin || null,
        quantity: pos.quantity,
        average_price: avgPriceEur,
        current_price: currentPriceEur,
        market_value: marketValEur,
        currency: 'EUR',
        fx_rate: fx,
        ppl: pos.ppl,
        provider: 'TRADING212',
        external_id: pos.ticker,
      };
    });
    await batchUpsertHoldings(holdings);

    // Step 4: Orders history
    updateProgress(4, 'Synchronizing filled orders...');
    let rawOrders: any[] = [];
    try {
      rawOrders = await client.getAllOrders(8);
    } catch (e) {
      console.warn('Orders fetch warning:', e);
    }
    const orderTxs: Transaction[] = [];
    for (const item of rawOrders) {
      const order = item.order || item;
      const fill = item.fill || {};
      const status = (order.status || '').toUpperCase();
      if (status !== 'FILLED') continue;

      const side = (order.side || 'BUY').toUpperCase();
      const ticker = order.ticker;
      const qty = fill.quantity || order.quantity || 0;
      const price = fill.price || order.price || 0;
      const walletImpact = fill.walletImpact || 0;
      const totalAmount = Math.abs(walletImpact) || qty * price;
      const date = fill.filledAt || order.createdAt || new Date().toISOString();
      const extId = `t212-ord-${order.id || Math.random()}`;

      orderTxs.push({
        type: side === 'SELL' ? 'SELL' : 'BUY',
        ticker,
        quantity: qty,
        price,
        total_amount: totalAmount,
        currency: accountCurrency,
        date,
        provider: 'TRADING212',
        external_id: extId,
      });
    }
    if (orderTxs.length > 0) {
      await batchUpsertTransactions(orderTxs);
    }

    // Step 5: Cash transactions (Deposits, interest, withdrawals)
    updateProgress(5, 'Synchronizing deposits & cash flow...');
    let rawCashTxs: any[] = [];
    try {
      rawCashTxs = await client.getAllTransactions(8);
    } catch (e) {
      console.warn('Cash transactions warning:', e);
    }
    const cashTxs: Transaction[] = [];
    for (const item of rawCashTxs) {
      const rawType = (item.type || '').toUpperCase();
      let txType: Transaction['type'] = 'CASH';
      if (rawType.includes('INTEREST')) txType = 'INTEREST';
      else if (rawType.includes('DIVIDEND')) txType = 'DIVIDEND';

      const amount = Math.abs(item.amount || 0);
      const date = item.dateTime || item.date || new Date().toISOString();
      const extId = `t212-tx-${item.id || Math.random()}`;

      cashTxs.push({
        type: txType,
        ticker: item.ticker || null,
        total_amount: amount,
        currency: accountCurrency,
        date,
        provider: 'TRADING212',
        external_id: extId,
        notes: item.type,
      });
    }
    if (cashTxs.length > 0) {
      await batchUpsertTransactions(cashTxs);
    }

    // Step 6: Received Dividends
    updateProgress(6, 'Synchronizing received dividends...');
    let rawDividends: any[] = [];
    try {
      rawDividends = await client.getAllDividends(12);
    } catch (e) {
      console.warn('Dividends fetch warning:', e);
    }
    const divEvents: DividendEvent[] = [];
    for (const item of rawDividends) {
      const ticker = item.ticker;
      const amountEur = item.amountInEuro || item.amount || 0;
      const date = (item.paidOn || item.dateTime || '').slice(0, 10);
      const extId = `t212-div-${item.reference || item.id || `${ticker}_${date}`}`;

      if (ticker && amountEur > 0 && date) {
        divEvents.push({
          ticker,
          amount: amountEur,
          currency: 'EUR',
          payment_date: date,
          status: 'RECEIVED',
          source: 'TRADING212',
          external_id: extId,
        });
      }
    }
    if (divEvents.length > 0) {
      await batchUpsertDividends(divEvents);
    }

    // Step 7: Finalizing & updating sync log
    updateProgress(7, 'Finalizing sync & cache...');
    const nowIso = new Date().toISOString();
    await setSetting('last_synced', nowIso);
    await setSetting('trading212_sync_status', 'success');

    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sync_log (provider, status, items_synced) VALUES (?, ?, ?)`,
      ['TRADING212', 'success', holdings.length + divEvents.length]
    );

    return {
      success: true,
      message: `Synced ${holdings.length} holdings and ${divEvents.length} dividends.`,
      holdingsCount: holdings.length,
      dividendsCount: divEvents.length,
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Sync failed';
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sync_log (provider, status, items_synced, error_message) VALUES (?, ?, ?, ?)`,
      ['TRADING212', 'error', 0, errorMsg]
    );
    throw err;
  } finally {
    isSyncingActive = false;
    if (onProgress) {
      onProgress({
        is_syncing: false,
        current_step: 7,
        total_steps: 7,
        step_message: 'Sync completed',
        last_synced: new Date().toISOString(),
      });
    }
  }
}
