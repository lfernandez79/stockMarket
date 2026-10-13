import React, { useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, FileText, Download } from 'lucide-react';
import { Holding } from '../types';
import { parseFidelityCSV } from '../utils/marketEngine';

interface FidelityImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportHoldings: (importedHoldings: Holding[]) => void;
}

const SAMPLE_FIDELITY_CSV = `"Symbol","Description","Quantity","Last Price","Current Value","Cost Basis Per Share","Cost Basis Total","Account Name"
"NVDA","NVIDIA CORPORATION",240,138.25,33180.00,112.50,27000.00,"Fidelity Individual Brokerage"
"LLY","ELI LILLY AND COMPANY",60,937.19,56231.40,710.00,42600.00,"Fidelity Roth IRA"
"MSFT","MICROSOFT CORP",110,448.60,49346.00,385.00,42350.00,"Fidelity Roth IRA"
"XOM","EXXON MOBIL CORP",370,118.70,43919.00,104.50,38665.00,"Fidelity Individual Brokerage"
"GOOGL","ALPHABET INC CLASS A",75,172.15,12911.25,142.00,10650.00,"Fidelity Individual Brokerage"
"DUK","DUKE ENERGY CORP",105,110.31,11582.55,92.10,9670.50,"Fidelity Individual Brokerage"
"JPM","JPMORGAN CHASE & CO",55,209.63,11529.65,168.00,9240.00,"Fidelity Roth IRA"
"TSLA","TESLA INC",42,237.76,9985.92,195.00,8190.00,"Fidelity Individual Brokerage"
"GE","GE AEROSPACE",42,176.86,7428.12,135.00,5670.00,"Fidelity Individual Brokerage"
"PLD","PROLOGIS INC",38,119.74,4550.12,108.00,4104.00,"Fidelity Individual Brokerage"
"WMT","WALMART INC",50,69.41,3470.50,58.00,2900.00,"Fidelity Individual Brokerage"
"LIN","LINDE PLC",12,455.58,5466.96,390.00,4680.00,"Fidelity Individual Brokerage"
"SPAXX","FIDELITY GOVT MONEY MARKET",12450,1.00,12450.00,1.00,12450.00,"Fidelity Cash Management"`;

export const FidelityImporter: React.FC<FidelityImporterProps> = ({ isOpen, onClose, onImportHoldings }) => {
  const [csvText, setCsvText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Holding[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleParse = (textToParse: string) => {
    try {
      setErrorMsg('');
      const holdings = parseFidelityCSV(textToParse);
      if (holdings.length === 0) {
        setErrorMsg('Could not detect valid stock positions. Please verify column headers or use the sample format.');
        setParsedPreview([]);
      } else {
        setParsedPreview(holdings);
      }
    } catch (err: any) {
      setErrorMsg('Error parsing Fidelity CSV: ' + err.message);
      setParsedPreview([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLE_FIDELITY_CSV);
    handleParse(SAMPLE_FIDELITY_CSV);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length > 0) {
      onImportHoldings(parsedPreview);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Import Holdings CSV</h3>
              <p className="text-xs text-slate-500">
                Upload your exported brokerage CSV file (Fidelity, Schwab, Vanguard, Robinhood, etc.) or paste raw CSV text below.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        {/* Action Controls */}
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <span className="font-bold text-slate-800 block">Choose CSV File:</span>
              <span className="text-[11px] text-slate-500">Supports standard brokerage position export formats</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition-all">
                <Upload className="h-4 w-4" />
                <span>Upload CSV</span>
                <input type="file" accept=".csv, .txt" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium shadow-sm transition-all"
              >
                <FileText className="h-4 w-4 text-amber-500" />
                <span>Load Sample CSV</span>
              </button>
            </div>
          </div>

          {/* Raw CSV Textarea */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Or Paste CSV Text Directly:
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                handleParse(e.target.value);
              }}
              placeholder='"Symbol","Description","Quantity","Last Price","Cost Basis Per Share"...'
              className="w-full p-3 font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-slate-900 text-slate-200"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Detected {parsedPreview.length} Positions Ready for Import:
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2">Symbol</th>
                      <th className="p-2">Name</th>
                      <th className="p-2 text-right">Shares</th>
                      <th className="p-2 text-right">Last Price</th>
                      <th className="p-2 text-right">Cost Basis</th>
                      <th className="p-2">Account</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900">{item.symbol}</td>
                        <td className="p-2 font-sans text-slate-600 truncate max-w-[120px]">{item.name}</td>
                        <td className="p-2 text-right text-slate-800">{item.shares}</td>
                        <td className="p-2 text-right text-emerald-600">${item.currentPrice.toFixed(2)}</td>
                        <td className="p-2 text-right text-slate-600">${item.costBasisPerShare.toFixed(2)}</td>
                        <td className="p-2 text-slate-500 text-[10px]">{item.accountType.replace('Fidelity ', '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedPreview.length === 0}
              className={`px-5 py-2 font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
                parsedPreview.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Import {parsedPreview.length} Positions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
