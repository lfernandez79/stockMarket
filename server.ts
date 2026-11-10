import express from 'express';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { marketData, providerLabels } from './marketProviders.js';
import { streamHub } from './streaming.js';
import {
  AI_CONFIG,
  AI_MODEL,
  AI_TIMEOUT_MS,
  ANALYSIS_RESPONSE_SCHEMA,
  buildExplainPrompt,
  buildPortfolioAnalysisPrompt,
  computeHealthScore,
  computeSectorBreakdown,
  validateAnalysis,
  type AnalysisHolding,
} from './aiHelpers.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Basic API rate limiting (generous for a personal app; protects provider quotas)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api/', apiLimiter);

// Initialize Gemini Client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API: Health checks for container readiness & liveness
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Market data — served by the provider layer (marketProviders.ts).
// Priority: Finnhub (licensed, needs FINNHUB_API_KEY) -> Yahoo Finance
// (unofficial, via yahoo-finance2). Unknown fields are null, never invented.
// ---------------------------------------------------------------------------

function formatVolume(v: number | null): string | null {
  if (v === null) return null;
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(Math.round(v));
}

function formatMarketCap(v: number | null): string | null {
  if (v === null) return null;
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  return '$' + Math.round(v).toString();
}

function toQuotePayload(q: any) {
  return {
    symbol: q.symbol,
    name: q.name,
    currentPrice: q.currentPrice,
    previousClose: q.previousClose,
    open: q.open,
    dayHigh: q.dayHigh,
    dayLow: q.dayLow,
    '52WeekHigh': q.fiftyTwoWeekHigh,
    '52WeekLow': q.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    volume: formatVolume(q.volume),
    volumeRaw: q.volume,
    marketCap: formatMarketCap(q.marketCap),
    marketCapRaw: q.marketCap,
    currency: q.currency,
    exchangeName: q.exchangeName,
    dividendYield: q.dividendYield,
    annualDividendRate: q.annualDividendRate,
    peRatio: q.peRatio,
    beta: q.beta,
    sparkline: q.sparkline,
    source: q.source,
    lastRefreshed: q.lastRefreshed,
  };
}

// API: Live market quotes for a list of symbols
app.get('/api/market/quotes', async (req, res) => {
  try {
    const rawSymbols = (req.query.symbols as string) || 'NVDA,FXAIX,MSFT,VOO,AAPL,SPAXX';
    const symbolList = Array.from(
      new Set(rawSymbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    ).slice(0, 50);

    const { provider, quotes, errors } = await marketData.getQuotes(symbolList);
    const payload: Record<string, any> = {};
    Object.entries(quotes).forEach(([sym, q]) => {
      payload[sym] = toQuotePayload(q);
    });

    return res.json({
      provider,
      timestamp: new Date().toISOString(),
      quotes: payload,
      errors,
    });
  } catch (err: any) {
    console.error('Error in /api/market/quotes:', err);
    return res.status(500).json({ error: 'Failed to fetch market quotes: ' + err.message });
  }
});

// API: Historical price series for charts
// range: 1D | 5D | 1M | 6M | YTD | 1Y | 5Y | ALL
app.get('/api/market/history', async (req, res) => {
  try {
    const symbol = ((req.query.symbol as string) || '').toUpperCase().trim();
    const range = ((req.query.range as string) || '1M').toUpperCase().trim();
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const points = await marketData.getHistory(symbol, range);
    return res.json({
      provider: providerLabels(),
      symbol,
      range,
      points,
    });
  } catch (err: any) {
    console.error('Error in /api/market/history:', err);
    return res.status(502).json({ error: 'Failed to fetch history: ' + err.message });
  }
});

// API: Major index snapshots — S&P 500, NASDAQ Composite, Dow Jones
app.get('/api/market/indices', async (req, res) => {
  try {
    const indices = await marketData.getIndices();
    return res.json({
      provider: providerLabels(),
      timestamp: new Date().toISOString(),
      indices,
    });
  } catch (err: any) {
    console.error('Error in /api/market/indices:', err);
    return res.status(502).json({ error: 'Failed to fetch indices: ' + err.message });
  }
});

// API: Symbol search
app.get('/api/market/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) return res.json({ quotes: [] });
    if (query.length > 64) return res.status(400).json({ error: 'Query too long' });
    const { quotes } = await marketData.search(query);
    return res.json({ quotes });
  } catch (err: any) {
    return res.status(502).json({ error: 'Search failed: ' + err.message });
  }
});

