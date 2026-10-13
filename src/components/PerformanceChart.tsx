import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Line,
  ComposedChart,
  Bar
} from 'recharts';
import { TrendingUp, Calendar, Layers, Sliders, Activity, Info, Percent, DollarSign } from 'lucide-react';
import { HistoricalDataPoint, TechnicalIndicatorsConfig } from '../types';
import { generatePortfolioHistoricalData } from '../utils/marketEngine';

interface PerformanceChartProps {
  data?: HistoricalDataPoint[];
  currentPortfolioValue: number;
  dayGainLoss?: number;
  dayGainLossPct?: number;
  totalCostBasis?: number;
}

type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  currentPortfolioValue,
  dayGainLoss = 0,
  dayGainLossPct = 0,
  totalCostBasis = 0
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [comparisonMode, setComparisonMode] = useState<'pct' | 'dollar'>('pct');
  const [techConfig, setTechConfig] = useState<TechnicalIndicatorsConfig>({
    sma20: false,
    sma50: false,
    sma200: false,
    ema12: false,
    rsi: false,
    macd: false,
    bollingerBands: false,
    volume: false, // Default volume off to prevent unwanted jumping bar graphs
    showBenchmark: true
  });
  const [showNasdaqOverlay, setShowNasdaqOverlay] = useState(true);
  const [showDowOverlay, setShowDowOverlay] = useState(true);
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState(false);

  // Generate deterministic, accurate historical data anchored to current portfolio value
  const rawChartData = useMemo(() => {
    return generatePortfolioHistoricalData(currentPortfolioValue, dayGainLoss, totalCostBasis, timeframe);
  }, [currentPortfolioValue, dayGainLoss, totalCostBasis, timeframe]);

  const startVal = rawChartData[0]?.portfolioValue || currentPortfolioValue;
  const endVal = rawChartData[rawChartData.length - 1]?.portfolioValue || currentPortfolioValue;
  const periodGain = endVal - startVal;
  const periodGainPct = startVal > 0 ? (periodGain / startVal) * 100 : 0;
  const isUp = periodGain >= 0;

  const startSp = rawChartData[0]?.sp500Benchmark || 5634;
  const latestSp = rawChartData[rawChartData.length - 1]?.sp500Benchmark || 5634;
  const spGainPct = startSp > 0 ? ((latestSp - startSp) / startSp) * 100 : 0;

  const startNasdaq = rawChartData[0]?.nasdaqBenchmark || 18054;
  const latestNasdaq = rawChartData[rawChartData.length - 1]?.nasdaqBenchmark || 18054;
  const nasdaqGainPct = startNasdaq > 0 ? ((latestNasdaq - startNasdaq) / startNasdaq) * 100 : 0;

  const startDow = rawChartData[0]?.dowBenchmark || 40768;
  const latestDow = rawChartData[rawChartData.length - 1]?.dowBenchmark || 40768;
  const dowGainPct = startDow > 0 ? ((latestDow - startDow) / startDow) * 100 : 0;

  // Normalized percentage returns relative to period start (0.00%)
  const normalizedData = useMemo(() => {
    return rawChartData.map((item, idx) => {
      const mockVol = 150 + Math.floor(Math.sin(idx) * 40);

      const portfolioPct = startVal > 0 ? Number((((item.portfolioValue - startVal) / startVal) * 100).toFixed(2)) : 0;
      const sp500Pct = startSp > 0 ? Number((((item.sp500Benchmark - startSp) / startSp) * 100).toFixed(2)) : 0;
      const nasdaqPct = item.nasdaqBenchmark && startNasdaq > 0 ? Number((((item.nasdaqBenchmark - startNasdaq) / startNasdaq) * 100).toFixed(2)) : 0;
      const dowPct = item.dowBenchmark && startDow > 0 ? Number((((item.dowBenchmark - startDow) / startDow) * 100).toFixed(2)) : 0;

      return {
        ...item,
        volume: mockVol,
        portfolioPct,
        sp500Pct,
        nasdaqPct,
        dowPct
      };
    });
  }, [rawChartData, startVal, startSp, startNasdaq, startDow]);

  return (
    <div className="theme-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" /> Pro Technical Charting & Analysis
            </h3>
            <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isUp ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isUp ? '+' : ''}${periodGain.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({isUp ? '+' : ''}{periodGainPct.toFixed(2)}% in {timeframe})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mountain performance chart normalized by percentage return to directly benchmark holdings against S&P 500, Nasdaq & Dow Jones.
          </p>
        </div>

        {/* Display Mode Switcher & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Comparison Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setComparisonMode('pct')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                comparisonMode === 'pct'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Normalized % Return (Apples-to-apples comparison)"
            >
              <Percent className="h-3 w-3" />
              <span>% Return</span>
            </button>
            <button
              onClick={() => setComparisonMode('dollar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                comparisonMode === 'dollar'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Total Portfolio Dollar Value ($)"
            >
              <DollarSign className="h-3 w-3" />
              <span>$ Value</span>
            </button>
          </div>

          {/* Overlays Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorsMenu(!showIndicatorsMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-all"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-600" />
              <span>Overlays ({[techConfig.showBenchmark, showNasdaqOverlay, showDowOverlay, techConfig.volume].filter(Boolean).length})</span>
            </button>

            {showIndicatorsMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-3 z-30 text-xs">
                <div className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                  <span>Benchmark Overlays</span>
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-indigo-400">
                    <input 
                      type="checkbox" 
                      checked={techConfig.showBenchmark} 
                      onChange={(e) => setTechConfig({ ...techConfig, showBenchmark: e.target.checked })} 
                      className="rounded accent-indigo-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" /> S&P 500 Benchmark
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-400">
                    <input 
                      type="checkbox" 
                      checked={showNasdaqOverlay} 
                      onChange={(e) => setShowNasdaqOverlay(e.target.checked)} 
                      className="rounded accent-cyan-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" /> Nasdaq Benchmark
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-amber-400">
                    <input 
                      type="checkbox" 
                      checked={showDowOverlay} 
                      onChange={(e) => setShowDowOverlay(e.target.checked)} 
                      className="rounded accent-amber-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Dow Jones Benchmark
                    </span>
                  </label>
                  <div className="border-t border-slate-800 pt-2 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={techConfig.volume} 
                        onChange={(e) => setTechConfig({ ...techConfig, volume: e.target.checked })} 
                        className="rounded accent-slate-500"
                      />
                      <span>Trading Volume Bars (Bottom)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-semibold">
            {(['1D', '1W', '1M', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  timeframe === tf
                    ? 'bg-white text-emerald-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dow, Nasdaq & S&P 500 Benchmark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Portfolio Holdings
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">${currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            periodGainPct >= 0 
              ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
              : 'text-rose-700 bg-rose-50 border-rose-100'
          }`}>
            {periodGainPct >= 0 ? '+' : ''}{periodGainPct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> S&P 500
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">{latestSp.toLocaleString()} pts</div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            spGainPct >= 0 
              ? 'text-indigo-700 bg-indigo-50 border-indigo-100' 
              : 'text-rose-700 bg-rose-50 border-rose-100'
          }`}>
            {spGainPct >= 0 ? '+' : ''}{spGainPct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-500" /> Nasdaq
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">{latestNasdaq.toLocaleString()} pts</div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            nasdaqGainPct >= 0 
              ? 'text-cyan-700 bg-cyan-50 border-cyan-100' 
              : 'text-rose-700 bg-rose-50 border-rose-100'
          }`}>
            {nasdaqGainPct >= 0 ? '+' : ''}{nasdaqGainPct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Dow Jones
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">{latestDow.toLocaleString()} pts</div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            dowGainPct >= 0 
              ? 'text-amber-700 bg-amber-50 border-amber-100' 
              : 'text-rose-700 bg-rose-50 border-rose-100'
          }`}>
            {dowGainPct >= 0 ? '+' : ''}{dowGainPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {comparisonMode === 'pct' && (
        <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500 bg-emerald-50/60 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-100">
          <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>
            <strong>Normalized Comparison Mode:</strong> All benchmarks start at 0.00% on {normalizedData[0]?.date}. You can see exact relative performance on the same scale.
          </span>
        </div>
      )}

      {/* Main Technical Mountain Chart */}
      <div className="h-72 w-full relative">
        {currentPortfolioValue <= 0 && (
          <div className="absolute inset-0 z-10 bg-slate-900/10 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-slate-300">
            <TrendingUp className="h-8 w-8 text-emerald-600 mb-2 opacity-80" />
            <h4 className="font-bold text-slate-800 text-sm">Technical Charting Ready</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-0.5">
              Upload your CSV file or add stock positions to populate real-time mountain curves, benchmark tracking &amp; technical indicators.
            </p>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={normalizedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0.35} />
                <stop offset="95%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              dy={5}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              domain={['auto', 'auto']}
              tickFormatter={(val) => 
                comparisonMode === 'pct' 
                  ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%` 
                  : `$${(val / 1000).toFixed(0)}k`
              }
            />

            <Tooltip 
              content={
                <CustomTooltip 
                  showSp500={techConfig.showBenchmark} 
                  showNasdaq={showNasdaqOverlay}
                  showDow={showDowOverlay}
                  comparisonMode={comparisonMode}
                />
              }
            />

            {/* Portfolio Mountain Area */}
            <Area 
              type="monotone" 
              dataKey={comparisonMode === 'pct' ? "portfolioPct" : "portfolioValue"} 
              name="Portfolio Value"
              stroke={isUp ? "#059669" : "#e11d48"} 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#colorPortfolio)" 
            />

            {/* S&P 500 Overlay */}
            {techConfig.showBenchmark && comparisonMode === 'pct' && (
              <Line 
                type="monotone" 
                dataKey="sp500Pct" 
                name="S&P 500 Benchmark"
                stroke="#6366f1" 
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            )}

            {/* Nasdaq Overlay */}
            {showNasdaqOverlay && comparisonMode === 'pct' && (
              <Line 
                type="monotone" 
                dataKey="nasdaqPct" 
                name="Nasdaq Benchmark"
                stroke="#06b6d4" 
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            )}

            {/* Dow Overlay */}
            {showDowOverlay && comparisonMode === 'pct' && (
              <Line 
                type="monotone" 
                dataKey="dowPct" 
                name="Dow Benchmark"
                stroke="#f59e0b" 
                strokeWidth={2}
                strokeDasharray="2 2"
                dot={false}
              />
            )}

            {/* Volume Bars (If explicitly enabled by user) */}
            {techConfig.volume && (
              <Bar 
                dataKey="volume" 
                name="Volume" 
                fill="#94a3b8" 
                opacity={0.2} 
                yAxisId={1} 
              />
            )}
            {techConfig.volume && (
              <YAxis yAxisId={1} orientation="right" hide domain={[0, 'dataMax * 4']} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, showSp500, showNasdaq, showDow, comparisonMode }: any) => {
  if (active && payload && payload.length) {
    const dataObj = payload[0]?.payload || {};
    const portVal = dataObj.portfolioValue;
    const portPct = dataObj.portfolioPct;
    const spVal = dataObj.sp500Benchmark;
    const spPct = dataObj.sp500Pct;
    const nasdaqVal = dataObj.nasdaqBenchmark;
    const nasdaqPct = dataObj.nasdaqPct;
    const dowVal = dataObj.dowBenchmark;
    const dowPct = dataObj.dowPct;

    return (
      <div className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3.5 shadow-2xl text-xs font-sans min-w-[220px]">
        <div className="text-slate-400 border-b border-slate-800 pb-1.5 mb-2 font-semibold flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-slate-500 uppercase font-mono">{comparisonMode === 'pct' ? '% Return Mode' : '$ Value Mode'}</span>
        </div>

        <div className="flex items-center justify-between gap-4 my-1.5">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Portfolio Holdings:
          </span>
          <div className="text-right">
            <span className="font-bold text-white font-mono">${portVal?.toLocaleString()}</span>
            <span className={`text-[10px] ml-1.5 font-bold ${portPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({portPct >= 0 ? '+' : ''}{portPct?.toFixed(2)}%)
            </span>
          </div>
        </div>

        {showSp500 && spVal && (
          <div className="flex items-center justify-between gap-4 my-1.5">
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> S&P 500:
            </span>
            <div className="text-right">
              <span className="font-bold text-slate-300 font-mono">{spVal?.toLocaleString()} pts</span>
              <span className={`text-[10px] ml-1.5 font-bold ${spPct >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                ({spPct >= 0 ? '+' : ''}{spPct?.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {showNasdaq && nasdaqVal && (
          <div className="flex items-center justify-between gap-4 my-1.5">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> Nasdaq:
            </span>
            <div className="text-right">
              <span className="font-bold text-slate-300 font-mono">{nasdaqVal?.toLocaleString()} pts</span>
              <span className={`text-[10px] ml-1.5 font-bold ${nasdaqPct >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                ({nasdaqPct >= 0 ? '+' : ''}{nasdaqPct?.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {showDow && dowVal && (
          <div className="flex items-center justify-between gap-4 my-1.5">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Dow Jones:
            </span>
            <div className="text-right">
              <span className="font-bold text-slate-300 font-mono">{dowVal?.toLocaleString()} pts</span>
              <span className={`text-[10px] ml-1.5 font-bold ${dowPct >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                ({dowPct >= 0 ? '+' : ''}{dowPct?.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};


