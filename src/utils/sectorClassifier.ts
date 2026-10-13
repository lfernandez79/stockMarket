import { Holding } from '../types';

export const SECTOR_COLORS: { [key: string]: string } = {
  'Technology': '#1d64f2',           // Royal Blue
  'Healthcare': '#a855f7',           // Vibrant Purple
  'Energy': '#ea580c',               // Dark Orange
  'Communication Services': '#eab308', // Gold / Yellow
  'Utilities': '#ca8a04',            // Olive / Dark Gold
  'Financial Services': '#dc2626',   // Crimson Red
  'Consumer Cyclical': '#9333ea',    // Violet
  'Industrials': '#14b8a6',          // Teal
  'Real Estate': '#38bdf8',          // Sky Blue
  'Consumer Defensive': '#047857',   // Forest Green
  'Basic Materials': '#f43f5e',      // Rose Red
  'Cash & SPAXX': '#64748b',         // Slate Gray
  'Others': '#ff781f'                // Bright Coral Orange
};

// Comprehensive Symbol to Sector Mapping for S&P 500, Nasdaq, Dow 30, Popular Stocks & ETFs
const COMPREHENSIVE_SYMBOL_SECTOR_MAP: Record<string, string> = {
  // Cash & Money Market
  SPAXX: 'Cash & SPAXX',
  FDRXX: 'Cash & SPAXX',
  FZFXX: 'Cash & SPAXX',
  SPRXX: 'Cash & SPAXX',
  CASH: 'Cash & SPAXX',
  USD: 'Cash & SPAXX',

  // Index & ETFs / Mutual Funds -> "Others"
  FXAIX: 'Others',
  VOO: 'Others',
  SPY: 'Others',
  IVV: 'Others',
  QQQ: 'Others',
  QQQM: 'Others',
  FSKAX: 'Others',
  VTI: 'Others',
  SCHD: 'Others',
  IWM: 'Others',
  VEA: 'Others',
  VWO: 'Others',
  FZROX: 'Others',
  FNILX: 'Others',
  TLT: 'Others',
  BND: 'Others',
  AGG: 'Others',
  JEPI: 'Others',
  JEPQ: 'Others',
  VT: 'Others',
  VXUS: 'Others',
  DIA: 'Others',

  // Technology
  NVDA: 'Technology',
  MSFT: 'Technology',
  AAPL: 'Technology',
  AVGO: 'Technology',
  AMD: 'Technology',
  ORCL: 'Technology',
  CRM: 'Technology',
  CSCO: 'Technology',
  ACN: 'Technology',
  ADBE: 'Technology',
  IBM: 'Technology',
  TXN: 'Technology',
  QCOM: 'Technology',
  AMAT: 'Technology',
  INTC: 'Technology',
  MU: 'Technology',
  LRCX: 'Technology',
  NOW: 'Technology',
  PANW: 'Technology',
  KLAC: 'Technology',
  SNPS: 'Technology',
  CDNS: 'Technology',
  PLTR: 'Technology',
  SNOW: 'Technology',
  CRWD: 'Technology',
  FTNT: 'Technology',
  DELL: 'Technology',
  HPQ: 'Technology',
  SMCI: 'Technology',
  ASML: 'Technology',
  TSM: 'Technology',
  SHOP: 'Technology',
  SQ: 'Technology',
  NET: 'Technology',

  // Communication Services
  GOOGL: 'Communication Services',
  GOOG: 'Communication Services',
  META: 'Communication Services',
  NFLX: 'Communication Services',
  TMUS: 'Communication Services',
  DIS: 'Communication Services',
  VZ: 'Communication Services',
  T: 'Communication Services',
  CMCSA: 'Communication Services',
  EA: 'Communication Services',
  TTWO: 'Communication Services',
  RBLX: 'Communication Services',
  SNAP: 'Communication Services',
  PINS: 'Communication Services',
  SPOT: 'Communication Services',

  // Consumer Cyclical
  AMZN: 'Consumer Cyclical',
  TSLA: 'Consumer Cyclical',
  HD: 'Consumer Cyclical',
  LOW: 'Consumer Cyclical',
  MCD: 'Consumer Cyclical',
  NKE: 'Consumer Cyclical',
  SBUX: 'Consumer Cyclical',
  BKNG: 'Consumer Cyclical',
  TJX: 'Consumer Cyclical',
  MAR: 'Consumer Cyclical',
  HLT: 'Consumer Cyclical',
  ABNB: 'Consumer Cyclical',
  ORLY: 'Consumer Cyclical',
  AZO: 'Consumer Cyclical',
  LULU: 'Consumer Cyclical',
  EBAY: 'Consumer Cyclical',
  ETSY: 'Consumer Cyclical',
  RACE: 'Consumer Cyclical',
  GM: 'Consumer Cyclical',
  F: 'Consumer Cyclical',

  // Consumer Defensive
  WMT: 'Consumer Defensive',
  COST: 'Consumer Defensive',
  PG: 'Consumer Defensive',
  KO: 'Consumer Defensive',
  PEP: 'Consumer Defensive',
  PM: 'Consumer Defensive',
  MDLZ: 'Consumer Defensive',
  MO: 'Consumer Defensive',
  CL: 'Consumer Defensive',
  TGT: 'Consumer Defensive',
  KMB: 'Consumer Defensive',
  STZ: 'Consumer Defensive',
  SYY: 'Consumer Defensive',
  ADM: 'Consumer Defensive',
  EL: 'Consumer Defensive',
  GIS: 'Consumer Defensive',

  // Healthcare
  LLY: 'Healthcare',
  UNH: 'Healthcare',
  JNJ: 'Healthcare',
  ABBV: 'Healthcare',
  MRK: 'Healthcare',
  TMO: 'Healthcare',
  PFE: 'Healthcare',
  ABT: 'Healthcare',
  DHR: 'Healthcare',
  AMGN: 'Healthcare',
  ISRG: 'Healthcare',
  BMY: 'Healthcare',
  GILD: 'Healthcare',
  VRTX: 'Healthcare',
  MDT: 'Healthcare',
  ELV: 'Healthcare',
  SYK: 'Healthcare',
  REGN: 'Healthcare',
  CI: 'Healthcare',
  ZTS: 'Healthcare',
  BDX: 'Healthcare',
  MCK: 'Healthcare',
  CVS: 'Healthcare',
  COR: 'Healthcare',
  MODV: 'Healthcare',

  // Financial Services
  JPM: 'Financial Services',
  BAC: 'Financial Services',
  V: 'Financial Services',
  MA: 'Financial Services',
  WFC: 'Financial Services',
  GS: 'Financial Services',
  MS: 'Financial Services',
  AXP: 'Financial Services',
  C: 'Financial Services',
  BLK: 'Financial Services',
  SCHW: 'Financial Services',
  PGR: 'Financial Services',
  CB: 'Financial Services',
  MMC: 'Financial Services',
  PYPL: 'Financial Services',
  COF: 'Financial Services',
  AON: 'Financial Services',
  BK: 'Financial Services',
  USB: 'Financial Services',
  PNC: 'Financial Services',
  ICE: 'Financial Services',
  CME: 'Financial Services',
  AIG: 'Financial Services',
  MET: 'Financial Services',

  // Energy
  XOM: 'Energy',
  CVX: 'Energy',
  COP: 'Energy',
  EOG: 'Energy',
  SLB: 'Energy',
  MPC: 'Energy',
  PSX: 'Energy',
  VLO: 'Energy',
  OXY: 'Energy',
  WMB: 'Energy',
  KMI: 'Energy',
  HAL: 'Energy',
  BKR: 'Energy',
  DVN: 'Energy',
  FANG: 'Energy',

  // Industrials
  GE: 'Industrials',
  CAT: 'Industrials',
  RTX: 'Industrials',
  HON: 'Industrials',
  UNP: 'Industrials',
  DE: 'Industrials',
  BA: 'Industrials',
  LMT: 'Industrials',
  UPS: 'Industrials',
  ADP: 'Industrials',
  ETN: 'Industrials',
  FDX: 'Industrials',
  EMR: 'Industrials',
  ITW: 'Industrials',
  NOC: 'Industrials',
  WM: 'Industrials',
  GD: 'Industrials',
  CSX: 'Industrials',
  NSC: 'Industrials',

  // Basic Materials
  LIN: 'Basic Materials',
  APD: 'Basic Materials',
  ECL: 'Basic Materials',
  SHW: 'Basic Materials',
  FCX: 'Basic Materials',
  NEM: 'Basic Materials',
  NUE: 'Basic Materials',
  DOW: 'Basic Materials',
  DD: 'Basic Materials',
  ALB: 'Basic Materials',

  // Real Estate
  PLD: 'Real Estate',
  AMT: 'Real Estate',
  EQIX: 'Real Estate',
  CCI: 'Real Estate',
  PSA: 'Real Estate',
  O: 'Real Estate',
  SPG: 'Real Estate',
  WELL: 'Real Estate',
  DLR: 'Real Estate',
  VICI: 'Real Estate',

  // Utilities
  NEE: 'Utilities',
  SO: 'Utilities',
  DUK: 'Utilities',
  GEV: 'Utilities',
  CEG: 'Utilities',
  AEP: 'Utilities',
  SRE: 'Utilities',
  D: 'Utilities',
  PEG: 'Utilities',
  ED: 'Utilities'
};