// API: News for one or more symbols (comma-separated). Merged + deduped, newest first.
app.get('/api/market/news', async (req, res) => {
  try {
    const raw = ((req.query.symbol as string) || 'NVDA,MSFT,AAPL,VOO').toUpperCase().trim();
    const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const { provider, articles } = await marketData.getNews(symbols, 10);
    return res.json({ provider, symbols, articles });
  } catch (err: any) {
    return res.status(502).json({ error: 'Failed to fetch news: ' + err.message });
  }
});

// API: Fundamentals for a symbol — real provider data or null. Nothing is estimated.
app.get('/api/market/stock-details', async (req, res) => {
  try {
    const symbol = ((req.query.symbol as string) || 'NVDA').toUpperCase().trim();
    const f = await marketData.getFundamentals(symbol);
    return res.json({
      symbol: f.symbol,
      name: f.name,
      currentPrice: f.currentPrice,
      marketCap: formatMarketCap(f.marketCap),
      marketCapRaw: f.marketCap,
      peRatio: f.peRatio,
      forwardPE: f.forwardPE,
      pegRatio: null,
      priceToBook: f.priceToBook,
      dividendYield: f.dividendYield,
      annualDividendRate: f.annualDividendRate,
      beta: f.beta,
      fiftyTwoWeekHigh: f.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: f.fiftyTwoWeekLow,
      '52WeekHigh': f.fiftyTwoWeekHigh,
      '52WeekLow': f.fiftyTwoWeekLow,
      fairValueEstimate: null,
      fairValueDiscountPct: null,
      analystRating: f.analystRating,
      analystPriceTarget: f.analystPriceTarget,
      earningsDate: f.earningsDate,
      epsSurprisePct: null,
      source: f.source,
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'Failed to fetch fundamentals: ' + err.message });
  }
});

// API: Stock & ETF screener — real Yahoo screener data (no hardcoded table).
// screener: most_actives | day_gainers | day_losers (default: most_actives)
app.get('/api/market/screener', async (req, res) => {
  try {
    const allowed = ['most_actives', 'day_gainers', 'day_losers'];
    const screenerId = allowed.includes(String(req.query.screener)) ? String(req.query.screener) : 'most_actives';
    const { provider, results } = await marketData.screen(screenerId);

    const { assetType, sector, minDividend, maxPE } = req.query;
    let filtered = results.map((r: any) => ({
      symbol: r.symbol,
      name: r.name,
      assetType: r.assetType,
      sector: r.sector,
      price: r.price,
      changePct: r.changePct,
      peRatio: r.peRatio,
      dividendYield: r.dividendYield,
      marketCap: formatMarketCap(r.marketCap),
      marketCapRaw: r.marketCap,
      analystRating: null,
      fairValueDiscount: null,
    }));

    if (assetType && assetType !== 'All') {
      filtered = filtered.filter((item: any) => item.assetType === assetType);
    }
    if (sector && sector !== 'All') {
      filtered = filtered.filter((item: any) => item.sector === sector);
    }
    if (minDividend) {
      const minDiv = parseFloat(minDividend as string);
      if (!isNaN(minDiv) && minDiv > 0) {
        filtered = filtered.filter((item: any) => (item.dividendYield || 0) >= minDiv);
      }
    }
    if (maxPE) {
      const peMax = parseFloat(maxPE as string);
      if (!isNaN(peMax) && peMax > 0) {
        filtered = filtered.filter((item: any) => item.peRatio != null && item.peRatio <= peMax);
      }
    }

    return res.json({ provider, screener: screenerId, results: filtered });
  } catch (err: any) {
    return res.status(502).json({ error: 'Screener failed: ' + err.message });
  }
});

// NOTE: The fake brokerage endpoints (POST /api/brokerage/connect and
// GET /api/brokerage/holdings) were removed on 2026-10-13. They accepted real
// brokerage credentials and returned hardcoded fake accounts. Brokerage sync
// is intentionally out of scope; holdings come from CSV import.

