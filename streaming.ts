/**
 * Real-time trade streaming: Finnhub WebSocket -> browser WebSocket hub.
 *
 * Requires FINNHUB_API_KEY. Without it the hub still accepts browser
 * connections but reports streaming:false, and the frontend keeps REST
 * polling. Nothing is simulated — no key means no stream, honestly shown.
 *
 * Flow: browser --(subscribe [symbols])--> hub --(subscribe)--> Finnhub WS
 *       Finnhub --(trade ticks)--> hub --(batched ticks, 500ms)--> browsers
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export interface Tick {
  symbol: string;
  price: number;
  volume: number | null;
  timestamp: string; // ISO
}

/** US equities session: Mon–Fri, 9:30–16:00 America/New_York. */
export function isMarketOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  const wd = get('weekday');
  if (wd === 'Sat' || wd === 'Sun') return false;
  const mins = parseInt(get('hour') || '0', 10) * 60 + parseInt(get('minute') || '0', 10);
  return mins >= 570 && mins < 960;
}

// ---------------------------------------------------------------------------
// Finnhub WebSocket client (server side, one shared connection)
// ---------------------------------------------------------------------------
class FinnhubStream {
  private ws: WebSocket | null = null;
  private wanted = new Set<string>();
  private subscribed = new Set<string>();
  private reconnectDelayMs = 1000;
  private intentionalClose = false;
  onTick: (tick: Tick) => void = () => undefined;

  get key(): string | null {
    const k = (process.env.FINNHUB_API_KEY || '').trim();
    return k ? k : null;
  }

  get available(): boolean {
    return this.key !== null;
  }

  /** Browser clients declare which symbols they care about. */
  want(symbols: string[]): void {
    let changed = false;
    for (const s of symbols) {
      const sym = s.trim().toUpperCase();
      if (sym && !this.wanted.has(sym)) {
        this.wanted.add(sym);
        changed = true;
      }
    }
    if (changed) {
      this.syncSubscriptions();
      if (this.available && !this.ws) this.connect();
    }
  }

  private connect(): void {
    const key = this.key;
    if (!key || this.ws) return;
    this.intentionalClose = false;
    // FINNHUB_WS_URL override exists for local testing against a mock server.
    const url = process.env.FINNHUB_WS_URL || 'wss://ws.finnhub.io';
    const ws = new WebSocket(`${url}?token=${encodeURIComponent(key)}`);
    this.ws = ws;

    ws.on('open', () => {
      this.reconnectDelayMs = 1000;
      this.subscribed.clear();
      this.syncSubscriptions();
      console.log('[stream] Finnhub WebSocket connected');
    });

    ws.on('message', (data) => this.handleMessage(data.toString()));

    ws.on('close', () => {
      this.ws = null;
      this.subscribed.clear();
      console.log('[stream] Finnhub WebSocket closed');
      if (!this.intentionalClose && this.wanted.size > 0) {
        const delay = Math.min(this.reconnectDelayMs, 30000);
        setTimeout(() => this.connect(), delay);
        this.reconnectDelayMs *= 2;
      }
    });

    ws.on('error', (err) => {
      console.warn('[stream] Finnhub WebSocket error:', (err as Error).message);
      // 'close' follows and triggers the reconnect path.
    });
  }

  private syncSubscriptions(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    for (const s of this.wanted) {
      if (!this.subscribed.has(s)) {
        this.ws.send(JSON.stringify({ type: 'subscribe', symbol: s }));
        this.subscribed.add(s);
      }
    }
  }

  private handleMessage(raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === 'ping') return; // Finnhub requires no pong.
    if (msg.type === 'error') {
      console.warn('[stream] Finnhub error:', msg.msg || raw.slice(0, 120));
      return;
    }
    if (msg.type === 'trade' && Array.isArray(msg.data)) {
      for (const t of msg.data) {
        const price = typeof t.p === 'number' && isFinite(t.p) ? t.p : null;
        if (!t.s || price === null) continue;
        this.onTick({
          symbol: String(t.s).toUpperCase(),
          price,
          volume: typeof t.v === 'number' && isFinite(t.v) ? t.v : null,
          timestamp: new Date(typeof t.t === 'number' ? t.t * 1000 : Date.now()).toISOString(),
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Browser-facing hub: batches ticks (500ms, latest-wins per symbol)
// ---------------------------------------------------------------------------
const FLUSH_MS = 500;

class StreamHub {
  private wss: WebSocketServer | null = null;
  private finnhub = new FinnhubStream();
  private pending = new Map<string, Tick>();
  private flushTimer: NodeJS.Timeout | null = null;

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/api/stream' });
    this.finnhub.onTick = (tick) => this.enqueue(tick);

    this.wss.on('connection', (ws) => {
      // Honest capability advertisement on connect.
      ws.send(
        JSON.stringify({
          type: 'status',
          streaming: this.finnhub.available,
          marketOpen: isMarketOpen(),
        })
      );
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
            this.finnhub.want(msg.symbols.filter((s: any) => typeof s === 'string').slice(0, 100));
          }
        } catch {
          // Ignore malformed client messages.
        }
      });
    });

    console.log('[stream] WebSocket hub listening on /api/stream');
  }

  private enqueue(tick: Tick): void {
    this.pending.set(tick.symbol, tick); // latest tick wins per symbol
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), FLUSH_MS);
    }
  }

  private flush(): void {
    this.flushTimer = null;
    if (this.pending.size === 0 || !this.wss) return;
    const ticks = [...this.pending.values()];
    this.pending.clear();
    const payload = JSON.stringify({ type: 'ticks', ticks });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}

export const streamHub = new StreamHub();
