import { Trading212Credentials } from '../types';

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
      return `Basic ${btoa(`${this.apiKey}:${this.apiSecret}`)}`;
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

  async getInstruments(): Promise<Array<{
    ticker: string;
    name: string;
    isin: string;
    currencyCode: string;
    type?: string;
  }>> {
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

  private async fetchPaginated<T = any>(initialPath: string, maxPages: number): Promise<T[]> {
    const items: T[] = [];
    let nextPath: string | null = initialPath;
    let pages = 0;

    while (nextPath && pages < maxPages) {
      try {
        const res: { items?: T[]; nextPagePath?: string | null } = await this.request(nextPath);
        if (res?.items && Array.isArray(res.items)) {
          items.push(...res.items);
        }
        nextPath = res?.nextPagePath || null;
        pages++;
      } catch {
        break;
      }
    }
    return items;
  }

  async getAllOrders(maxPages: number = 10): Promise<Array<any>> {
    return this.fetchPaginated('/equity/history/orders?limit=50', maxPages);
  }

  async getAllTransactions(maxPages: number = 10): Promise<Array<any>> {
    return this.fetchPaginated('/equity/history/transactions?limit=50', maxPages);
  }

  async getAllDividends(maxPages: number = 15): Promise<Array<any>> {
    return this.fetchPaginated('/equity/history/dividends?limit=50', maxPages);
  }
}
