/**
 * Unified market-data provider layer.
 *
 * Priority: Finnhub (licensed, requires FINNHUB_API_KEY) -> Yahoo Finance
 * via the yahoo-finance2 library (unofficial, no key required).
 *
 * Iron rule: every field is real provider data or null. Nothing is
 * fabricated, interpolated, or guessed. Unknown => null.
 */

export interface Quote {
  symbol: string;
  name: string | null;
  currentPrice: number | null;
  previousClose: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null; // shares, numeric
  marketCap: number | null; // USD, numeric
  currency: string | null;
  exchangeName: string | null;
  dividendYield: number | null; // percent, e.g. 1.35
  annualDividendRate: number | null; // $/share/year
  peRatio: number | null;
  beta: number | null;
  sparkline: number[];
  source: string; // provider id that supplied the price
  lastRefreshed: string; // ISO timestamp
}

export interface HistoryPoint {
  date: string; // ISO date
  close: number | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  publisher: string | null;
  link: string | null;
  publishedAt: string | null;
  summary: string | null;
  relatedSymbols: string[];
}

export interface SearchResult {
  symbol: string;
  name: string | null;
  type: string | null;
  exchange: string | null;
}

export interface Fundamentals {
  symbol: string;
  name: string | null;
  currentPrice: number | null;
  marketCap: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  annualDividendRate: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  analystRating: string | null;
  analystPriceTarget: number | null;
  earningsDate: string | null; // ISO date or null
  source: string;
}

export interface MarketProvider {
  readonly id: string;
  readonly label: string;
  available(): boolean;
  getQuotes(symbols: string[]): Promise<{ quotes: Record<string, Quote>; errors: Record<string, string> }>;
  getHistory(symbol: string, range: string): Promise<HistoryPoint[]>;
  getNews(symbol: string, count?: number): Promise<NewsArticle[]>;
  search(query: string): Promise<SearchResult[]>;
  getFundamentals(symbol: string): Promise<Fundamentals>;
}

const FETCH_TIMEOUT_MS = 25000;

function withTimeout<T>(p: Promise<T>, ms = FETCH_TIMEOUT_MS): Promise<T> {
  const t = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );
  return Promise.race([p, t]);
}

function num(v: any): number | null {
  return typeof v === 'number' && isFinite(v) ? v : null;
}

function emptyQuote(symbol: string, source: string): Quote {
  return {
    symbol,
    name: null,
    currentPrice: null,
    previousClose: null,
    open: null,
    dayHigh: null,
    dayLow: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    volume: null,
    marketCap: null,
    currency: null,
    exchangeName: null,
    dividendYield: null,
    annualDividendRate: null,
    peRatio: null,
    beta: null,
    sparkline: [],
    source,
    lastRefreshed: new Date().toISOString(),
  };
}

/** Merge two quotes: first non-null value wins per field. */
function mergeQuotes(primary: Quote, secondary: Quote): Quote {
  const out: Quote = { ...primary };
  (Object.keys(primary) as (keyof Quote)[]).forEach((k) => {
    if ((out[k] === null || out[k] === undefined) && secondary[k] !== null && secondary[k] !== undefined) {
      (out as any)[k] = secondary[k];
    }
  });
  if (out.sparkline.length === 0) out.sparkline = secondary.sparkline;
  out.source = `${primary.source}+${secondary.source}`;
  return out;
}

// ---------------------------------------------------------------------------
// Yahoo Finance via yahoo-finance2 (unofficial, no API key required)
// ---------------------------------------------------------------------------
class YahooProvider implements MarketProvider {
  readonly id = 'yahoo';
  readonly label = 'Yahoo Finance (unofficial)';
  private yf: any = null;

  available(): boolean {
    return true;
  }

  private async client(): Promise<any> {
    if (!this.yf) {
      const mod = await import('yahoo-finance2');
      const YahooFinance = (mod as any).default || mod;
      this.yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    }
    return this.yf;
  }

  async getQuotes(symbols: string[]): Promise<{ quotes: Record<string, Quote>; errors: Record<string, string> }> {
    const yf = await this.client();
    const quotes: Record<string, Quote> = {};
    const errors: Record<string, string> = {};
    const results = await Promise.allSettled(
      symbols.map((s) => withTimeout(yf.quote(s.trim().toUpperCase())))
    );
    results.forEach((r, i) => {
      const sym = symbols[i].trim().toUpperCase();
      if (r.status === 'fulfilled' && r.value) {
        quotes[sym] = this.mapQuote(sym, r.value);
      } else {
        errors[sym] = r.status === 'rejected' ? String(r.reason?.message || r.reason) : 'No data';
      }
    });
    return { quotes, errors };
  }

