import React from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Sparkles, 
  Bot, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Activity, 
  HelpCircle, 
  Trash2,
  TrendingUp,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { Holding } from '../types';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: Holding[];
  isLiveUpdating: boolean;
  setIsLiveUpdating: (val: boolean) => void;
  lastSyncTime: string | null;
  isRefreshing: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenImportModal: () => void;
  onOpenAiInsights: () => void;
  onOpenCopilot: () => void;
  onManualRefresh: () => void;
  onOpenWelcomeModal?: () => void;
  onOpenAddModal: () => void;
  onResetData?: () => void;
}

export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
  isOpen,
  onClose,
  holdings,
  isLiveUpdating,
  setIsLiveUpdating,
  lastSyncTime,
  isRefreshing,
  soundEnabled,
  setSoundEnabled,
  onOpenImportModal,
  onOpenAiInsights,
  onOpenCopilot,
  onManualRefresh,
  onOpenWelcomeModal,
  onOpenAddModal,
  onResetData
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-slate-950/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal Container */}
      <div className="relative z-10 bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto p-5 text-white shadow-2xl animate-in slide-in-from-bottom-5">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Portfolio Actions</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {holdings.length} {holdings.length === 1 ? 'Position' : 'Positions'} &bull; Sync: {lastSyncTime || 'Just now'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {/* Import CSV */}
          <button
            onClick={() => {
              onClose();
              onOpenImportModal();
            }}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-left font-bold text-xs shadow-sm transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <div>
              <div>Import CSV</div>
              <div className="text-[10px] font-normal text-emerald-100">Brokerage File</div>
            </div>
          </button>

          {/* Add Position */}
          <button
            onClick={() => {
              onClose();
              onOpenAddModal();
            }}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-left font-bold text-xs border border-slate-700 transition-all"
          >
            <PlusCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div>Add Position</div>
              <div className="text-[10px] font-normal text-slate-400">Manual Entry</div>
            </div>
          </button>
        </div>

        {/* AI & Analytics Section */}
        <div className="space-y-2 mb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            AI &amp; Intelligence
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenCopilot();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">AI Copilot Chat</div>
                <div className="text-[10px] text-slate-400">Ask questions about your portfolio and market trends</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAiInsights();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-950 border border-purple-700 text-purple-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">AI Portfolio Insights</div>
                <div className="text-[10px] text-slate-400">Diversification analysis and growth recommendations</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </button>
        </div>

        {/* Live Controls & Preferences */}
        <div className="space-y-2 mb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Market Settings
          </div>

          {/* Live Sync Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-white">Real-Time Market Sync</div>
                <div className="text-[10px] text-slate-400">Live ticks during trading sessions</div>
              </div>
            </div>
            <button
              onClick={() => setIsLiveUpdating(!isLiveUpdating)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                isLiveUpdating 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {isLiveUpdating ? 'Active' : 'Paused'}
            </button>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
              <div>
                <div className="font-semibold text-white">Alert Audio Chimes</div>
                <div className="text-[10px] text-slate-400">Sound on price alert threshold trigger</div>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                soundEnabled 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? 'On' : 'Muted'}
            </button>
          </div>

          {/* Force Refresh */}
          <button
            onClick={() => {
              onManualRefresh();
              onClose();
            }}
            disabled={isRefreshing}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-left transition-all"
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw className={`h-4 w-4 text-slate-300 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <div>
                <div className="text-xs font-semibold text-white">Refresh Market Quotes</div>
                <div className="text-[10px] text-slate-400">Force immediate quote sync from provider</div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Sync Now</span>
          </button>
        </div>

        {/* Other actions (Welcome Guide & Reset) */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          {onOpenWelcomeModal && (
            <button
              onClick={() => {
                onClose();
                onOpenWelcomeModal();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Welcome Guide</span>
            </button>
          )}

          {holdings.length > 0 && onResetData && (
            <button
              onClick={() => {
                onClose();
                onResetData();
              }}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 py-2 px-3 rounded-lg hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Wipe &amp; Reset Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
