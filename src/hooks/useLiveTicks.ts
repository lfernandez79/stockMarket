import { useEffect, useRef, useState } from 'react';

export type StreamState = 'streaming' | 'polling' | 'off';

export interface LiveTick {
  symbol: string;
  price: number;
  volume: number | null;
  timestamp: string;
}

/**
 * Subscribes to real-time trade ticks over the app's WebSocket hub
 * (ws(s)://host/api/stream). The server streams only when a Finnhub key is
 * configured; otherwise it reports streaming:false and the caller should
 * keep REST polling. Reconnects with backoff on drops.
 */
export function useLiveTicks(
  symbols: string[],
  enabled: boolean,
  onTicks: (ticks: LiveTick[]) => void
): StreamState {
  const [state, setState] = useState<StreamState>('off');
  const onTicksRef = useRef(onTicks);
  onTicksRef.current = onTicks;
  const symbolsKey = [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join(',');

  useEffect(() => {
    if (!enabled || !symbolsKey) {
      setState('off');
      return;
    }

    let ws: WebSocket | null = null;
    let closed = false;
    let retryDelayMs = 1000;
    let retryTimer: number | null = null;
    let fallbackTimer: number | null = null;

    const connect = () => {
      if (closed) return;
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${proto}//${window.location.host}/api/stream`);
      } catch {
        setState('polling');
        return;
      }

      ws.onopen = () => {
        retryDelayMs = 1000;
        ws?.send(JSON.stringify({ type: 'subscribe', symbols: symbolsKey.split(',') }));
        // If the server never declares streaming capability, assume polling.
        fallbackTimer = window.setTimeout(() => {
          setState((s) => (s === 'off' ? 'polling' : s));
        }, 8000);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'status') {
            if (fallbackTimer) {
              clearTimeout(fallbackTimer);
              fallbackTimer = null;
            }
            setState(msg.streaming === true ? 'streaming' : 'polling');
          } else if (msg.type === 'ticks' && Array.isArray(msg.ticks)) {
            setState('streaming');
            onTicksRef.current(msg.ticks as LiveTick[]);
          }
        } catch {
          // Ignore malformed frames.
        }
      };

      const scheduleRetry = () => {
        if (closed) return;
        setState('polling');
        retryTimer = window.setTimeout(connect, Math.min(retryDelayMs, 30000));
        retryDelayMs *= 2;
      };

      ws.onclose = scheduleRetry;
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          // ignore
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  }, [symbolsKey, enabled]);

  return state;
}