export interface SectorWeight {
  sector: string;
  weight: number;
}

/**
 * Decomposes a holding into its underlying market sector weights.
 * For index funds and ETFs (e.g., S&P 500, Total Stock Market), decomposes look-through holdings across sectors.
 * For individual stocks, maps 100% to its specific GICS sector.
 */
export function getSectorBreakdownForHolding(holding: Holding): SectorWeight[] {
  const symbol = (holding.symbol || '').trim().toUpperCase();
  const name = (holding.name || '').toLowerCase();

  // 1. S&P 500 Index Funds / ETFs (FXAIX, VOO, SPY, IVV, FNILX)
  if (
    ['FXAIX', 'VOO', 'SPY', 'IVV', 'FNILX'].includes(symbol) || 
    name.includes('500 index') || 
    name.includes('s&p 500')
  ) {
    return [
      { sector: 'Technology', weight: 0.315 },
      { sector: 'Financial Services', weight: 0.132 },
      { sector: 'Healthcare', weight: 0.120 },
      { sector: 'Consumer Cyclical', weight: 0.101 },
      { sector: 'Communication Services', weight: 0.092 },
      { sector: 'Industrials', weight: 0.064 },
      { sector: 'Consumer Defensive', weight: 0.059 },
      { sector: 'Energy', weight: 0.038 },
      { sector: 'Utilities', weight: 0.025 },
      { sector: 'Real Estate', weight: 0.024 },
      { sector: 'Basic Materials', weight: 0.022 },
      { sector: 'Others', weight: 0.008 }
    ];
  }

  // 2. Total Market Index Funds (FSKAX, VTI, FZROX, SCHB)
  if (
    ['FSKAX', 'VTI', 'FZROX', 'SCHB'].includes(symbol) || 
    name.includes('total market') || 
    name.includes('total stock')
  ) {
    return [
      { sector: 'Technology', weight: 0.300 },
      { sector: 'Financial Services', weight: 0.138 },
      { sector: 'Healthcare', weight: 0.115 },
      { sector: 'Consumer Cyclical', weight: 0.105 },
      { sector: 'Communication Services', weight: 0.088 },
      { sector: 'Industrials', weight: 0.082 },
      { sector: 'Consumer Defensive', weight: 0.058 },
      { sector: 'Energy', weight: 0.040 },
      { sector: 'Real Estate', weight: 0.028 },
      { sector: 'Utilities', weight: 0.024 },
      { sector: 'Basic Materials', weight: 0.022 }
    ];
  }

  // 3. Nasdaq 100 Funds (QQQ, QQQM)
  if (
    ['QQQ', 'QQQM'].includes(symbol) || 
    name.includes('nasdaq 100')
  ) {
    return [
      { sector: 'Technology', weight: 0.510 },
      { sector: 'Communication Services', weight: 0.155 },
      { sector: 'Consumer Cyclical', weight: 0.130 },
      { sector: 'Healthcare', weight: 0.065 },
      { sector: 'Consumer Defensive', weight: 0.060 },
      { sector: 'Industrials', weight: 0.050 },
      { sector: 'Financial Services', weight: 0.030 }
    ];
  }

  // 4. Single Stock or Direct Sector Lookup
  const primarySector = getSectorForHolding(holding);
  return [{ sector: primarySector, weight: 1.0 }];
}