  private mapQuote(sym: string, q: any): Quote {
    const base = emptyQuote(sym, this.id);
    const price = num(q.regularMarketPrice);
    const prevClose = num(q.regularMarketPreviousClose);
    // Dividend: prefer the self-consistent trailing pair. Yahoo's dividend
    // fields often contradict each other (e.g. dividendRate=1 vs
    // trailingAnnualDividendRate=0.28 for the same symbol on the same day),
    // so rate and yield are taken from the same family. trailingAnnualDividendYield
    // is a ratio (0.0012 -> 0.12%); dividendYield/yield are percents.
    let divRate: number | null = num(q.trailingAnnualDividendRate);
    let divYield: number | null = null;
    const trailingYieldRatio = num(q.trailingAnnualDividendYield);
    if (trailingYieldRatio !== null && trailingYieldRatio > 0) {
      divYield = Number((trailingYieldRatio * 100).toFixed(4));
    }
    if (divRate === null) {
      divRate = num(q.dividendRate);
    }
    if (divYield === null) {
      const y = num(q.dividendYield) ?? num(q.yield);
      if (y !== null && y >= 0) divYield = Number(y.toFixed(4));
    }
    if (divRate !== null && price && divYield === null) {
      divYield = Number(((divRate / price) * 100).toFixed(4));
    }
    if (divYield !== null && divRate === null && price) {
      divRate = Number(((price * divYield) / 100).toFixed(4));
    }
    return {
      ...base,
      name: q.longName || q.shortName || null,
      currentPrice: price,
      previousClose: prevClose,
      open: num(q.regularMarketOpen),
      dayHigh: num(q.regularMarketDayHigh),
      dayLow: num(q.regularMarketDayLow),
      fiftyTwoWeekHigh: num(q.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(q.fiftyTwoWeekLow),
      volume: num(q.regularMarketVolume),
      marketCap: num(q.marketCap),
      currency: q.currency || null,
      exchangeName: q.fullExchangeName || q.exchange || null,
      dividendYield: divYield,
      annualDividendRate: divRate,
      peRatio: num(q.trailingPE),
      beta: num(q.beta),
      sparkline: [],
      lastRefreshed: new Date().toISOString(),
    };
  }

  async getHistory(symbol: string, range: string): Promise<HistoryPoint[]> {
    const yf = await this.client();
    const sym = symbol.trim().toUpperCase();
    const r = range.toUpperCase();
    const now = new Date();
    const day = 86400000;
    // Map UI ranges to Yahoo chart params (v3 chart API uses period1/period2).
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const presets: Record<string, { period1: Date; interval: string }> = {
      '1D': { period1: startOfDay, interval: '15m' },
      '5D': { period1: new Date(now.getTime() - 5 * day), interval: '1d' },
      '1M': { period1: new Date(now.getTime() - 30 * day), interval: '1d' },
      '6M': { period1: new Date(now.getTime() - 182 * day), interval: '1d' },
      'YTD': { period1: startOfYear, interval: '1d' },
      '1Y': { period1: new Date(now.getTime() - 365 * day), interval: '1d' },
      '5Y': { period1: new Date(now.getTime() - 5 * 365 * day), interval: '1wk' },
      'ALL': { period1: new Date(1990, 0, 1), interval: '1mo' },
    };
    const p = presets[r] || presets['1M'];
    const chart: any = await withTimeout(
      yf.chart(sym, { period1: p.period1, interval: p.interval as any })
    );
    const rows = Array.isArray(chart?.quotes) ? chart.quotes : [];
    return rows
      .map((pt: any) => ({
        date: pt.date ? new Date(pt.date).toISOString() : '',
        close: num(pt.close),
      }))
      .filter((pt: HistoryPoint) => pt.date && pt.close !== null);
  }

  async getNews(symbol: string, count = 10): Promise<NewsArticle[]> {
    const yf = await this.client();
    const sym = symbol.trim().toUpperCase();
    const res: any = await withTimeout(yf.search(sym, { quotesCount: 1, newsCount: count }));
    const items = res?.news || [];
    return items.map((n: any, i: number) => ({
      id: n.uuid || `yahoo-news-${sym}-${i}`,
      title: n.title || 'Untitled',
      publisher: n.publisher || null,
      link: n.link || null,
      publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
      summary: n.summary || null,
      relatedSymbols: Array.isArray(n.relatedTickers) && n.relatedTickers.length > 0 ? n.relatedTickers : [sym],
    }));
  }

  async search(query: string): Promise<SearchResult[]> {
    const yf = await this.client();
    const res: any = await withTimeout(yf.search(query.trim(), { quotesCount: 8, newsCount: 0 }));
    return (res?.quotes || []).map((q: any) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || null,
      type: q.quoteType || null,
      exchange: q.exchDisp || null,
    }));
  }

  async getFundamentals(symbol: string): Promise<Fundamentals> {
    const yf = await this.client();
    const sym = symbol.trim().toUpperCase();
    // Note: validation disabled — Yahoo's quoteSummary shapes drift and the
    // validator strips fields; raw() below accepts both {raw} and plain numbers.
    const qs: any = await withTimeout(
      yf.quoteSummary(
        sym,
        { modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'calendarEvents', 'financialData'] },
        { validateResult: false }
      )
    );
    const raw = (v: any): number | null => {
      if (v === null || v === undefined) return null;
      const n = typeof v === 'object' ? v.raw : v;
      return typeof n === 'number' && isFinite(n) ? n : null;
    };
    const price = qs?.price || {};
    const sd = qs?.summaryDetail || {};
    const ks = qs?.defaultKeyStatistics || {};
    const cal = qs?.calendarEvents || {};
    const fin = qs?.financialData || {};
    const currentPrice = raw(price.regularMarketPrice) ?? raw(sd.currentPrice);
    const divRate = raw(sd.dividendRate);
    let divYield = raw(sd.dividendYield);
    if (divYield !== null && divYield > 0 && divYield < 1) divYield = divYield * 100; // ratio -> percent
    const earningsDates = cal?.earnings?.earningsDate;
    const earningsDate = Array.isArray(earningsDates) && earningsDates[0]
      ? new Date(earningsDates[0]).toISOString()
      : (typeof cal?.earnings?.earningsDate === 'number'
          ? new Date(cal.earnings.earningsDate * 1000).toISOString()
          : null);
    return {
      symbol: sym,
      name: price.longName || price.shortName || null,
      currentPrice,
      marketCap: raw(price.marketCap),
      peRatio: raw(sd.trailingPE) ?? raw(ks.trailingPE),
      forwardPE: raw(sd.forwardPE),
      priceToBook: raw(sd.priceToBook),
      dividendYield: divYield,
      annualDividendRate: divRate,
      beta: raw(ks.beta) ?? raw(sd.beta),
      fiftyTwoWeekHigh: raw(sd.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: raw(sd.fiftyTwoWeekLow),
      analystRating: fin.recommendationKey ? String(fin.recommendationKey) : null,
      analystPriceTarget: raw(fin.targetMeanPrice),
      earningsDate,
      source: this.id,
    };
  }

  /** Live index snapshot: ^GSPC, ^IXIC, ^DJI with % change and a short sparkline. */
  async getIndices(): Promise<Array<{ symbol: string; name: string | null; price: number | null; changePct: number | null; sparkline: number[] }>> {
    const defs = [
      { symbol: '^GSPC', name: 'S&P 500' },
      { symbol: '^IXIC', name: 'NASDAQ Composite' },
      { symbol: '^DJI', name: 'Dow Jones Industrial Average' },
    ];
    const out = [];
    for (const d of defs) {
      try {
        const yf = await this.client();
        const q: any = await withTimeout(yf.quote(d.symbol));
        const price = num(q.regularMarketPrice);
        const prev = num(q.regularMarketPreviousClose);
        const chart: any = await withTimeout(
          yf.chart(d.symbol, {
            period1: new Date(Date.now() - 5 * 86400000),
            interval: '1d' as any,
          }).catch(() => null)
        );
        const spark = (Array.isArray(chart?.quotes) ? chart.quotes : [])
          .map((pt: any) => pt.close)
          .filter((v: any) => typeof v === 'number' && isFinite(v));
        out.push({
          symbol: d.symbol,
          name: d.name,
          price,
          changePct: price !== null && prev ? Number((((price - prev) / prev) * 100).toFixed(2)) : null,
          sparkline: spark,
        });
      } catch {
        out.push({ symbol: d.symbol, name: d.name, price: null, changePct: null, sparkline: [] });
      }
    }
    return out;
  }

  /** Predefined screener (e.g. 'most_actives', 'day_gainers', 'day_losers') with real data. */
  async screen(screenerId: string): Promise<Array<Record<string, any>>> {
    const yf = await this.client();
    // Validation disabled: Yahoo's screener response drifts from the
    // library's schema; we map defensively instead of crashing.
    const res: any = await withTimeout(yf.screener(screenerId, {}, { validateResult: false }));
    const quotes = res?.quotes || [];
    return quotes.map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: num(q.regularMarketPrice),
      changePct: num(q.regularMarketChangePercent),
      peRatio: num(q.trailingPE),
      dividendYield: (() => {
        const y = num(q.dividendYield);
        return y !== null && y > 0 && y < 1 ? y * 100 : y;
      })(),
      marketCap: num(q.marketCap),
      sector: q.sector || null,
      assetType: q.quoteType || null,
    }));
  }
}

