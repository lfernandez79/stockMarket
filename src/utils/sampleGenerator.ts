import { Holding, AssetType, AccountType } from '../types';

interface SampleStockDefinition {
  symbol: string;
  name: string;
  basePrice: number;
  assetType: AssetType;
  dividendYield: number;
  peRatio: number | null;
  volume: string;
  marketCap: string;
}

const STOCK_UNIVERSE: SampleStockDefinition[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 228.50, assetType: 'Stock', dividendYield: 0.45, peRatio: 33.8, volume: '48.2M', marketCap: '$3.45T' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 482.26, assetType: 'Stock', dividendYield: 0.76, peRatio: 37.4, volume: '19.2M', marketCap: '$3.58T' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', basePrice: 215.27, assetType: 'Stock', dividendYield: 0.46, peRatio: 64.2, volume: '62.4M', marketCap: '$5.28T' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', basePrice: 188.40, assetType: 'Stock', dividendYield: 0.00, peRatio: 42.1, volume: '34.5M', marketCap: '$1.96T' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 176.80, assetType: 'Stock', dividendYield: 0.45, peRatio: 23.5, volume: '22.8M', marketCap: '$2.18T' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', basePrice: 512.60, assetType: 'Stock', dividendYield: 0.39, peRatio: 26.8, volume: '14.1M', marketCap: '$1.30T' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', basePrice: 242.30, assetType: 'Stock', dividendYield: 0.00, peRatio: 68.4, volume: '58.7M', marketCap: '$770B' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', basePrice: 518.20, assetType: 'ETF', dividendYield: 1.35, peRatio: 26.2, volume: '5.8M', marketCap: '$480B' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust Series 1', basePrice: 484.50, assetType: 'ETF', dividendYield: 0.58, peRatio: 31.4, volume: '38.2M', marketCap: '$285B' },
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', basePrice: 35.15, assetType: 'ETF', dividendYield: 3.13, peRatio: 16.5, volume: '8.4M', marketCap: '$62B' },
  { symbol: 'FXAIX', name: 'Fidelity 500 Index Fund', basePrice: 191.20, assetType: 'Mutual Fund', dividendYield: 1.32, peRatio: 26.0, volume: '12.4M', marketCap: '$520B' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', basePrice: 162.40, assetType: 'Stock', dividendYield: 3.05, peRatio: 16.8, volume: '6.4M', marketCap: '$390B' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', basePrice: 218.75, assetType: 'Stock', dividendYield: 2.10, peRatio: 12.4, volume: '9.2M', marketCap: '$620B' },
  { symbol: 'V', name: 'Visa Inc.', basePrice: 274.30, assetType: 'Stock', dividendYield: 0.75, peRatio: 29.6, volume: '5.9M', marketCap: '$560B' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', basePrice: 885.20, assetType: 'Stock', dividendYield: 0.52, peRatio: 52.1, volume: '2.1M', marketCap: '$392B' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', basePrice: 168.90, assetType: 'Stock', dividendYield: 1.25, peRatio: 35.2, volume: '18.4M', marketCap: '$785B' },
  { symbol: 'WMT', name: 'Walmart Inc.', basePrice: 72.80, assetType: 'Stock', dividendYield: 1.15, peRatio: 30.2, volume: '16.7M', marketCap: '$585B' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', basePrice: 154.20, assetType: 'Stock', dividendYield: 0.00, peRatio: 45.8, volume: '39.1M', marketCap: '$250B' },
];

/**
 * Generates a randomized sample portfolio with a maximum of 5 stocks.
 * Randomly picks between 3 and 5 distinct stocks from the universe,
 * generates randomized share counts, purchase dates, and cost bases.
 */
export function generateRandomSampleHoldings(): Holding[] {
  // Shuffle array using Fisher-Yates
  const shuffled = [...STOCK_UNIVERSE].sort(() => 0.5 - Math.random());
  
  // Pick between 3 and 5 stocks (max 5)
  const count = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
  const selected = shuffled.slice(0, count);

  const accountTypes: AccountType[] = [
    'Fidelity Individual Brokerage',
    'Fidelity Traditional IRA',
    'Fidelity Roth IRA'
  ];

  return selected.map((stock, index) => {
    // Randomize share count (between 5 and 150 shares depending on price)
    let shares = Math.floor(Math.random() * 80) + 10;
    if (stock.basePrice > 400) {
      shares = Math.floor(Math.random() * 25) + 5;
    } else if (stock.basePrice < 50) {
      shares = Math.floor(Math.random() * 200) + 50;
    }

    // Small price jitter +/- 2.5%
    const priceVariance = (Math.random() * 0.05) - 0.025;
    const currentPrice = Number((stock.basePrice * (1 + priceVariance)).toFixed(2));

    // Cost basis jitter between -15% to +10%
    const costBasisVariance = (Math.random() * 0.25) - 0.15;
    const costBasisPerShare = Number((currentPrice * (1 + costBasisVariance)).toFixed(2));

    const prevVariance = (Math.random() * 0.03) - 0.015;
    const previousClose = Number((currentPrice * (1 + prevVariance)).toFixed(2));

    const dayHigh = Number((Math.max(currentPrice, previousClose) * (1 + Math.random() * 0.012)).toFixed(2));
    const dayLow = Number((Math.min(currentPrice, previousClose) * (1 - Math.random() * 0.012)).toFixed(2));

    const fiftyTwoWeekHigh = Number((currentPrice * (1 + Math.random() * 0.25)).toFixed(2));
    const fiftyTwoWeekLow = Number((currentPrice * (1 - Math.random() * 0.25)).toFixed(2));

    const annualDividendRate = Number(((currentPrice * (stock.dividendYield / 100))).toFixed(4));

    // Random purchase date in the last 2 years
    const daysAgo = Math.floor(Math.random() * 600) + 30;
    const purchaseDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const isUp = currentPrice >= previousClose;
    const sparkline = [
      previousClose * 0.99,
      previousClose * 0.995,
      previousClose,
      (previousClose + currentPrice) / 2,
      currentPrice
    ];

    return {
      id: `sample-${stock.symbol.toLowerCase()}-${Date.now()}-${index}`,
      symbol: stock.symbol,
      name: stock.name,
      shares,
      costBasisPerShare,
      currentPrice,
      previousClose,
      dayHigh,
      dayLow,
      '52WeekHigh': fiftyTwoWeekHigh,
      '52WeekLow': fiftyTwoWeekLow,
      volume: stock.volume,
      marketCap: stock.marketCap,
      peRatio: stock.peRatio,
      dividendYield: stock.dividendYield,
      annualDividendRate,
      accountType: accountTypes[index % accountTypes.length],
      assetType: stock.assetType,
      purchaseDate,
      sparkline,
      lastTickDirection: isUp ? 'up' : 'down'
    };
  });
}
