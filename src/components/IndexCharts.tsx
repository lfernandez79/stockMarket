import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Market Indices — S&P 500, NASDAQ Composite, Dow Jones.
 *
 * All values come from the backend provider layer:
 *   GET /api/market/indices  -> current price + day change % per index
 *   GET /api/market/history?symbol=&range= -> close history for the chart
 *
 * Iron rule (same as the rest of the app): real provider data or "—".
 * Nothing is fabricated, interpolated, or guessed. Failed loads show an
 * honest error state with a retry button. Values are NOT labeled
 * "real-time" — they are the latest snapshot the provider returned.
 */

interface IndexSnapshot {
  symbol: string;
  name: string | null;
  price: number | null;
  changePct: number | null;
  sparkline: number[];
}

interface HistoryPoint {
  date: string; // ISO date
  close: number | null;
}

type Range = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

const RANGES: Range[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

const INDEX_DEFS: Array<{ symbol: string; shortName: string; color: string }> = [
  { symbol: '^GSPC', shortName: 'S&P 500', color: '#6366f1' },
  { symbol: '^IXIC', shortName: 'NASDAQ', color: '#06b6d4' },
  { symbol: '^DJI', shortName: 'Dow Jones', color: '#f59e0b' },
];

const INDICES_REFRESH_MS = 60_000; // matches backend indices cache TTL

export const IndexCharts: React.FC = () => {
  const [indices, setIndices] = useState<IndexSnapshot[] | null>(null);
  const [indicesError, setIndicesError] = useState<string | null>(null);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [provider, setProvider] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<string>('^GSPC');
  const [range, setRange] = useState<Range>('1M');
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const selectedDef = INDEX_DEFS.find((d) => d.symbol === selectedSymbol) ?? INDEX_DEFS[0];

  const fetchIndices = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/market/indices', { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Indices request failed (${res.status})`);
      setIndices(Array.isArray(data.indices) ? data.indices : []);
      setProvider(typeof data.provider === 'string' ? data.provider : null);
      setAsOf(typeof data.timestamp === 'string' ? data.timestamp : null);
      setIndicesError(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Failed to fetch indices:', err);
      setIndicesError(err?.message || 'Failed to load index data');
    } finally {
      setIndicesLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIndicesLoading(true);
    fetchIndices(controller.signal);
    const timer = setInterval(() => fetchIndices(), INDICES_REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [fetchIndices]);

  const fetchHistory = useCallback(async (symbol: string, r: Range, signal?: AbortSignal) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(
        `/api/market/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(r)}`,
        { signal }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `History request failed (${res.status})`);
      setHistory(Array.isArray(data.points) ? data.points : []);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Failed to fetch index history:', err);
      setHistoryError(err?.message || 'Failed to load index history');
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(selectedSymbol, range, controller.signal);
    return () => controller.abort();
  }, [selectedSymbol, range, fetchHistory]);

  const handleRetry = () => {
    setIndicesLoading(true);
    setIndicesError(null);
    fetchIndices();
    fetchHistory(selectedSymbol, range);
  };

  // Chart data: date labels + close. For 1D (intraday 15m points) show time.
  const chartData = useMemo(() => {
    if (!history) return [];
    return history
      .filter((p) => p.close !== null)
      .map((p) => {
        const d = new Date(p.date);
        const label =
          range === '1D'
            ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
            : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return { date: label, fullDate: d.toLocaleString(), close: p.close as number };
      });
  }, [history, range]);

  // Period change derived from the fetched history itself (first -> last close).
  const periodChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    if (!first || first === 0) return null;
    return { pct: ((last - first) / first) * 100, start: first, end: last };
  }, [chartData]);

  const selectedSnapshot = indices?.find((i) => i.symbol === selectedSymbol);

  return (
    <div className="theme-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" /> Market Indices
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            S&P 500, NASDAQ Composite &amp; Dow Jones
            {provider ? ` — data: ${provider}` : ''}
            {asOf ? ` · as of ${new Date(asOf).toLocaleTimeString()}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh indices"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${indicesLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Range selector — re-fetches history */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-semibold">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  range === r
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Index selector cards */}
      {indicesLoading && !indices ? (
        <p className="text-sm text-slate-500 py-4 text-center">Loading index data…</p>
      ) : indicesError && !indices ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-rose-800">Couldn&apos;t load index data</p>
          <p className="text-xs text-rose-600 mt-0.5">{indicesError}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          {INDEX_DEFS.map((def) => {
            const snap = indices?.find((i) => i.symbol === def.symbol);
            const isSelected = selectedSymbol === def.symbol;
            const up = (snap?.changePct ?? 0) >= 0;
            return (
              <button
                key={def.symbol}
                onClick={() => setSelectedSymbol(def.symbol)}
                className={`bg-white p-3 rounded-xl border shadow-2xs flex items-center justify-between text-left transition-all ${
                  isSelected
                    ? 'border-indigo-400 ring-2 ring-indigo-100'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: def.color }} />
                    {def.shortName}
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">
                    {snap?.price != null ? snap.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </div>
                  <div className="text-[10px] text-slate-400">Day change</div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${
                    snap?.changePct == null
                      ? 'text-slate-500 bg-slate-50 border-slate-200'
                      : up
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        : 'text-rose-700 bg-rose-50 border-rose-100'
                  }`}
                >
                  {snap?.changePct == null ? (
                    '—'
                  ) : (
                    <>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {up ? '+' : ''}
                      {snap.changePct.toFixed(2)}%
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected index chart */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm font-bold text-slate-900">{selectedDef.shortName}</span>
        {selectedSnapshot?.price != null && (
          <span className="text-sm text-slate-600 font-mono">
            {selectedSnapshot.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
        {periodChange && (
          <span
            className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${
              periodChange.pct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {periodChange.pct >= 0 ? '+' : ''}
            {periodChange.pct.toFixed(2)}% in {range}
          </span>
        )}
      </div>

      <div className="h-64 w-full relative">
        {historyLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-500">Loading chart…</p>
          </div>
        ) : historyError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-semibold text-rose-800">Couldn&apos;t load chart history</p>
            <p className="text-xs text-rose-600">{historyError}</p>
            <button
              onClick={() => fetchHistory(selectedSymbol, range)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-500">No history available for this range.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedDef.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={selectedDef.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                dy={5}
                minTickGap={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={['auto', 'auto']}
                tickFormatter={(val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                width={60}
              />
              <Tooltip content={<IndexTooltip color={selectedDef.color} name={selectedDef.shortName} />} />
              <Area
                type="monotone"
                dataKey="close"
                name={selectedDef.shortName}
                stroke={selectedDef.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorIndex)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const IndexTooltip = ({ active, payload, color, name }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0]?.payload || {};
    return (
      <div className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3 shadow-2xl text-xs font-sans min-w-[180px]">
        <div className="text-slate-400 border-b border-slate-800 pb-1.5 mb-2 font-semibold">
          {point.fullDate || point.date}
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-medium" style={{ color }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {name}:
          </span>
          <span className="font-bold text-white font-mono">
            {typeof point.close === 'number'
              ? point.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '—'}
          </span>
        </div>
      </div>
    );
  }
  return null;
};
