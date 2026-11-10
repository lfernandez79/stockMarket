/**
 * Pure, testable helpers for the Gemini AI endpoints in server.ts.
 *
 * Factuality contract for this module: every number it produces comes from
 * real inputs (holdings, provider data) or deterministic arithmetic on them.
 * Nothing here estimates, guesses, or invents a figure. The model is only
 * ever asked to *narrate* facts computed here — never to produce a number
 * on its own.
 */
import { Type, type Schema } from '@google/genai';

/** Per-call AI timeout: every Gemini request must fail fast, never hang. */
export const AI_TIMEOUT_MS = 30_000;

/** Generation config per endpoint (verified against @google/genai 2.13.0).
 *  Low temperatures keep the factual endpoints deterministic; the chat
 *  copilot gets a slightly higher temperature so replies read naturally. */
export const AI_CONFIG = {
  analysis: { temperature: 0.2, maxOutputTokens: 2000 },
  explain: { temperature: 0.2, maxOutputTokens: 1200 },
  chat: { temperature: 0.3, maxOutputTokens: 1500 },
} as const;

export const AI_MODEL = 'gemini-3.6-flash';

export interface AnalysisHolding {
  symbol: string;
  shares: number;
  currentPrice: number;
  assetType?: string;
}

export interface SectorSlice {
  sector: string;
  percentage: number;
}

/**
 * Sector breakdown computed from real holding values — never estimated.
 *
 * Bucketing (all from real data):
 * - Money Market holdings -> "Cash / Money Market"
 * - a sector from the provider (Yahoo assetProfile) -> that sector
 * - ETF / Mutual Fund with no provider sector -> "Funds / Diversified"
 *   (a fund's sector mix is not a single sector, so it is not forced into one)
 * - anything else without a sector -> "Unclassified"
 * Percentages are value-weighted and rounded to 1 decimal; the largest
 * bucket absorbs rounding drift so the slices always sum to exactly 100.
 */
export function computeSectorBreakdown(
  holdings: AnalysisHolding[],
  sectorBySymbol: Record<string, string | null | undefined>,
): SectorSlice[] {
  const totals = new Map<string, number>();
  let total = 0;
  for (const h of holdings) {
    const shares = Number(h.shares);
    const price = Number(h.currentPrice);
    if (!isFinite(shares) || !isFinite(price) || shares <= 0 || price <= 0) continue;
    const value = shares * price;
    const sector = sectorBySymbol[h.symbol.toUpperCase()];
    const bucket =
      h.assetType === 'Money Market'
        ? 'Cash / Money Market'
        : sector
          ? sector
          : h.assetType === 'ETF' || h.assetType === 'Mutual Fund'
            ? 'Funds / Diversified'
            : 'Unclassified';
    totals.set(bucket, (totals.get(bucket) || 0) + value);
    total += value;
  }
  if (total <= 0) return [];
  const slices = [...totals.entries()]
    .map(([sector, value]) => ({
      sector,
      percentage: Math.round((value / total) * 1000) / 10,
    }))
    .sort((a, b) => b.percentage - a.percentage);
  // Fix 0.1 rounding drift on the largest slice so the total is exactly 100.
  const sum = slices.reduce((s, x) => s + x.percentage, 0);
  const drift = Math.round((100 - sum) * 10) / 10;
  if (drift !== 0 && slices.length > 0) {
    slices[0].percentage = Math.round((slices[0].percentage + drift) * 10) / 10;
  }
  return slices;
}

export interface HealthScoreFacts {
  score: number;
  largestWeightPct: number;
  top3WeightPct: number;
  holdingCount: number;
  cashWeightPct: number;
}

/**
 * Portfolio health score — a deterministic rubric computed server-side,
 * documented here so the number is reproducible and auditable. It is NOT
 * a model judgment.
 *
 * Start at 100, then subtract:
 * - Largest single position: >40% -> -30; >30% -> -20; >20% -> -10; >10% -> -5
 * - Top-3 positions combined: >70% -> -15; >50% -> -10
 * - Holdings count: 1-2 -> -15; 3-5 -> -10; 6-9 -> -5; 10+ -> 0
 * - Cash / money-market weight: >50% -> -10; 30-50% -> -5
 * Result is clamped to 0-100. A low score means "concentrated / undiversified
 * by these measurable rules", nothing more.
 */