// ---------------------------------------------------------------------------
// Finnhub (licensed, requires FINNHUB_API_KEY)
// ---------------------------------------------------------------------------
class FinnhubProvider implements MarketProvider {
  readonly id = 'finnhub';
  readonly label = 'Finnhub';
  private key: string | null = null;

  available(): boolean {
    if (this.key === null) {
      const k = (process.env.FINNHUB_API_KEY || '').trim();
      this.key = k.length > 0 ? k : '';
    }
    return this.key.length > 0;
  }

  private async call(path: string): Promise<any> {
    if (!this.available() || !this.key) throw new Error('Finnhub API key not configured');
    const url = `https://finnhub.io/api/v1/${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(this.key)}`;
    const res = await withTimeout(fetch(url));
    if (!res.ok) throw new Error(`Finnhub ${res.status} on ${path.split('?')[0]}`);
    return res.json();
  }

  async getQuotes(symbols: string[]): Promise<{ quotes: Record<string, Quote>; errors: Record<string, string> }> {
    const quotes: Record<string, Quote> = {};
    const errors: Record<string, string> = {};
    const results = await Promise.allSettled(
      symbols.map(async (s) => {
        const sym = s.trim().toUpperCase();
        const q = await this.call(`quote?symbol=${encodeURIComponent(sym)}`);
        if (q.c === 0 && q.pc === 0) throw new Error('No quote data');
        const base = emptyQuote(sym, this.id);
        return {
          ...base,
          currentPrice: num(q.c),
          previousClose: num(q.pc),
          open: num(q.o),
          dayHigh: num(q.h),
          dayLow: num(q.l),
          lastRefreshed: new Date().toISOString(),
        } as Quote;
      })
    );
    results.forEach((r, i) => {
      const sym = symbols[i].trim().toUpperCase();
      if (r.status === 'fulfilled') quotes[sym] = r.value;
      else errors[sym] = String(r.reason?.message || r.reason);
    });
    return { quotes, errors };
  }