/**
 * Classifies a portfolio holding into its appropriate GICS / Yahoo Market Sector
 */
export function getSectorForHolding(holding: Holding): string {
  const symbol = (holding.symbol || '').trim().toUpperCase();
  const name = (holding.name || '').toLowerCase();
  const assetType = holding.assetType || 'Stock';

  // 1. Direct Lookup by Ticker Symbol
  if (COMPREHENSIVE_SYMBOL_SECTOR_MAP[symbol]) {
    return COMPREHENSIVE_SYMBOL_SECTOR_MAP[symbol];
  }

  // 2. Asset Type check for Money Market / Cash or ETFs / Index Funds -> "Others" (Yahoo convention)
  if (
    assetType === 'Money Market' || 
    assetType === 'ETF' || 
    assetType === 'Mutual Fund' || 
    symbol === 'SPAXX' || 
    symbol === 'FDRXX' || 
    name.includes('money market') || 
    name.includes('index') ||
    name.includes('etf') ||
    name.includes('fund')
  ) {
    return 'Others';
  }

  // 3. Keyword Fallback in Holding Name
  if (name.includes('tech') || name.includes('semi') || name.includes('software') || name.includes('micro') || name.includes('cloud') || name.includes('ai') || name.includes('cyber')) {
    return 'Technology';
  }
  if (name.includes('health') || name.includes('pharma') || name.includes('therapeutics') || name.includes('bio') || name.includes('medical') || name.includes('care')) {
    return 'Healthcare';
  }
  if (name.includes('bank') || name.includes('financial') || name.includes('capital') || name.includes('insurance') || name.includes('credit') || name.includes('trust')) {
    return 'Financial Services';
  }
  if (name.includes('energy') || name.includes('oil') || name.includes('gas') || name.includes('petroleum') || name.includes('drilling')) {
    return 'Energy';
  }
  if (name.includes('telecom') || name.includes('communication') || name.includes('media') || name.includes('entertainment')) {
    return 'Communication Services';
  }
  if (name.includes('retail') || name.includes('auto') || name.includes('hotel') || name.includes('resort') || name.includes('apparel') || name.includes('restaurant')) {
    return 'Consumer Cyclical';
  }
  if (name.includes('food') || name.includes('beverage') || name.includes('tobacco') || name.includes('household') || name.includes('supermarket') || name.includes('defensive')) {
    return 'Consumer Defensive';
  }
  if (name.includes('aero') || name.includes('defense') || name.includes('machinery') || name.includes('electric') || name.includes('transport') || name.includes('airline')) {
    return 'Industrials';
  }
  if (name.includes('reit') || name.includes('real estate') || name.includes('realty') || name.includes('property')) {
    return 'Real Estate';
  }
  if (name.includes('power') || name.includes('utility') || name.includes('water') || name.includes('electric utility')) {
    return 'Utilities';
  }
  if (name.includes('chemical') || name.includes('mining') || name.includes('gold') || name.includes('steel') || name.includes('material')) {
    return 'Basic Materials';
  }

  // Default fallback
  return 'Others';
}