// API: AI Portfolio Analysis
// Health score + sector breakdown are computed server-side from real data
// (see aiHelpers.ts) and handed to the model as facts. The model narrates;
// it never invents a number. Output is schema-constrained and validated.
app.post('/api/ai/portfolio-analysis', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key not configured on server.' });
    }

    const { holdings, totalValue, dayGain, totalGain } = req.body;
    if (!Array.isArray(holdings)) {
      return res.status(400).json({ error: 'holdings must be an array.' });
    }
    const cleanHoldings: AnalysisHolding[] = holdings
      .filter((h: any) => h && typeof h.symbol === 'string')
      .map((h: any) => ({
        symbol: String(h.symbol).toUpperCase(),
        shares: Number(h.shares),
        currentPrice: Number(h.currentPrice),
        assetType: typeof h.assetType === 'string' ? h.assetType : undefined,
      }));

    const holdingsSummary = holdings.map((h: any) => {
      const value = Number(h.shares) * Number(h.currentPrice);
      return `- ${h.symbol} (${h.name}): ${h.shares} shares @ $${h.currentPrice} (Avg Cost: $${h.costBasisPerShare}, Account: ${h.accountType}, Type: ${h.assetType}, Value: $${isFinite(value) ? value.toFixed(2) : 'N/A'})`;
    }).join('\n');

    // Real sector per holding from the provider layer (cached 60 min).
    // One symbol failing must not fail the analysis — it becomes Unclassified.
    const sectorResults = await Promise.allSettled(
      cleanHoldings.map((h) => marketData.getFundamentals(h.symbol)),
    );
    const sectorBySymbol: Record<string, string | null> = {};
    sectorResults.forEach((r, i) => {
      sectorBySymbol[cleanHoldings[i].symbol] = r.status === 'fulfilled' ? (r.value.sector ?? null) : null;
    });
    const sectorBreakdown = computeSectorBreakdown(cleanHoldings, sectorBySymbol);
    const health = computeHealthScore(cleanHoldings);

    const prompt = buildPortfolioAnalysisPrompt({
      holdingsSummary,
      totalValue: typeof totalValue === 'number' && isFinite(totalValue) ? totalValue : null,
      dayGain: typeof dayGain === 'number' && isFinite(dayGain) ? dayGain : null,
      totalGain: typeof totalGain === 'number' && isFinite(totalGain) ? totalGain : null,
      asOf: new Date().toISOString(),
      healthScore: health.score,
      healthFacts: health,
      sectorBreakdown,
    });

    const generate = async () => {
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          temperature: AI_CONFIG.analysis.temperature,
          maxOutputTokens: AI_CONFIG.analysis.maxOutputTokens,
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_RESPONSE_SCHEMA,
          httpOptions: { timeout: AI_TIMEOUT_MS },
        },
      });
      return response.text || '';
    };

    // Validate strictly; one retry on malformed output, then an honest error.
    let lastReason = 'empty response';
    for (let attempt = 0; attempt < 2; attempt++) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(await generate());
      } catch {
        lastReason = 'model returned invalid JSON';
        continue;
      }
      const checked = validateAnalysis(parsed);
      if (checked.ok === false) {
        // NOTE: `!checked.ok` does not narrow this union under this
        // project's non-strict tsconfig; the explicit comparison does.
        lastReason = checked.reason;
        continue;
      }
      // The numbers in the response are the server-computed facts, whatever
      // the model echoed — the model never gets to set them.
      const analysis = checked.value;
      analysis.healthScore = health.score;
      analysis.sectorBreakdownEstimate = sectorBreakdown;
      return res.json(analysis);
    }
    console.error('AI portfolio analysis failed validation:', lastReason);
    return res.status(502).json({ error: 'AI returned an invalid analysis. Please try again.' });
  } catch (error: any) {
    console.error('Error generating AI portfolio analysis:', error);
    return res.status(500).json({ error: 'Failed to generate portfolio analysis: ' + error.message });
  }
});

// API: Explain Alert / Market Movement Catalyst
// Grounded: the explanation is built from real recent headlines fetched
// server-side for the symbol. When no headline explains the move, the model
// must say so — it never speculates about a cause.
app.post('/api/ai/explain-alert', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key not configured.' });
    }

    const { alertTitle, alertDescription, symbol, currentPrice, priceChangePercent } = req.body;
    const sym = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';

    // Recent headlines for the symbol. The news fetch gets its own short
    // budget so a slow provider can't stall the endpoint; if it fails we
    // proceed with prices only and the prompt says so.
    let headlines: { title: string; publisher: string | null; publishedAt: string | null }[] = [];
    let newsUnavailable = false;
    if (sym) {
      try {
        const news = await Promise.race([
          marketData.getNews([sym], 5),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('news fetch timed out')), 8000),
          ),
        ]);
        headlines = (news.articles || []).map((a) => ({
          title: a.title,
          publisher: a.publisher ?? null,
          publishedAt: a.publishedAt ?? null,
        }));
      } catch (e) {
        newsUnavailable = true;
        console.warn('Explain-alert news fetch failed, proceeding with prices only:', (e as Error).message);
      }
    }

    const price = typeof currentPrice === 'number' && isFinite(currentPrice) ? currentPrice : null;
    const pct =
      typeof priceChangePercent === 'number' && isFinite(priceChangePercent)
        ? Math.round(priceChangePercent * 100) / 100
        : null;
    const prompt = buildExplainPrompt({
      alertTitle: String(alertTitle || 'Alert'),
      alertDescription: String(alertDescription || ''),
      symbol: sym,
      currentPrice: price,
      priceChangePercent: pct,
      asOf: new Date().toISOString(),
      headlines,
      newsUnavailable,
    });

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        temperature: AI_CONFIG.explain.temperature,
        maxOutputTokens: AI_CONFIG.explain.maxOutputTokens,
        httpOptions: { timeout: AI_TIMEOUT_MS },
      },
    });

    const explanation = response.text?.trim();
    if (!explanation) {
      return res.status(502).json({ error: 'AI returned no explanation. Please try again.' });
    }
    return res.json({ explanation });
  } catch (error: any) {
    console.error('Error explaining alert:', error);
    return res.status(500).json({ error: 'Failed to generate alert explanation.' });
  }
});