  async getHistory(): Promise<HistoryPoint[]> {
    // Finnhub /stock/candle is not on the free tier; history comes from Yahoo.
    return [];
  }

  async getNews(symbol: string, count = 10): Promise<NewsArticle[]> {
    const sym = symbol.trim().toUpperCase();
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const items = await this.call(`company-news?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}`);
    return (Array.isArray(items) ? items : []).slice(0, count).map((n: any, i: number) => ({
      id: n.id ? `finnhub-${n.id}` : `finnhub-${sym}-${i}`,
      title: n.headline || 'Untitled',
      publisher: n.source || null,
      link: n.url || null,
      publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
      summary: n.summary || null,
      relatedSymbols: [sym],
    }));
  }

  async search(query: string): Promise<SearchResult[]> {
    const res = await this.call(`search?q=${encodeURIComponent(query.trim())}`);
    return (res?.result || []).map((r: any) => ({
      symbol: r.symbol,
      name: r.description || null,
      type: r.type || null,
      exchange: r.primary?.[0] || null,
    }));
  }

  async getFundamentals(): Promise<Fundamentals> {
    // Finnhub fundamentals need paid endpoints; Yahoo covers this.
    throw new Error('Not supported by Finnhub free tier');
  }
}

// ---------------------------------------------------------------------------
// Aggregator: tries providers in order, merges fields, honest labeling
// ---------------------------------------------------------------------------
interface CacheEntry {
  expires: number;
  data: any;
}
const cache = new Map<string, CacheEntry>();
const TTL = { quotes: 60_000, history: 30 * 60_000, news: 15 * 60_000, search: 60 * 60_000, fundamentals: 60 * 60_000, indices: 60_000, screener: 15 * 60_000 };

