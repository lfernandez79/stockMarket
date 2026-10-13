import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Search } from 'lucide-react';
import { Holding, AccountType, AssetType } from '../types';

interface AddEditPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holding: Partial<Holding>) => void;
  initialHolding?: Holding | null;
}

const PRESET_TICKERS = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 215.27, asset: 'Stock' as AssetType, yield: 0.46 },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 224.30, asset: 'Stock' as AssetType, yield: 0.45 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 482.26, asset: 'Stock' as AssetType, yield: 0.76 },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', price: 512.80, asset: 'ETF' as AssetType, yield: 1.35 },
  { symbol: 'FXAIX', name: 'Fidelity 500 Index Fund', price: 189.40, asset: 'Mutual Fund' as AssetType, yield: 1.32 },
  { symbol: 'FSKAX', name: 'Fidelity Total Market Index Fund', price: 142.10, asset: 'Mutual Fund' as AssetType, yield: 1.30 },
  { symbol: 'SPAXX', name: 'Fidelity Government Money Market Fund', price: 1.00, asset: 'Money Market' as AssetType, yield: 4.95 },
  { symbol: 'QQQI', name: 'NEOS NASDAQ-100 High Income ETF', price: 53.97, asset: 'ETF' as AssetType, yield: 1.29 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 186.50, asset: 'Stock' as AssetType, yield: 0.00 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 178.20, asset: 'Stock' as AssetType, yield: 0.45 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.80, asset: 'Stock' as AssetType, yield: 0.00 },
];

