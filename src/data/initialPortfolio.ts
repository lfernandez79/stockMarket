import { Holding, AlertRule, HistoricalDataPoint } from '../types';
import { generatePortfolioHistoricalData } from '../utils/marketEngine';

export const INITIAL_HOLDINGS: Holding[] = [];

export const INITIAL_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-1',
    title: 'Daily Portfolio Drop Warning',
    type: 'PORTFOLIO_DAILY_LOSS',
    thresholdValue: 2.0, // 2.0% drop
    enabled: true,
    severity: 'critical',
    createdDate: new Date().toISOString().split('T')[0],
    soundEnabled: true,
    notes: 'Warn if overall portfolio declines over 2.0% in a single day.'
  },
  {
    id: 'rule-2',
    title: 'High Intraday Volatility Alert',
    type: 'PORTFOLIO_DAILY_GAIN',
    thresholdValue: 3.0,
    enabled: true,
    severity: 'gain',
    createdDate: new Date().toISOString().split('T')[0],
    soundEnabled: true,
    notes: 'Notify when overall portfolio exceeds +3.0% daily growth.'
  }
];

export const GENERATE_HISTORICAL_DATA = (portfolioValue: number = 0): HistoricalDataPoint[] => {
  return generatePortfolioHistoricalData(portfolioValue, 0, 0, '1M');
};
