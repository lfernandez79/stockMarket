import React, { useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Sparkles, 
  PlusCircle, 
  ShieldCheck, 
  TrendingUp, 
  LineChart, 
  Zap,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { Holding } from '../types';
import { parseFidelityCSV } from '../utils/marketEngine';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportHoldings: (importedHoldings: Holding[]) => void;
  onLoadSampleData: () => void;
  onOpenAddModal: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onImportHoldings,
  onLoadSampleData,
  onOpenAddModal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = parseFidelityCSV(content);
        if (parsed.length > 0) {
          onImportHoldings(parsed);
          onClose();
        } else {
          alert('Could not parse any valid positions from the CSV. Please check formatting or try the sample data.');
        }
      } catch (err: any) {
        alert('Error parsing CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 relative overflow-hidden">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center relative z-10 mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 mb-3">
            <TrendingUp className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome to Holdings Tracker
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Your real-time stock &amp; ETF portfolio dashboard is ready. Upload your brokerage CSV or start fresh to begin live tracking.
          </p>
        </div>

        {/* Action Options */}
        <div className="space-y-3 relative z-10">
          {/* Option 1: Upload CSV (Primary) */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group p-4 bg-emerald-50/80 hover:bg-emerald-100/90 border-2 border-dashed border-emerald-400 hover:border-emerald-500 rounded-2xl cursor-pointer transition-all flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm transition-colors">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-950 flex items-center gap-1.5">
                  Upload Brokerage CSV
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">Recommended</span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Supports Fidelity, Schwab, Vanguard, Robinhood &amp; standard CSV exports
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".csv, .txt" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>

          {/* Option 2: Load Sample Demo Data */}
          <button
            type="button"
            onClick={() => {
              onLoadSampleData();
              onClose();
            }}
            className="w-full group p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 transition-colors">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Generate Random Sample Portfolio
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate 3–5 random market stocks &amp; ETF holdings with randomized shares to test live ticks and charts
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Option 3: Manual Position Entry */}
          <button
            type="button"
            onClick={() => {
              onOpenAddModal();
              onClose();
            }}
            className="w-full group p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-slate-200 group-hover:bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 transition-colors">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Add Position Manually
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type in ticker symbols, share count, and purchase price one by one
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>

        {/* Feature Highlights Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500">
          <div className="flex flex-col items-center gap-1">
            <LineChart className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Pro Charting</span>
            <span className="text-[10px] text-slate-400">S&amp;P 500, Nasdaq &amp; Dow</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-slate-700">Live Ticker Updates</span>
            <span className="text-[10px] text-slate-400">Free Market Quotes</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span className="font-semibold text-slate-700">100% Private</span>
            <span className="text-[10px] text-slate-400">Data Stored in Browser</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-700 font-semibold transition-colors"
          >
            Or start with an empty dashboard &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
