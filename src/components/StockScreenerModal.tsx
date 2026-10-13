import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Plus, ArrowUpRight, TrendingUp, CheckCircle, Sparkles } from 'lucide-react';
import { ScreenerFilters, ScreenerResult, Holding } from '../types';

interface StockScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPosition: (holding: Partial<Holding>) => void;
}

export const StockScreenerModal: React.FC<StockScreenerModalProps> = ({
  isOpen,
  onClose,
  onAddPosition
}) => {
  const [filters, setFilters] = useState<ScreenerFilters>({
    assetType: 'All',
    sector: 'All',
    marketCap: 'All',
    minDividendYield: 0,
    maxPERatio: 0,
    proximity52wHigh: false
  });

  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedSymbols, setAddedSymbols] = useState<Record<string, boolean>>({});

  const fetchScreenerResults = () => {
    setIsLoading(true);
    const query = new URLSearchParams({
      assetType: filters.assetType,
      sector: filters.sector,
      minDividend: filters.minDividendYield.toString(),
      maxPE: filters.maxPERatio.toString()
    });

    fetch(`/api/market/screener?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results || []);
      })
      .catch((err) => console.error('Screener error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchScreenerResults();
    }
  }, [isOpen, filters]);

  if (!isOpen) return null;

  const handleAddTicker = (item: ScreenerResult) => {
    onAddPosition({
      symbol: item.symbol,
      name: item.name,
      shares: 10,
      costBasisPerShare: item.price,
      currentPrice: item.price,
      previousClose: item.price,
      dayHigh: item.price * 1.01,
      dayLow: item.price * 0.99,
      accountType: 'Fidelity Individual Brokerage',
      assetType: item.assetType,
      purchaseDate: new Date().toISOString().split('T')[0]
    });

    setAddedSymbols((prev) => ({ ...prev, [item.symbol]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden text-slate-900">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Pro Equity & ETF Screener</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Institutional Multi-Factor
                </span>
              </div>
              <p className="text-xs text-slate-400">Discover top-performing dividend growth, undervaluation, and mega-cap opportunities</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Asset Category</label>
            <select
              value={filters.assetType}
              onChange={(e) => setFilters({ ...filters, assetType: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Stock">Stocks Only</option>
              <option value="ETF">ETFs Only</option>
              <option value="Mutual Fund">Mutual Funds</option>
              <option value="Money Market">Money Market</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Sector / Industry</label>
            <select
              value={filters.sector}
              onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="All">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Financials">Financials</option>
              <option value="Broad Market">Broad Market</option>
              <option value="Consumer">Consumer</option>
              <option value="Energy">Energy</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Min Dividend Yield</label>
            <select
              value={filters.minDividendYield}
              onChange={(e) => setFilters({ ...filters, minDividendYield: parseFloat(e.target.value) })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value={0}>Any Dividend</option>
              <option value={1}>&gt; 1.0% Yield</option>
              <option value={2}>&gt; 2.0% Yield</option>
              <option value={3.5}>&gt; 3.5% Yield (High Div)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Max P/E Valuation</label>
            <select
              value={filters.maxPERatio}
              onChange={(e) => setFilters({ ...filters, maxPERatio: parseFloat(e.target.value) })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value={0}>Any P/E Multiple</option>
              <option value={15}>Under 15x P/E (Value)</option>
              <option value={25}>Under 25x P/E</option>
              <option value={40}>Under 40x P/E</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-500 animate-spin" />
              <span>Filtering institutional market data...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No symbols match the selected criteria. Try adjusting the filter dropdowns.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="p-3">Symbol & Name</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">P/E Ratio</th>
                  <th className="p-3">Div Yield</th>
                  <th className="p-3">Fair Value</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((item) => (
                  <tr key={item.symbol} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 font-mono text-sm">{item.symbol}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-[180px]">{item.name}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-600">{item.sector}</td>
                    <td className="p-3 font-bold text-slate-900 font-mono">${item.price.toFixed(2)}</td>
                    <td className="p-3 font-mono text-slate-700">{item.peRatio ? `${item.peRatio}x` : 'N/A'}</td>
                    <td className="p-3 font-mono text-emerald-600 font-semibold">
                      {item.dividendYield ? `${item.dividendYield}%` : '0.00%'}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px]">
                        +{item.fairValueDiscount}% Undervalued
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {addedSymbols[item.symbol] ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle className="h-4 w-4" /> Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddTicker(item)}
                          className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Showing {results.length} institutional market results</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Close Screener
          </button>
        </div>
      </div>
    </div>
  );
};
