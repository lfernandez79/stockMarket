import React from 'react';
import { Bell, Sparkles, X, ShieldAlert, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { TriggeredAlert } from '../types';

interface LiveToastContainerProps {
  toasts: TriggeredAlert[];
  onCloseToast: (id: string) => void;
  onExplainToast: (alert: TriggeredAlert) => void;
}

export const LiveToastContainer: React.FC<LiveToastContainerProps> = ({
  toasts,
  onCloseToast,
  onExplainToast
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 relative overflow-hidden"
        >
          {/* Accent Line */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1.5 ${
              toast.severity === 'critical' ? 'bg-rose-500' :
              toast.severity === 'warning' ? 'bg-amber-500' :
              toast.severity === 'gain' ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
          />

          <div className="mt-0.5 shrink-0 pl-1">
            {toast.severity === 'critical' ? (
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            ) : toast.severity === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            ) : toast.severity === 'gain' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Info className="h-5 w-5 text-blue-400" />
            )}
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span>{toast.title}</span>
              {toast.symbol && (
                <span className="font-mono text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                  {toast.symbol}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 font-mono">{toast.description}</p>

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => onExplainToast(toast)}
                className="flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200 transition-colors"
              >
                <Sparkles className="h-3 w-3 text-amber-400" /> Explain with AI
              </button>
            </div>
          </div>

          <button
            onClick={() => onCloseToast(toast.id)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