export function computeHealthScore(holdings: AnalysisHolding[]): HealthScoreFacts {
  const values = holdings
    .map((h) => {
      const shares = Number(h.shares);
      const price = Number(h.currentPrice);
      return {
        value: isFinite(shares) && isFinite(price) && shares > 0 && price > 0 ? shares * price : 0,
        cash: h.assetType === 'Money Market',
      };
    })
    .filter((v) => v.value > 0);
  const total = values.reduce((s, v) => s + v.value, 0);
  const holdingCount = values.length;
  if (total <= 0 || holdingCount === 0) {
    return { score: 0, largestWeightPct: 0, top3WeightPct: 0, holdingCount: 0, cashWeightPct: 0 };
  }
  const weights = values.map((v) => (v.value / total) * 100).sort((a, b) => b - a);
  const largestWeightPct = Math.round(weights[0] * 10) / 10;
  const top3WeightPct = Math.round(weights.slice(0, 3).reduce((s, w) => s + w, 0) * 10) / 10;
  const cashWeightPct = Math.round(
    (values.filter((v) => v.cash).reduce((s, v) => s + v.value, 0) / total) * 1000,
  ) / 10;

  let score = 100;
  if (largestWeightPct > 40) score -= 30;
  else if (largestWeightPct > 30) score -= 20;
  else if (largestWeightPct > 20) score -= 10;
  else if (largestWeightPct > 10) score -= 5;
  if (top3WeightPct > 70) score -= 15;
  else if (top3WeightPct > 50) score -= 10;
  if (holdingCount <= 2) score -= 15;
  else if (holdingCount <= 5) score -= 10;
  else if (holdingCount <= 9) score -= 5;
  if (cashWeightPct > 50) score -= 10;
  else if (cashWeightPct > 30) score -= 5;
  return {
    score: Math.max(0, Math.min(100, score)),
    largestWeightPct,
    top3WeightPct,
    holdingCount,
    cashWeightPct,
  };
}

export interface AiAnalysis {
  healthScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  portfolioRecommendations: string[];
  sectorBreakdownEstimate: SectorSlice[];
}

/** Response schema for the portfolio-analysis endpoint (constrained decoding).
 *  The model must return exactly this shape; the server still validates it. */
export const ANALYSIS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    healthScore: {
      type: Type.INTEGER,
      description: 'Portfolio health score 0-100. Use the exact computed value supplied in the prompt.',
      minimum: 0,
      maximum: 100,
    },
    summary: { type: Type.STRING, description: '2-3 sentences overview of portfolio strength and concentration.' },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of portfolio strengths, each grounded in the supplied holdings data.',
    },
    risks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of risks or concentration warnings, each grounded in the supplied holdings data.',
    },
    portfolioRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific portfolio optimizations. Only recommend actions supported by the supplied data.',
    },
    sectorBreakdownEstimate: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector: { type: Type.STRING },
          percentage: { type: Type.NUMBER, minimum: 0, maximum: 100 },
        },
        required: ['sector', 'percentage'],
      },
      description: 'Echo the exact computed sector breakdown supplied in the prompt, unchanged.',
    },
  },
  required: [
    'healthScore',
    'summary',
    'strengths',
    'risks',
    'portfolioRecommendations',
    'sectorBreakdownEstimate',
  ],
};

/** Validate a parsed portfolio-analysis response. Returns the reason when
 *  invalid so the caller can log it and retry honestly — never patch it up
 *  with invented values. */
export function validateAnalysis(
  parsed: unknown,
): { ok: true; value: AiAnalysis } | { ok: false; reason: string } {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'response is not a JSON object' };
  }
  const p = parsed as Record<string, unknown>;
  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim().length > 0);
  if (typeof p.healthScore !== 'number' || !isFinite(p.healthScore) || p.healthScore < 0 || p.healthScore > 100) {
    return { ok: false, reason: 'healthScore missing or outside 0-100' };
  }
  if (typeof p.summary !== 'string' || p.summary.trim().length === 0) {
    return { ok: false, reason: 'summary missing or empty' };
  }
  if (!isStringArray(p.strengths)) return { ok: false, reason: 'strengths is not an array of strings' };
  if (!isStringArray(p.risks)) return { ok: false, reason: 'risks is not an array of strings' };
  if (!isStringArray(p.portfolioRecommendations)) {
    return { ok: false, reason: 'portfolioRecommendations is not an array of strings' };
  }
  if (!Array.isArray(p.sectorBreakdownEstimate)) {
    return { ok: false, reason: 'sectorBreakdownEstimate is not an array' };
  }
  for (const s of p.sectorBreakdownEstimate as unknown[]) {
    if (!s || typeof s !== 'object') return { ok: false, reason: 'sector entry is not an object' };
    const e = s as Record<string, unknown>;
    if (typeof e.sector !== 'string' || e.sector.trim().length === 0) {
      return { ok: false, reason: 'sector entry has no sector name' };
    }
    if (typeof e.percentage !== 'number' || !isFinite(e.percentage) || e.percentage < 0 || e.percentage > 100) {
      return { ok: false, reason: 'sector entry has an invalid percentage' };
    }
  }
  return { ok: true, value: parsed as unknown as AiAnalysis };
}

