export type AccountType = 
  | 'Individual Brokerage'
  | 'Roth IRA'
  | '401(k)'
  | 'HSA'
  | 'Cash Management'
  | 'Fidelity Individual Brokerage'
  | 'Schwab Brokerage'
  | 'Vanguard IRA'
  | string;

export type AssetType = 'Stock' | 'ETF' | 'Mutual Fund' | 'Money Market';

export type ThemeMode = 'slate' | 'dark' | 'emerald' | 'midnight' | 'editorial';

export interface ExtendedStockMetrics {
  open?: number;
  bid?: string;
  ask?: string;
  avgVolume?: string;
  netAssets?: string;
  nav?: number;
  peRatioTTM?: number | null;
  yieldPct?: number | null;
  ytdReturnPct?: number | null;
  beta5Y?: number | null;
  expenseRatioNet?: number | null;
  fundFamily?: string;
  fundCategory?: string;
  inceptionDate?: string;
  description?: string;
  tradingLink?: string;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  costBasisPerShare: number;
  currentPrice: number;
  // Market fields are null until a live quote arrives — never invented.
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  '52WeekHigh': number | null;
  '52WeekLow': number | null;
  volume: string | null;
  marketCap: string | null;
  peRatio?: number | null;
  dividendYield?: number | null;
  annualDividendRate?: number | null;
  accountType: AccountType;
  assetType: AssetType;
  purchaseDate: string;
  sparkline: number[];
  lastTickDirection?: 'up' | 'down' | 'same';
  extendedMetrics?: ExtendedStockMetrics;
}

export type AlertType = 
  | 'PORTFOLIO_DAILY_LOSS' 
  | 'PORTFOLIO_DAILY_GAIN' 
  | 'STOCK_PRICE_HIGH' 
  | 'STOCK_PRICE_LOW' 
  | 'STOCK_DAY_CHANGE_PCT'
  | 'VOLATILITY_SPIKE';

export type AlertSeverity = 'critical' | 'warning' | 'gain' | 'info';

export interface AlertRule {
  id: string;
  title: string;
  type: AlertType;
  symbol?: string; // If specific stock, otherwise undefined for portfolio
  thresholdValue: number; // Price, Percentage, or Dollar Amount
  enabled: boolean;
  severity: AlertSeverity;
  createdDate: string;
  soundEnabled: boolean;
  notes?: string;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  symbol?: string;
  triggeredPrice?: number;
  triggeredAt: string; // ISO string
  severity: AlertSeverity;
  read: boolean;
  aiExplanation?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  dayGainLoss: number;
  dayGainLossPct: number;
  cashBalance: number; // SPAXX / Core Money Market
  annualDividendIncome: number;
  monthlyDividendIncome: number;
  portfolioDividendYield: number;
  topGainer?: Holding;
  topLoser?: Holding;
}

export interface HistoricalDataPoint {
  date: string;
  portfolioValue: number;
  sp500Benchmark: number;
  nasdaqBenchmark?: number;
  dowBenchmark?: number;
  dayGainPct: number;
}

export interface AiPortfolioAnalysis {
  healthScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  portfolioRecommendations: string[];
  sectorBreakdownEstimate: { sector: string; percentage: number }[];
}

export interface TechnicalIndicatorsConfig {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema12: boolean;
  rsi: boolean;
  macd: boolean;
  bollingerBands: boolean;
  volume: boolean;
  showBenchmark: boolean; // Compare against S&P 500
}

export interface StockValuationDetails {
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: string;
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fairValueEstimate: number;
  fairValueDiscountPct: number; // positive = undervalued discount, negative = overvalued
  analystRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Underperform' | 'Sell';
  analystPriceTarget: number;
  earningsDate: string;
  epsSurprisePct?: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  relatedSymbols: string[];
  summary?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface ScreenerFilters {
  assetType: string; // 'All' | 'Stock' | 'ETF' | 'Mutual Fund'
  sector: string; // 'All' | 'Technology' | 'Healthcare' | 'Financials' | 'Consumer' | 'Energy'
  marketCap: string; // 'All' | 'Mega (> $200B)' | 'Large ($10B-$200B)' | 'Mid ($2B-$10B)'
  minDividendYield: number; // e.g. 0%, 2%, 4%
  maxPERatio: number; // e.g. 0 (no cap) or 15, 25, 50
  proximity52wHigh: boolean; // within 10% of 52w high
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  assetType: AssetType;
  sector: string;
  price: number;
  changePct: number;
  peRatio: number | null;
  dividendYield: number | null;
  marketCap: string;
  analystRating: string;
  fairValueDiscount: number;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
}

