import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Holding, PortfolioSummary } from '../types';
import { getSectorBreakdownForHolding, SECTOR_COLORS } from '../utils/sectorClassifier';

interface SectorAllocationCardProps {
  holdings: Holding[];
  summary: PortfolioSummary;
}

export interface SectorItem {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export const SectorAllocationCard: React.FC<SectorAllocationCardProps> = ({ holdings, summary }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Total portfolio value
  const totalValue = summary.totalValue || 1;

  // Aggregate holdings by sector using look-through decomposition for funds + direct lookup for stocks
  const sectorMap: { [sector: string]: number } = {};

  holdings.forEach((h) => {
    const holdingTotalValue = h.shares * h.currentPrice;
    const breakdown = getSectorBreakdownForHolding(h);

    breakdown.forEach(({ sector, weight }) => {
      const sectorVal = holdingTotalValue * weight;
      sectorMap[sector] = (sectorMap[sector] || 0) + sectorVal;
    });
  });

  // Convert map to sorted list
  const sectorsList: SectorItem[] = Object.entries(sectorMap)
    .map(([name, value]) => ({
      id: name,
      name,
      value,
      percentage: (value / totalValue) * 100,
      color: SECTOR_COLORS[name] || '#ff781f'
    }))
    .filter((sec) => sec.percentage > 0.05) // filter out rounding micro-fractions
    .sort((a, b) => b.value - a.value);

  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.max(1, Math.ceil(sectorsList.length / ITEMS_PER_PAGE));

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const displayedSectors = sectorsList.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="theme-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
      <div>
        {/* Card Header with Info Icon */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            Sector Allocation
          </h3>
          <div className="relative">
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              title="Sector Breakdown Details"
            >
              <Info className="h-4 w-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-7 w-52 bg-slate-900 text-white text-[11px] rounded-lg p-2.5 shadow-xl z-20 leading-relaxed font-sans border border-slate-700">
                Shows your total wealth distribution broken down by equity market sector, ETFs, and cash reserves.
              </div>
            )}
          </div>
        </div>

        {/* Multi-color Stacked Sector Progress Bar */}
        <div className="w-full h-3.5 flex gap-[2px] my-3 bg-slate-100 rounded-sm overflow-hidden">
          {sectorsList.map((sec, idx) => (
            <div
              key={sec.id}
              style={{
                width: `${Math.max(sec.percentage, 1.2)}%`,
                backgroundColor: sec.color
              }}
              className={`h-full transition-all hover:brightness-110 cursor-pointer ${
                idx === 0 ? 'rounded-l-sm' : ''
              } ${idx === sectorsList.length - 1 ? 'rounded-r-sm' : ''}`}
              title={`${sec.name}: $${sec.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sec.percentage.toFixed(2)}%)`}
            />
          ))}
        </div>

        {/* Sector List (Paginated Carousel Rows) */}
        <div className="space-y-2.5 my-3 min-h-[128px]">
          {sectorsList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400 text-xs">
              <span>Awaiting positions to calculate sector breakdown</span>
            </div>
          ) : (
            displayedSectors.map((sec) => (
              <div key={sec.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: sec.color }}
                  />
                  <span className="font-semibold text-slate-700 truncate" title={sec.name}>
                    {sec.name}
                  </span>
                </div>
                <div className="font-bold text-slate-900 font-mono text-xs whitespace-nowrap">
                  ${sec.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  <span className="font-semibold text-slate-500 font-sans text-[11px]">
                    ({sec.percentage.toFixed(2)}%)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Carousel Pagination Controls */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 mt-2">
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Dots Indicator */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`transition-all rounded-full ${
                currentPage === idx
                  ? 'bg-blue-600 w-2 h-2'
                  : 'bg-slate-300 hover:bg-slate-400 w-1.5 h-1.5'
              }`}
              title={`Page ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={nextPage}
          disabled={currentPage === totalPages - 1}
          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