// API: AI Financial Copilot Chat
app.post('/api/ai/copilot-chat', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key not configured on server.' });
    }

    const { userMessage, portfolioContext, chatHistory = [] } = req.body;

    const asOf = new Date().toISOString();
    const systemInstruction = `You are a financial copilot for a single investor tracking a Fidelity portfolio in a personal app. The prices and holdings below are a snapshot as of ${asOf}; they may be stale by the time you answer.

Rules:
- Use ONLY the portfolio data supplied below. Do not invent holdings, prices, yields, news, or performance figures.
- If the supplied data does not cover the question, say "I don't know based on the portfolio data provided" and say what data would answer it.
- Do not state price targets, support/resistance levels, or valuation multiples unless they are in the supplied data, or clearly label them as your own estimate and explain the basis.
- Keep answers concise and grounded in the numbers below.
- This is educational information, not financial advice.

User Portfolio Summary:
- Total Portfolio Value: $${portfolioContext?.totalValue?.toLocaleString() || 'N/A'}
- Today's Gain/Loss: $${portfolioContext?.dayGain?.toLocaleString() || 'N/A'} (${portfolioContext?.dayGainPct || 0}%)
- Holdings Count: ${portfolioContext?.holdings?.length || 0}
Holdings Breakdown:
${(portfolioContext?.holdings || []).map((h: any) => {
  const value = Number(h.shares) * Number(h.currentPrice);
  return `- ${h.symbol} (${h.name}): ${h.shares} shares @ $${h.currentPrice} (Value: $${isFinite(value) ? value.toFixed(2) : 'N/A'}, Account: ${h.accountType})`;
}).join('\n')}

Guidelines:
- Give concise, actionable analysis grounded in the supplied figures.
- Use formatting (bullet points, bold text, numbers) to make response easy to read.
- Always include 2-3 short "Suggested Follow-Up Actions" at the end under a header "[SUGGESTED_ACTIONS]".`;

    // Construct prompt with chat history context
    const historyFormatted = chatHistory.map((m: any) => `${m.sender === 'user' ? 'User' : 'Copilot'}: ${m.text}`).join('\n');
    const fullPrompt = `${historyFormatted ? `Previous Conversation:\n${historyFormatted}\n\n` : ''}User Question: ${userMessage}`;

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: fullPrompt,
      config: {
        temperature: AI_CONFIG.chat.temperature,
        maxOutputTokens: AI_CONFIG.chat.maxOutputTokens,
        systemInstruction,
        httpOptions: { timeout: AI_TIMEOUT_MS },
      },
    });

    const replyText = response.text?.trim();
    if (!replyText) {
      // An empty model reply is a failure — never substitute a fabricated reassurance.
      return res.status(502).json({ error: 'AI returned no reply. Please try again.' });
    }

    // Extract suggested actions if present
    let textOnly = replyText;
    let suggestedActions: string[] = [
      'Analyze my top risk exposure',
      'What is my estimated annual dividend income?',
      'Suggest tax-loss harvesting opportunities'
    ];

    if (replyText.includes('[SUGGESTED_ACTIONS]')) {
      const parts = replyText.split('[SUGGESTED_ACTIONS]');
      textOnly = parts[0].trim();
      const actionLines = parts[1].split('\n').map(l => l.replace(/^[•\-\d\.\s]+/, '').trim()).filter(Boolean);
      if (actionLines.length > 0) suggestedActions = actionLines.slice(0, 3);
    }

    return res.json({
      reply: textOnly,
      suggestedActions
    });
  } catch (error: any) {
    console.error('Error in AI copilot chat:', error);
    return res.status(500).json({ error: 'Copilot unavailable: ' + error.message });
  }
});

// Unknown /api/* paths -> JSON 404 (before the SPA catch-all)
app.use('/api/', (_req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint' });
});

// Start listening immediately on 0.0.0.0 and PORT so health checks pass right away
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Real-time trade streaming hub (Finnhub WebSocket -> browsers)
streamHub.attach(server);

// Vite Middleware & Production Static Serving setup
async function setupMiddlewares() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupMiddlewares().catch((err) => {
  console.error('Error setting up middlewares:', err);
});
