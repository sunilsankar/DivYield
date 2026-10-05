import { Trading212Credentials } from '../types';

function encodeBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (
    let block = 0, charCode = 0, i = 0, map = chars;
    str.charAt(i | 0) || ((map = '='), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    block = (block << 8) | charCode;
  }
  return output;
}

export class Trading212Client {
  private apiKey: string;
  private apiSecret?: string;
  private baseUrl: string;

  constructor(creds: Trading212Credentials) {
    this.apiKey = creds.apiKey.trim();
    this.apiSecret = creds.apiSecret ? creds.apiSecret.trim() : undefined;
    this.baseUrl =
      creds.environment === 'demo'
        ? 'https://demo.trading212.com/api/v0'
        : 'https://live.trading212.com/api/v0';
  }

  private getAuthHeader(): string {
    if (this.apiSecret) {
      // Basic auth
      const token = `${this.apiKey}:${this.apiSecret}`;
      const encoded = encodeBase64(token);
      return `Basic ${encoded}`;
    }
    return this.apiKey;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(path: string, options: { retries?: number; delayMs?: number } = {}): Promise<T> {
    const { retries = 3, delayMs = 600 } = options;
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      Accept: 'application/json',
      'User-Agent': 'DivYield-Mobile/0.1.0',
    };

    let attempt = 0;
    while (attempt <= retries) {
      try {
        if (delayMs > 0) {
          await this.sleep(delayMs);
        }

        const res = await fetch(url, { method: 'GET', headers });

        if (res.status === 429) {
          attempt++;
          const waitTime = Math.min(10000, 1000 * Math.pow(2, attempt));
          await this.sleep(waitTime);
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          throw new Error('Invalid Trading 212 API credentials or permission denied.');
        }

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Trading 212 API error (${res.status}): ${body.slice(0, 100)}`);
        }

        return (await res.json()) as T;
      } catch (err: any) {
        if (attempt >= retries) throw err;
        attempt++;
        await this.sleep(1000 * attempt);
      }
    }

    throw new Error('Trading 212 API request failed after retries.');
  }

  async testConnection(): Promise<{ ok: boolean; message: string; currency?: string }> {
    try {
      const cash = await this.getCash();
      return {
        ok: true,
        message: 'Connected to Trading 212 successfully',
        currency: cash.currency || 'EUR',
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err.message || 'Connection test failed',
      };
    }
  }

  async getCash(): Promise<{ free: number; total: number; ppl: number; result: number; currency: string }> {
    return this.request('/equity/account/cash');
  }

  async getInstruments(): Promise<Array<{ ticker: string; name: string; isin: string; currencyCode: string }>> {
    return this.request('/equity/metadata/instruments');
  }

  async getPortfolio(): Promise<Array<{
    ticker: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    ppl: number;
    fxPpl?: number;
    initialFillDate?: string;
  }>> {
    return this.request('/equity/portfolio');
  }

  async getAllOrders(maxPages: number = 10): Promise<Array<any>> {
    const orders: any[] = [];
    let nextPath: string | null = '/equity/history/orders?limit=50';
    let pages = 0;

    while (nextPath && pages < maxPages) {
      try {
        const res: { items?: any[]; nextPagePath?: string | null } = await this.request(nextPath);
        if (res && Array.isArray(res.items)) {
          orders.push(...res.items);
        }
        nextPath = res.nextPagePath || null;
        pages++;
      } catch (e) {
        break;
      }
    }
    return orders;
  }

  async getAllTransactions(maxPages: number = 10): Promise<Array<any>> {
    const txs: any[] = [];
    let nextPath: string | null = '/equity/history/transactions?limit=50';
    let pages = 0;

    while (nextPath && pages < maxPages) {
      try {
        const res: { items?: any[]; nextPagePath?: string | null } = await this.request(nextPath);
        if (res && Array.isArray(res.items)) {
          txs.push(...res.items);
        }
        nextPath = res.nextPagePath || null;
        pages++;
      } catch (e) {
        break;
      }
    }
    return txs;
  }

  async getAllDividends(maxPages: number = 15): Promise<Array<any>> {
    const divs: any[] = [];
    let nextPath: string | null = '/equity/history/dividends?limit=50';
    let pages = 0;

    while (nextPath && pages < maxPages) {
      try {
        const res: { items?: any[]; nextPagePath?: string | null } = await this.request(nextPath);
        if (res && Array.isArray(res.items)) {
          divs.push(...res.items);
        }
        nextPath = res.nextPagePath || null;
        pages++;
      } catch (e) {
        break;
      }
    }
    return divs;
  }
}
