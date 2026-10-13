import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Briefcase, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';
import { SectorAllocationCard } from './SectorAllocationCard';
import { PortfolioSummary, Holding } from '../types';

interface PortfolioOverviewProps {
  summary: PortfolioSummary;
  holdingsCount: number;
  holdings?: Holding[];
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ summary, holdingsCount, holdings = [] }) => {
  const isPositiveDay = summary.dayGainLoss >= 0;
  const isPositiveTotal = summary.totalProfitLoss >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Fidelity Portfolio & Today's Performance Combined */}
      <div className="theme-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-emerald-600" /> Total Portfolio
            </span>
            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3 w-3 mr-0.5" /> Live
            </span>
          </div>

          {/* Total Value */}
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight my-1">
            ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {/* Today's Performance Values directly under Portfolio Value */}
          <div className="flex items-center gap-2 mt-1.5 mb-1">
            <span className={`inline-flex items-center font-mono text-xs sm:text-sm font-bold px-2 py-0.5 rounded-md border ${
              isPositiveDay 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                : 'bg-rose-50 text-rose-700 border-rose-200/80'
            }`}>
              {isPositiveDay ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 shrink-0" />}
              {isPositiveDay ? '+' : ''}${summary.dayGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositiveDay ? '+' : ''}{summary.dayGainLossPct.toFixed(2)}%)
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Today</span>
          </div>
        </div>

        {/* Cost Basis & Positions */}
        <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span>Cost Basis: <strong className="font-mono text-slate-700">${summary.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <span className="font-medium text-slate-600">{holdingsCount} Positions</span>
        </div>
      </div>

      {/* Total All-Time Return */}
      <div className="theme-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
        <div className={`absolute top-0 right-0 w-24 h-24 ${isPositiveTotal ? 'bg-emerald-500/5' : 'bg-rose-500/5'} rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform`} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-indigo-600" /> Total Profit / Loss
            </span>
            <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
              isPositiveTotal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isPositiveTotal ? '+' : ''}{summary.totalProfitLossPct.toFixed(2)}%
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1 ${isPositiveTotal ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositiveTotal ? '+' : ''}${summary.totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Unrealized cumulative gain across all positions
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between">
          <span>Cumulative Return</span>
          <span className="font-semibold text-slate-700">All-Time</span>
        </div>
      </div>

      {/* Sector Allocation Card (Yahoo Finance Carousel Style) */}
      <SectorAllocationCard holdings={holdings} summary={summary} />
    </div>
  );
};
