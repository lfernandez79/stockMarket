import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon, Layers, Wallet } from 'lucide-react';
import { Holding } from '../types';

interface AllocationChartProps {
  holdings: Holding[];
  totalValue: number;
}

const COLORS_ASSET = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
const COLORS_ACCOUNT = ['#059669', '#6366f1', '#ec4899', '#f97316', '#14b8a6'];

export const AllocationChart: React.FC<AllocationChartProps> = ({ holdings, totalValue }) => {
  const [activeTab, setActiveTab] = useState<'asset' | 'account'>('asset');

  // Compute Asset Class Breakdown
  const assetDataMap: Record<string, number> = {};
  holdings.forEach((h) => {
    const val = h.shares * h.currentPrice;
    assetDataMap[h.assetType] = (assetDataMap[h.assetType] || 0) + val;
  });

  const assetChartData = Object.entries(assetDataMap).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
    percentage: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(1)) : 0
  }));

  // Compute Account Breakdown
  const accountDataMap: Record<string, number> = {};
  holdings.forEach((h) => {
    const val = h.shares * h.currentPrice;
    const cleanAccount = h.accountType.replace('Fidelity ', '');
    accountDataMap[cleanAccount] = (accountDataMap[cleanAccount] || 0) + val;
  });

  const accountChartData = Object.entries(accountDataMap).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
    percentage: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(1)) : 0
  }));

  const chartData = activeTab === 'asset' ? assetChartData : accountChartData;
  const colorPalette = activeTab === 'asset' ? COLORS_ASSET : COLORS_ACCOUNT;

  return (
    <div className="theme-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-emerald-600" /> Portfolio Asset & Account Allocation
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Visual breakdown of diversification across asset classes and Fidelity account types
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('asset')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'asset' 
                ? 'bg-white text-emerald-700 shadow-sm font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Asset Classes</span>
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'account' 
                ? 'bg-white text-emerald-700 shadow-sm font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Fidelity Accounts</span>
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
          <PieIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-600">No Allocation Data Available</p>
          <p className="text-slate-400 mt-0.5">Upload a CSV or add stock positions to view your diversification breakdown.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Donut Chart */}
          <div className="h-64 md:col-span-2 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colorPalette[index % colorPalette.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend List */}
          <div className="space-y-3 font-mono">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">
              Distribution Breakdown
            </h4>
            {chartData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span 
                    className="h-3 w-3 rounded-full shrink-0" 
                    style={{ backgroundColor: colorPalette[idx % colorPalette.length] }} 
                  />
                  <span className="text-xs font-semibold text-slate-800 font-sans">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 font-mono">
                    ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs font-mono">
        <div className="font-sans font-bold text-slate-200 mb-1">{data.name}</div>
        <div className="text-emerald-400 font-bold">${data.value?.toLocaleString()}</div>
        <div className="text-slate-400 text-[11px] font-sans">{data.percentage}% of total portfolio</div>
      </div>
    );
  }
  return null;
};