export interface ExplainHeadline {
  title: string;
  publisher: string | null;
  publishedAt: string | null;
}

/** Prompt for the alert explanation. The model reasons ONLY over the facts
 *  supplied here (alert, price, recent headlines). When no headline explains
 *  the move it must say so explicitly — speculating about a cause is forbidden. */
export function buildExplainPrompt(params: {
  alertTitle: string;
  alertDescription: string;
  symbol: string;
  currentPrice: number | null;
  priceChangePercent: number | null;
  asOf: string;
  headlines: ExplainHeadline[];
  newsUnavailable: boolean;
}): string {
  const { alertTitle, alertDescription, symbol, currentPrice, priceChangePercent, asOf, headlines, newsUnavailable } =
    params;
  const headlineBlock =
    headlines.length > 0
      ? headlines
          .map((h, i) => {
            // Only show a date when it parses — provider data occasionally
            // carries malformed timestamps; a bad date must not leak in.
            const date =
              h.publishedAt && !isNaN(Date.parse(h.publishedAt)) ? ` (${h.publishedAt.slice(0, 10)})` : '';
            return `${i + 1}. "${h.title}" — ${h.publisher || 'Unknown source'}${date}`;
          })
          .join('\n')
      : newsUnavailable
        ? 'Recent news could not be retrieved, so no headlines are available.'
        : 'No recent headlines were found for this symbol.';
  return `You are a stock market analyst explaining a triggered performance alert for a user's portfolio holding. Use ONLY the facts below. Do not invent a cause, event, earnings result, or news item that is not in the supplied headlines.

Alert Details (prices as of ${asOf}):
Title: ${alertTitle}
Message: ${alertDescription}
Symbol: ${symbol || 'PORTFOLIO'}
Current Price: ${currentPrice !== null ? `$${currentPrice}` : 'N/A'}
Price Change: ${priceChangePercent !== null ? `${priceChangePercent}%` : 'not provided'}

Recent headlines for ${symbol || 'the portfolio'}:
${headlineBlock}

Explain in 3 short paragraphs:
1. What caused this movement — ONLY if one of the headlines above explains it. If none of the headlines explains the move, say exactly: "No clear catalyst found in recent news." Do not speculate about earnings, deals, analyst actions, or macro events.
2. What this means for a long-term investor, based only on the price move shown above.
3. Recommended action or monitoring checklist (e.g., review target weight, or do nothing). Do not invent stop-loss levels or price targets.`;
}

/** Prompt for the portfolio analysis. The health score and sector breakdown
 *  are computed server-side and supplied as facts; the model narrates them,
 *  it does not produce them. */
export function buildPortfolioAnalysisPrompt(params: {
  holdingsSummary: string;
  totalValue: number | null;
  dayGain: number | null;
  totalGain: number | null;
  asOf: string;
  healthScore: number;
  healthFacts: HealthScoreFacts;
  sectorBreakdown: SectorSlice[];
}): string {
  const { holdingsSummary, totalValue, dayGain, totalGain, asOf, healthScore, healthFacts, sectorBreakdown } = params;
  const sectorLines =
    sectorBreakdown.length > 0
      ? sectorBreakdown.map((s) => `- ${s.sector}: ${s.percentage}%`).join('\n')
      : '- No classified holdings (no values to weight).';
  return `You are a financial portfolio analyst specializing in personal investment and brokerage accounts. Analyze the following portfolio. All prices are as of ${asOf}.

Portfolio Metrics:
Total Value: $${totalValue !== null ? totalValue.toLocaleString() : 'N/A'}
Today's Gain/Loss: $${dayGain !== null ? dayGain.toLocaleString() : 'N/A'}
Total Gain/Loss: $${totalGain !== null ? totalGain.toLocaleString() : 'N/A'}

Current Holdings:
${holdingsSummary}

Computed facts — use these exact values in your JSON, do not recompute or estimate them:
- Portfolio health score: ${healthScore} / 100 (computed from a documented rubric: largest position ${healthFacts.largestWeightPct}% of value, top-3 positions ${healthFacts.top3WeightPct}%, ${healthFacts.holdingCount} holdings, cash/money-market weight ${healthFacts.cashWeightPct}%).
- Sector breakdown (value-weighted, computed from holdings):
${sectorLines}

Provide a concise analysis as JSON matching the response schema: a 2-3 sentence summary of portfolio strength and concentration, strengths and risks grounded ONLY in the holdings and computed facts above, and specific recommendations only where the supplied data supports them. Do not invent holdings, prices, yields, sectors, or performance figures. Return ONLY valid JSON.`;
}