function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as Promise<T>;
  const p = fn();
  // Cache the promise itself so concurrent callers share one fetch.
  cache.set(key, { expires: Date.now() + ttl, data: p });
  p.catch(() => cache.delete(key)); // don't cache failures
  return p;
}

class AggregatedProvider {
  private finnhub = new FinnhubProvider();
  private yahoo = new YahooProvider();

  /** Human-readable list of providers that served this response. */
  private labels(): string[] {
    const out = [];
    if (this.finnhub.available()) out.push(this.finnhub.label);
    out.push(this.yahoo.label);
    return out;
  }

  async getQuotes(symbols: string[]) {
    const list = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))).slice(0, 50);
    return cached(`quotes:${list.join(',')}`, TTL.quotes, async () => {
      // Finnhub first (licensed) for price fields, Yahoo fills the rest.
      let fin: { quotes: Record<string, Quote>; errors: Record<string, string> } = { quotes: {}, errors: {} };
      if (this.finnhub.available()) {
        try {
          fin = await this.finnhub.getQuotes(list);
        } catch (e) {
          console.warn('Finnhub quotes failed, falling back to Yahoo:', (e as Error).message);
        }
      }
      const y = await this.yahoo.getQuotes(list);
      const quotes: Record<string, Quote> = {};
      const errors: Record<string, string> = {};
      for (const sym of list) {
        if (fin.quotes[sym] && y.quotes[sym]) quotes[sym] = mergeQuotes(fin.quotes[sym], y.quotes[sym]);
        else if (fin.quotes[sym]) quotes[sym] = fin.quotes[sym];
        else if (y.quotes[sym]) quotes[sym] = y.quotes[sym];
        else errors[sym] = fin.errors[sym] || y.errors[sym] || 'No data from any provider';
      }
      return { provider: this.labels().join(' + '), quotes, errors };
    });
  }

  async getHistory(symbol: string, range: string) {
    const sym = symbol.trim().toUpperCase();
    return cached(`history:${sym}:${range}`, TTL.history, () => this.yahoo.getHistory(sym, range));
  }

  async getIndices() {
    return cached('indices', TTL.indices, () => this.yahoo.getIndices());
  }

  async getNews(symbols: string[], count = 10) {
    const list = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))).slice(0, 10);
    return cached(`news:${list.join(',')}:${count}`, TTL.news, async () => {
      // Finnhub company news first (licensed), Yahoo fills gaps.
      const articles: NewsArticle[] = [];
      const seen = new Set<string>();
      const push = (a: NewsArticle[]) => {
        for (const art of a) {
          const key = art.link || art.title;
          if (!seen.has(key)) {
            seen.add(key);
            articles.push(art);
          }
        }
      };
      if (this.finnhub.available()) {
        const results = await Promise.allSettled(list.map((s) => this.finnhub.getNews(s, count)));
        results.forEach((r) => {
          if (r.status === 'fulfilled') push(r.value);
        });
      }
      if (articles.length < count) {
        const results = await Promise.allSettled(list.map((s) => this.yahoo.getNews(s, count)));
        results.forEach((r) => {
          if (r.status === 'fulfilled') push(r.value);
        });
      }
      // Newest first; articles without dates go last.
      articles.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
      return { provider: this.labels().join(' + '), symbols: list, articles: articles.slice(0, count * list.length) };
    });
  }

  async search(query: string) {
    const q = query.trim();
    if (!q) return { quotes: [] as SearchResult[] };
    return cached(`search:${q}`, TTL.search, async () => {
      if (this.finnhub.available()) {
        try {
          return { quotes: await this.finnhub.search(q) };
        } catch (e) {
          console.warn('Finnhub search failed, falling back to Yahoo:', (e as Error).message);
        }
      }
      return { quotes: await this.yahoo.search(q) };
    });
  }

  async getFundamentals(symbol: string) {
    const sym = symbol.trim().toUpperCase();
    return cached(`fundamentals:${sym}`, TTL.fundamentals, () => this.yahoo.getFundamentals(sym));
  }

  async screen(screenerId = 'most_actives') {
    return cached(`screener:${screenerId}`, TTL.screener, async () => ({
      provider: this.yahoo.label,
      results: await this.yahoo.screen(screenerId),
    }));
  }
}

export const marketData = new AggregatedProvider();
export const providerLabels = () =>
  (process.env.FINNHUB_API_KEY || '').trim() ? 'Finnhub + Yahoo Finance (unofficial)' : 'Yahoo Finance (unofficial)';
