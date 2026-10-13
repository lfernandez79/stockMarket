import React from 'react';
import { X, Printer, Download, FileText, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { Holding, PortfolioSummary } from '../types';

interface WealthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PortfolioSummary;
  holdings: Holding[];
}

export const WealthReportModal: React.FC<WealthReportModalProps> = ({
  isOpen,
  onClose,
  summary,
  holdings
}) => {
  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    const headers = ['Symbol', 'Name', 'Account Type', 'Asset Type', 'Shares', 'Cost Basis', 'Current Price', 'Market Value', 'Total Return ($)', 'Total Return (%)'];
    const rows = holdings.map((h) => {
      const mktVal = h.shares * h.currentPrice;
      const costVal = h.shares * h.costBasisPerShare;
      const profit = mktVal - costVal;
      const profitPct = costVal > 0 ? (profit / costVal) * 100 : 0;
      return [
        h.symbol,
        `"${h.name}"`,
        `"${h.accountType}"`,
        h.assetType,
        h.shares,
        h.costBasisPerShare,
        h.currentPrice,
        mktVal.toFixed(2),
        profit.toFixed(2),
        `${profitPct.toFixed(2)}%`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fidelity_Portfolio_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden text-slate-900 print:shadow-none print:border-none print:max-w-none">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Executive Wealth & Tax Statement</h3>
              <p className="text-xs text-slate-400">Institutional Portfolio Summary & Holdings Audit Report</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Report Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Header Banner */}
          <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">FIDELITY WEALTH PORTFOLIO STATEMENT</h1>
              <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString([], { dateStyle: 'full' })}</p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div className="font-bold text-slate-900">VERIFIED FIDELITY ACCOUNTS</div>
              <div>Live & Extended Market Valuation</div>
            </div>
          </div>

          {/* Key Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold">Total Portfolio Value</div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold">Total Cost Basis</div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                ${summary.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold">Unrealized Gain / Loss</div>
              <div className={`text-2xl font-extrabold font-mono mt-1 ${
                summary.totalProfitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {summary.totalProfitLoss >= 0 ? '+' : ''}${summary.totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Holdings Audit Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Holdings Ledger</h3>
            <table className="w-full text-left text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5">Symbol</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Account</th>
                  <th className="p-2.5 text-right">Shares</th>
                  <th className="p-2.5 text-right">Cost Price</th>
                  <th className="p-2.5 text-right">Current Price</th>
                  <th className="p-2.5 text-right">Market Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {holdings.map((h) => (
                  <tr key={h.id}>
                    <td className="p-2.5 font-bold font-mono text-slate-900">{h.symbol}</td>
                    <td className="p-2.5 text-slate-700">{h.name}</td>
                    <td className="p-2.5 text-slate-500">{h.accountType}</td>
                    <td className="p-2.5 text-right font-mono">{h.shares}</td>
                    <td className="p-2.5 text-right font-mono">${h.costBasisPerShare.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono">${h.currentPrice.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold font-mono text-slate-900">${(h.shares * h.currentPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV Spreadsheet
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <Printer className="h-4 w-4" /> Print Statement
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
