import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Edit2, 
  Trash2, 
  BellPlus, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Building2,
  Tag,
  Clock,
  Target,
  ExternalLink
} from 'lucide-react';
import { Holding, AccountType, AssetType } from '../types';
import { calculateForwardYield, getKnownDividendYield } from '../utils/marketEngine';

interface HoldingsTableProps {
  holdings: Holding[];
  totalPortfolioValue: number;
  onEditHolding: (holding: Holding) => void;
  onDeleteHolding: (id: string) => void;
  onCreateStockAlert: (holding: Holding) => void;
  onOpenAddModal: () => void;
  onOpenValuationRadar?: (symbol: string) => void;
  onSelectStockDetail?: (holding: Holding) => void;
}

type SortField = 'symbol' | 'value' | 'dayChange' | 'totalReturn' | 'shares' | 'dividend';

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  totalPortfolioValue,
  onEditHolding,
  onDeleteHolding,
  onCreateStockAlert,
  onOpenAddModal,
  onOpenValuationRadar,
  onSelectStockDetail
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortAsc, setSortAsc] = useState(false);

  const getDividendYieldPct = (h: Holding): number => {
    const yieldVal = calculateForwardYield(h.annualDividendRate, h.currentPrice, h.symbol, h.assetType);
    return typeof yieldVal === 'number' && !isNaN(yieldVal) ? yieldVal : 0;
  };

  // Filter holdings
  const filteredHoldings = holdings.filter((h) => {
    const matchesSearch = 
      h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccount = accountFilter === 'ALL' || h.accountType === accountFilter;
    const matchesAsset = assetFilter === 'ALL' || h.assetType === assetFilter;
    return matchesSearch && matchesAccount && matchesAsset;
  });

  // Sort holdings
  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    if (sortField === 'symbol') {
      return sortAsc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
    } else if (sortField === 'value') {
      aVal = a.shares * a.currentPrice;
      bVal = b.shares * b.currentPrice;
    } else if (sortField === 'dayChange') {
      aVal = ((a.currentPrice - a.previousClose) / a.previousClose) * 100;
      bVal = ((b.currentPrice - b.previousClose) / b.previousClose) * 100;
    } else if (sortField === 'totalReturn') {
      aVal = ((a.currentPrice - a.costBasisPerShare) / a.costBasisPerShare) * 100;
      bVal = ((b.currentPrice - b.costBasisPerShare) / b.costBasisPerShare) * 100;
    } else if (sortField === 'shares') {
      aVal = a.shares;
      bVal = b.shares;
    } else if (sortField === 'dividend') {
      aVal = getDividendYieldPct(a);
      bVal = getDividendYieldPct(b);
    }

    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" /> Owned Shares &amp; Portfolio Holdings
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your individual stocks, index funds, ETFs, and cash reserves across accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-48 sm:w-60"
            />
          </div>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Brokerage Accounts</option>
            <option value="Individual Brokerage">Individual Brokerage</option>
            <option value="Fidelity Individual Brokerage">Fidelity Brokerage</option>
            <option value="Fidelity Roth IRA">Fidelity Roth IRA</option>
            <option value="Roth IRA">Roth IRA</option>
            <option value="401(k)">401(k)</option>
            <option value="HSA">HSA</option>
            <option value="Cash Management">Cash Management</option>
          </select>

          {/* Asset Type Filter */}
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Asset Types</option>
            <option value="Stock">Stocks</option>
            <option value="ETF">ETFs</option>
            <option value="Mutual Fund">Mutual Funds</option>
            <option value="Money Market">Money Market</option>
          </select>

          {/* Add Position Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="theme-table-header bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th 
                className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-1">
                  <span>Symbol / Name</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort('shares')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Shares / Cost Basis</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Last Price</th>
              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort('dayChange')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Today's Change</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort('totalReturn')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Profit/Loss</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort('value')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Current Value (% Weight)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort('dividend')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Div Yield</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedHoldings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No shares match the selected filter or search term.
                </td>
              </tr>
            ) : (
              sortedHoldings.map((h) => {
                const totalVal = h.shares * h.currentPrice;
                const totalCost = h.shares * h.costBasisPerShare;
                const dayChangePct = ((h.currentPrice - h.previousClose) / h.previousClose) * 100;
                const dayChangeDollar = h.shares * (h.currentPrice - h.previousClose);

                const totalReturnDollar = totalVal - totalCost;
                const totalReturnPct = totalCost > 0 ? (totalReturnDollar / totalCost) * 100 : 0;
                const weightPct = totalPortfolioValue > 0 ? (totalVal / totalPortfolioValue) * 100 : 0;

                const isDayUp = dayChangePct >= 0;
                const isTotalUp = totalReturnDollar >= 0;

                return (
                  <tr 
                    key={h.id} 
                    className="theme-table-row hover:bg-slate-50/80 transition-colors font-mono"
                  >
                    {/* Ticker & Name */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectStockDetail ? onSelectStockDetail(h) : onOpenValuationRadar?.(h.symbol)}
                          className="group font-bold text-indigo-600 hover:text-indigo-800 text-sm font-mono flex items-center gap-1.5 transition-colors cursor-pointer text-left focus:outline-none"
                          title={`Click to view detailed metrics & live chart for ${h.symbol}`}
                        >
                          <span className="group-hover:underline underline-offset-2 decoration-indigo-400 font-extrabold">{h.symbol}</span>
                          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                        </button>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          h.assetType === 'Stock' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          h.assetType === 'ETF' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          h.assetType === 'Mutual Fund' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {h.assetType}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectStockDetail ? onSelectStockDetail(h) : onOpenValuationRadar?.(h.symbol)}
                        className="text-xs text-slate-500 hover:text-slate-800 line-clamp-1 max-w-[220px] text-left transition-colors cursor-pointer mt-0.5 hover:underline decoration-slate-300"
                        title={`Click to view detailed metrics for ${h.name}`}
                      >
                        {h.name}
                      </button>
                    </td>

                    {/* Shares / Cost Basis */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900 font-mono">
                        {h.shares.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Cost: ${h.costBasisPerShare.toFixed(2)}
                      </div>
                    </td>

                    {/* Current Price */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className={`font-extrabold text-sm transition-all duration-300 ${
                        h.lastTickDirection === 'up' ? 'text-emerald-600 bg-emerald-50 rounded px-1' :
                        h.lastTickDirection === 'down' ? 'text-rose-600 bg-rose-50 rounded px-1' :
                        'text-slate-900'
                      }`}>
                        ${h.currentPrice.toFixed(2)}
                      </div>
                    </td>

                    {/* Today's Change */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className={`font-bold flex items-center justify-end gap-0.5 ${isDayUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isDayUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isDayUp ? '+' : ''}${dayChangeDollar.toFixed(2)}
                      </div>
                      <div className={`text-[11px] font-semibold ${isDayUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({isDayUp ? '+' : ''}{dayChangePct.toFixed(2)}%)
                      </div>
                    </td>

                    {/* Total Profit/Loss */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className={`font-bold ${isTotalUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isTotalUp ? '+' : ''}${totalReturnDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[11px] font-semibold ${isTotalUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({isTotalUp ? '+' : ''}{totalReturnPct.toFixed(2)}%)
                      </div>
                    </td>

                    {/* Current Value & Weight */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="font-extrabold text-slate-900 text-sm">
                        ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        {weightPct.toFixed(1)}% weight
                      </div>
                    </td>

                    {/* Forward Annual Dividend Yield */}
                    <td className="py-3.5 px-4 text-right">
                      {(() => {
                        const yieldPct = getDividendYieldPct(h);
                        if (yieldPct <= 0) {
                          return (
                            <span className="text-slate-400 font-sans text-xs">
                              No Div
                            </span>
                          );
                        }

                        return (
                          <span className="font-bold text-emerald-600 text-xs sm:text-sm font-mono">
                            {yieldPct.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onOpenValuationRadar && (
                          <button
                            onClick={() => onOpenValuationRadar(h.symbol)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={`Open Fair Value & Valuation Radar for ${h.symbol}`}
                          >
                            <Target className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onCreateStockAlert(h)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={`Set price alert for ${h.symbol}`}
                        >
                          <BellPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditHolding(h)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit shares or cost basis"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteHolding(h.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove holding"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
