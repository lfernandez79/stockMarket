import React from 'react';
import { 
  TrendingUp, 
  Bell, 
  FileSpreadsheet, 
  Volume2, 
  VolumeX, 
  RefreshCw,
  Bot,
  Sparkles,
  Moon,
  Sun
} from 'lucide-react';
import { Holding, TriggeredAlert } from '../types';
import type { StreamState } from '../hooks/useLiveTicks';

interface HeaderProps {
  holdings: Holding[];
  isLiveUpdating: boolean;
  setIsLiveUpdating: (val: boolean) => void;
  lastSyncTime: string | null;
  streamState: StreamState;
  isRefreshing: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  triggeredAlerts: TriggeredAlert[];
  onOpenAlerts: () => void;
  onOpenImportModal: () => void;
  onOpenAiInsights: () => void;
  onOpenCopilot: () => void;
  onManualRefresh: () => void;
  onOpenWelcomeModal?: () => void;
  onResetData?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  holdings,
  isLiveUpdating,
  setIsLiveUpdating,
  lastSyncTime,
  streamState,
  isRefreshing,
  soundEnabled,
  setSoundEnabled,
  triggeredAlerts,
  onOpenAlerts,
  onOpenImportModal,
  onOpenAiInsights,
  onOpenCopilot,
  onManualRefresh,
  onOpenWelcomeModal,
  onResetData,
  onOpenMobileMenu
}) => {
  const unreadAlertsCount = triggeredAlerts.filter((a) => !a.read).length;

  type MarketSession = 'OPEN' | 'CLOSED';

  const getMarketSessionStatus = (date: Date = new Date()): MarketSession => {
    try {
      const etString = date.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      const etDate = new Date(etString);
      const day = etDate.getDay(); // 0 = Sun, 6 = Sat
      const hours = etDate.getHours();
      const minutes = etDate.getMinutes();
      const timeInMinutes = hours * 60 + minutes;

      // Weekends closed
      if (day === 0 || day === 6) {
        return 'CLOSED';
      }

      // Regular Market Hours: 9:30 AM (570 mins) to 4:00 PM (960 mins) ET
      if (timeInMinutes >= 570 && timeInMinutes < 960) {
        return 'OPEN';
      }

      return 'CLOSED';
    } catch {
      return 'OPEN';
    }
  };

  const [currentSession, setCurrentSession] = React.useState<MarketSession>(() => getMarketSessionStatus());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSession(getMarketSessionStatus());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const isMarketOpen = currentSession === 'OPEN' && isLiveUpdating;

  const getPortfolioLiveBadgeStyles = () => {
    if (!isLiveUpdating) {
      return {
        bgClass: 'bg-slate-800/90 border-slate-700 text-slate-400',
        dotClass: 'bg-slate-600',
        showPing: false,
        text: 'MARKET PAUSED'
      };
    }
    if (isMarketOpen) {
      return {
        bgClass: 'bg-emerald-950/90 border-emerald-700/60 text-emerald-400',
        dotClass: 'bg-emerald-500',
        showPing: true,
        text: 'REGULAR MARKET LIVE'
      };
    }
    return {
      bgClass: 'bg-slate-800/90 border-slate-700 text-slate-300',
      dotClass: 'bg-slate-500',
      showPing: false,
      text: 'MARKET CLOSED'
    };
  };

  const getLiveSyncButtonStyles = () => {
    if (!isLiveUpdating) {
      return {
        bgClass: 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white',
        dotClass: 'bg-slate-500',
        showPing: false,
        text: 'Paused'
      };
    }
    if (isMarketOpen) {
      return {
        bgClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60 hover:bg-emerald-900/60',
        dotClass: 'bg-emerald-500',
        showPing: true,
        text: 'Regular Market'
      };
    }
    return {
      bgClass: 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white',
      dotClass: 'bg-slate-500',
      showPing: false,
      text: 'Market Closed'
    };
  };

  const liveBadge = getPortfolioLiveBadgeStyles();
  const syncButton = getLiveSyncButtonStyles();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Live Portfolio Marquee Bar - Wider and Prominent with Infinite Carousel */}
      <div className="bg-slate-950 px-4 sm:px-6 py-2 text-xs border-b border-slate-800 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-3 shrink-0 mr-6 z-20 bg-slate-950 pr-4">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-md border font-mono font-bold tracking-wider ${liveBadge.bgClass}`}
            title={`Market Status: ${currentSession}`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {liveBadge.showPing && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${liveBadge.dotClass}`}></span>
            </span>
            <span>{liveBadge.text}</span>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            Sync: <span className="text-slate-200">{lastSyncTime || 'Just now'}</span>
          </span>
          {streamState === 'streaming' ? (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-700/60 bg-emerald-950/90 text-emerald-400 font-mono font-bold text-[10px] tracking-wider"
              title="Real-time trade streaming via Finnhub WebSocket"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              STREAMING
            </span>
          ) : streamState === 'polling' && isLiveUpdating ? (
            <span
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md border border-slate-700 bg-slate-800/90 text-slate-400 font-mono font-bold text-[10px] tracking-wider"
              title="Polling quotes — streaming unavailable (no Finnhub key or reconnecting)"
            >
              POLLING
            </span>
          ) : null}
        </div>

        {/* News Outlet Style Infinite Ticker Carousel */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none"></div>

          {holdings.length === 0 ? (
            <div className="flex items-center justify-between text-xs text-slate-400 py-0.5">
              <span className="truncate">
                ✨ Ready for your portfolio &mdash; Click <strong className="text-emerald-400">Import CSV</strong> or <strong className="text-emerald-400">Welcome Guide</strong> to begin tracking real-time performance.
              </span>
              <div className="hidden lg:flex items-center gap-4 text-[11px] font-mono text-slate-300 shrink-0 ml-4">
                <span>SPY $563.45 <span className="text-emerald-400">+0.32%</span></span>
                <span>QQQ $482.10 <span className="text-emerald-400">+0.45%</span></span>
                <span>DIA $407.68 <span className="text-emerald-400">+0.18%</span></span>
              </div>
            </div>
          ) : (
            <div className="animate-marquee flex items-center gap-8 py-0.5 text-slate-300 font-mono">
              {[...holdings, ...holdings].map((h, idx) => {
                const dayPct = h.previousClose > 0 ? ((h.currentPrice - h.previousClose) / h.previousClose) * 100 : 0;
                const isUp = dayPct >= 0;
                return (
                  <div key={`${h.id}-${idx}`} className="flex items-center gap-1.5 shrink-0 hover:text-white transition-colors cursor-default">
                    <span className="font-bold text-slate-200">{h.symbol}</span>
                    <span className="text-slate-400">${h.currentPrice.toFixed(2)}</span>
                    <span className={`flex items-center font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}{dayPct.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/40 font-bold">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Holdings Tracker
              </h1>
              <p className="text-xs text-slate-400">
                Real-time portfolio monitoring &amp; performance analytics
              </p>
            </div>
          </div>

          {/* Core Actions & Controls */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            {/* Welcome / Get Started Button */}
            {onOpenWelcomeModal && (
              <button
                onClick={onOpenWelcomeModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all"
                title="Open Welcome Guide & Quick Importer"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Get Started</span>
              </button>
            )}

            {/* Live Sync Toggle */}
            <button
              onClick={() => setIsLiveUpdating(!isLiveUpdating)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${syncButton.bgClass}`}
              title={`Click to toggle update status (Current Mode: ${syncButton.text})`}
            >
              <span className="relative flex h-2 w-2">
                {syncButton.showPing && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${syncButton.dotClass}`}></span>
              </span>
              <span>{syncButton.text}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
              title={`Force price refresh (Last sync: ${lastSyncTime || 'now'})`}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-800/60 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Alert Chimes Enabled' : 'Alert Chimes Muted'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* AI Copilot Button */}
            <button
              onClick={onOpenCopilot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow transition-all"
              title="Open AI Copilot Portfolio Assistant"
            >
              <Bot className="h-4 w-4 text-emerald-200" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* AI Insights Button */}
            <button
              onClick={onOpenAiInsights}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
              title="Open AI Portfolio Insights & Optimization"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="hidden sm:inline">AI Insights</span>
            </button>

            {/* Import CSV Button */}
            <button
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Import CSV</span>
            </button>

            {/* Reset / Wipe Data Button (if user has holdings) */}
            {holdings.length > 0 && onResetData && (
              <button
                onClick={onResetData}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800/80 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                title="Wipe & Reset all portfolio data"
              >
                Reset
              </button>
            )}

            {/* Alerts Drawer Button */}
            <button
              onClick={onOpenAlerts}
              className="relative flex items-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-all"
              title="View Real-Time Price Alerts"
            >
              <Bell className="h-4 w-4 text-amber-400" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {unreadAlertsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