export const AddEditPositionModal: React.FC<AddEditPositionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialHolding
}) => {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [shares, setShares] = useState<string>('');
  const [costBasisPerShare, setCostBasisPerShare] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [dividendYield, setDividendYield] = useState<string>('');
  const [accountType, setAccountType] = useState<AccountType>('Fidelity Individual Brokerage');
  const [assetType, setAssetType] = useState<AssetType>('Stock');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [fetchQuoteError, setFetchQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (initialHolding) {
      setSymbol(initialHolding.symbol);
      setName(initialHolding.name);
      setShares(String(initialHolding.shares));
      setCostBasisPerShare(String(initialHolding.costBasisPerShare));
      setCurrentPrice(String(initialHolding.currentPrice));
      setDividendYield(String(initialHolding.dividendYield ?? 0));
      setAccountType(initialHolding.accountType);
      setAssetType(initialHolding.assetType);
      setPurchaseDate(initialHolding.purchaseDate);
    } else {
      setSymbol('');
      setName('');
      setShares('');
      setCostBasisPerShare('');
      setCurrentPrice('');
      setDividendYield('');
      setAccountType('Fidelity Individual Brokerage');
      setAssetType('Stock');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
    }
    setFetchQuoteError(null);
  }, [initialHolding, isOpen]);

  // Handle Escape Key to Close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFetchLiveQuote = async () => {
    if (!symbol) return;
    setIsFetchingQuote(true);
    setFetchQuoteError(null);

    try {
      const res = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(symbol.trim().toUpperCase())}`);
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      const q = data.quotes?.[symbol.trim().toUpperCase()];

      if (q) {
        if (q.name) setName(q.name);
        if (q.currentPrice) {
          setCurrentPrice(String(q.currentPrice));
          if (!costBasisPerShare || costBasisPerShare === '120' || costBasisPerShare === '100') {
            setCostBasisPerShare(String(q.currentPrice));
          }
        }
        if (q.dividendYield !== undefined && q.dividendYield !== null) {
          setDividendYield(String(q.dividendYield));
        }
      } else if (data.errors?.[symbol.trim().toUpperCase()]) {
        setFetchQuoteError(data.errors[symbol.trim().toUpperCase()]);
      } else {
        setFetchQuoteError('Symbol not found on Yahoo Finance API');
      }
    } catch (err: any) {
      setFetchQuoteError('Failed to pull live price. Check ticker symbol.');
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_TICKERS[0]) => {
    setSymbol(preset.symbol);
    setName(preset.name);
    setCurrentPrice(String(preset.price));
    setCostBasisPerShare(String(Number((preset.price * 0.95).toFixed(2))));
    setDividendYield(String(preset.yield ?? 0));
    setAssetType(preset.asset);
    setFetchQuoteError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numShares = parseFloat(shares);
    const numCostBasis = parseFloat(costBasisPerShare);
    const numCurrentPrice = parseFloat(currentPrice);
    const numDividendYield = parseFloat(dividendYield);

    if (!symbol.trim()) {
      setFetchQuoteError('Please enter a valid ticker symbol.');
      return;
    }

    if (isNaN(numShares) || numShares <= 0) {
      setFetchQuoteError('Please enter a valid number of shares greater than 0.');
      return;
    }

    const safeCurrentPrice = !isNaN(numCurrentPrice) && numCurrentPrice > 0 ? numCurrentPrice : 100;
    const safeCostBasis = !isNaN(numCostBasis) && numCostBasis >= 0 ? numCostBasis : safeCurrentPrice;
    const safeDividendYield = !isNaN(numDividendYield) && numDividendYield >= 0 ? numDividendYield : 0;

    onSave({
      id: initialHolding ? initialHolding.id : undefined,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim().toUpperCase(),
      shares: numShares,
      costBasisPerShare: safeCostBasis,
      currentPrice: safeCurrentPrice,
      previousClose: Number((safeCurrentPrice * 0.99).toFixed(2)),
      dayHigh: Number((safeCurrentPrice * 1.01).toFixed(2)),
      dayLow: Number((safeCurrentPrice * 0.98).toFixed(2)),
      '52WeekHigh': Number((safeCurrentPrice * 1.2).toFixed(2)),
      '52WeekLow': Number((safeCurrentPrice * 0.8).toFixed(2)),
      volume: '15.2M',
      marketCap: '$300B',
      dividendYield: safeDividendYield,
      accountType,
      assetType,
      purchaseDate,
      sparkline: [safeCurrentPrice * 0.97, safeCurrentPrice * 0.98, safeCurrentPrice * 0.99, safeCurrentPrice]
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {initialHolding ? <Edit className="h-5 w-5 text-emerald-600" /> : <PlusCircle className="h-5 w-5 text-emerald-600" />}
            {initialHolding ? `Edit ${initialHolding.symbol} Holding` : 'Add Shares to Fidelity Portfolio'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Quick Ticker Presets */}
        {!initialHolding && (
          <div className="mb-4">
            <span className="block text-xs font-semibold text-slate-600 mb-1.5">Quick Fidelity Popular Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TICKERS.slice(0, 7).map((p) => (
                <button
                  key={p.symbol}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                    symbol === p.symbol
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Ticker Symbol</label>
                <button
                  type="button"
                  onClick={handleFetchLiveQuote}
                  disabled={isFetchingQuote || !symbol}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 flex items-center gap-1"
                >
                  {isFetchingQuote ? 'Fetching...' : '⚡ Fetch Live Price'}
                </button>
              </div>
              <input
                type="text"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setFetchQuoteError(null);
                }}
                required
                placeholder="e.g. NVDA, VOO, FXAIX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-sm font-bold uppercase"
              />
              {fetchQuoteError && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">{fetchQuoteError}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Fund Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NVIDIA Corp"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Number of Shares</label>
              <input
                type="number"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="e.g. 50"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Basis / Share ($)</label>
              <input
                type="number"
                step="0.01"
                value={costBasisPerShare}
                onChange={(e) => setCostBasisPerShare(e.target.value)}
                placeholder="e.g. 150.00"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="e.g. 165.50"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Brokerage Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="Individual Brokerage">Individual Brokerage</option>
                <option value="Roth IRA">Roth IRA</option>
                <option value="401(k)">401(k)</option>
                <option value="HSA">HSA</option>
                <option value="Cash Management">Cash Management</option>
                <option value="Fidelity Individual Brokerage">Fidelity Brokerage</option>
                <option value="Schwab Brokerage">Schwab Brokerage</option>
                <option value="Vanguard IRA">Vanguard IRA</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Asset Class</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="Stock">Individual Stock</option>
                <option value="ETF">ETF</option>
                <option value="Mutual Fund">Index Mutual Fund</option>
                <option value="Money Market">Money Market (SPAXX)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Dividend Yield (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={dividendYield}
                  onChange={(e) => setDividendYield(e.target.value)}
                  placeholder="e.g. 1.35 or 0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono text-emerald-700 font-semibold pr-8"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-mono font-bold text-xs">%</span>
              </div>
              {(() => {
                const s = parseFloat(shares) || 0;
                const p = parseFloat(currentPrice) || 0;
                const y = parseFloat(dividendYield) || 0;
                const estAnnual = s * p * (y / 100);
                if (estAnnual > 0) {
                  return (
                    <p className="text-[10px] text-emerald-600 font-mono mt-1">
                      ≈ ${estAnnual.toFixed(2)}/yr (~${(estAnnual / 12).toFixed(2)}/mo)
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm"
            >
              {initialHolding ? 'Update Holding' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
