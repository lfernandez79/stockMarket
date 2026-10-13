import React, { useState, useEffect } from 'react';
import { X, Target, ShieldAlert, Award, TrendingUp, Sparkles, DollarSign, Calendar, BarChart2 } from 'lucide-react';
import { StockValuationDetails } from '../types';

interface ValuationRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
}

export const ValuationRadarModal: React.FC<ValuationRadarModalProps> = ({
  isOpen,
  onClose,
  symbol
}) => {
  const [details, setDetails] = useState<StockValuationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !symbol) return;
    setIsLoading(true);

    fetch(`/api/market/stock-details?symbol=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => {
        console.error('Failed to load stock valuation details:', err);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, symbol]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden text-slate-900">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{symbol} Valuation & Fair Value Radar</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PRO Model
                </span>
              </div>
              <p className="text-xs text-slate-400">Institutional Fair Value, Analyst Targets & Fundamentals</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-emerald-500 animate-spin" />
            <p className="text-sm font-semibold">Calculating discounted cash flow & analyst consensus model...</p>
          </div>
        ) : details ? (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Top Overview Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">{details.name}</div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  ${details.currentPrice.toFixed(2)}
                </div>
              </div>

              {/* Fair Value Discount Gauge */}
              <div className="text-right">
                <div className="text-xs text-slate-500 font-semibold">Fair Value Estimate</div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-lg font-bold font-mono text-emerald-600">
                    ${details.fairValueEstimate.toFixed(2)}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    details.fairValueDiscountPct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {details.fairValueDiscountPct >= 0 ? `${details.fairValueDiscountPct}% Undervalued` : `${Math.abs(details.fairValueDiscountPct)}% Premium`}
                  </span>
                </div>
              </div>
            </div>

            {/* Analyst Consensus & Target Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-emerald-50/50">
                <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-emerald-600" /> Wall Street Analyst Consensus
                </div>
                <div className="text-xl font-black text-slate-900">{details.analystRating}</div>
                <div className="text-xs text-slate-600 mt-1">Based on consensus institutional research ratings</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-indigo-50/50">
                <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-600" /> 12-Month Price Target
                </div>
                <div className="text-xl font-black text-slate-900 font-mono">${details.analystPriceTarget.toFixed(2)}</div>
                <div className="text-xs text-indigo-700 font-semibold mt-1">
                  +{(((details.analystPriceTarget - details.currentPrice) / details.currentPrice) * 100).toFixed(1)}% Expected Upside
                </div>
              </div>
            </div>

            {/* Key Valuation Ratios Table */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-slate-700" /> Valuation & Fundamentals Multiples
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">Trailing P/E</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{details.peRatio ?? 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">Forward P/E</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{details.forwardPE ?? 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">PEG Ratio</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{details.pegRatio ?? 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">Price / Book</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{details.priceToBook ?? 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">Dividend Yield</div>
                  <div className="text-sm font-bold text-emerald-600 font-mono mt-0.5">{details.dividendYield ? `${details.dividendYield}%` : '0.00%'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">Beta (Volatility)</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{details.beta ?? '1.0'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">52-Week High</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">${details.fiftyTwoWeekHigh.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium">52-Week Low</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">${details.fiftyTwoWeekLow.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Earnings Catalyst & Guidance */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-300">Upcoming Earnings Date</div>
                  <div className="text-sm font-bold text-white">{details.earningsDate}</div>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="text-slate-400 font-medium">Last Surprise</div>
                <div className="text-emerald-400 font-bold font-mono">+{details.epsSurprisePct}% EPS Beat</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close Radar
          </button>
        </div>
      </div>
    </div>
  );
};
