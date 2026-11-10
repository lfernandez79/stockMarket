# Holdings Tracker

A personal stock and ETF portfolio tracker — live prices, market news, dividend
yield, alerts, AI insights, and index charts for your own holdings. Built as a
replacement for a Yahoo Finance Bronze subscription: the same day-to-day
tracking, without the subscription.

> **Personal project, single user.** There is no login, no account system, and
> no backend database. Holdings are stored in your browser's `localStorage`.
> Do not expose the server publicly.

## Features

- **Holdings dashboard** — table of your positions with live price, day
  change, 52-week range, volume, market cap, dividend yield, and sparklines.
  Add, edit, and delete positions manually.
- **Fidelity CSV import** — paste or upload a Fidelity positions export; the
  importer detects columns by header keywords (Symbol, Description, Quantity,
  Last Price, Cost Basis Per Share, Account Name) and shows a preview before
  importing. See [Known limitations](#known-limitations) before using a real
  export.
- **Demo mode** — no CSV handy? Load randomized sample holdings from the
  welcome screen to explore the app. Sample data is clearly demo data, not
  real positions.
- **Market Indices** — S&P 500, NASDAQ Composite, and Dow Jones cards with
  current value and day change, plus an area chart with a range selector
  (1D / 5D / 1M / 6M / YTD / 1Y / 5Y / ALL), refreshed every 60 seconds.
- **Performance chart** — your portfolio's value over time (1D / 1W / 1M /
  1Y / ALL) with real S&P 500, NASDAQ, and Dow benchmark overlays pulled from
  the same market-data provider.
- **Allocation views** — donut chart and sector breakdown of the portfolio.
- **Market news** — latest news for the symbols you hold, newest first.
- **Real-time alerts** — rules for portfolio daily gain/loss, stock price
  above/below a threshold, and stock day-change %. Triggered alerts land in
  an alerts center with toast notifications, an optional chime, a test
  trigger, and a Gemini-powered explanation of what may have moved the price.
- **AI insights** — portfolio analysis (health score, strengths, risks) and
  an AI copilot chat that answers questions about your holdings. Requires
  `GEMINI_API_KEY`.
- **Live trade streaming** — with a Finnhub key configured, prices stream
  over a WebSocket during market hours and the header shows a green
  **STREAMING** pill; otherwise it polls and shows **POLLING**. While
  streaming, the REST poll slows to once a minute (ticks carry prices; the
  poll refreshes everything else and covers symbols that don't stream, like
  mutual funds).
- **Per-holding detail** — click any holding for its detail view with
  fundamentals (P/E, beta, analyst rating and price target, earnings date)
  where the provider returns them.
- **Themes** — slate, dark, emerald, midnight, and editorial.

## How market data works (read this first)

Honesty about data is a design rule of this app, not an afterthought:

- **Two providers, one layer.** `marketProviders.ts` aggregates
  [Finnhub](https://finnhub.io) (licensed, used when `FINNHUB_API_KEY` is
  set) and [Yahoo Finance](https://finance.yahoo.com) via
  `yahoo-finance2` (unofficial, used for history, fundamentals, and as the
  fallback). Every API response names its provider, e.g.
  `"Finnhub + Yahoo Finance (unofficial)"`.
- **Unknown is unknown.** If a provider returns no value for a field, the
  API returns `null` and the UI renders `—`. The app never invents a price,
  a previous close, a volume, or a fundamental to fill a gap.
- **Per-symbol errors.** A quote request reports failures per symbol in an
  `errors` map instead of failing the whole batch, so one bad ticker can't
  sink the rest.
- **Caching.** Server-side cache: quotes 60s, indices 60s, news 15min,
  history 30min, search/fundamentals 60min, screener 15min. The frontend
  polls quotes every 5 seconds by default, but the cache means fresh data
  arrives at most once a minute.
- **No brokerage sync, by design.** An earlier fake "connect your
  brokerage" login was deleted outright. Holdings come only from CSV import
  or manual entry. Nothing here ever asks for brokerage credentials.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 |
| Charts | Recharts 3 |
| Backend | Express 4 (single server serves the API and the frontend) |
| Market data | Finnhub (licensed, key-gated) + yahoo-finance2 (unofficial) |
| Streaming | Finnhub WebSocket relayed to browsers over `ws` |
| AI | Google Gemini (`@google/genai`) |
| Language | TypeScript 5.8, strict-ish (`tsc --noEmit` via `npm run lint`) |

## Getting started

### Prerequisites

- Node.js 18+ (or [Bun](https://bun.sh))
- A free [Finnhub API key](https://finnhub.io) — optional, but enables
  licensed quotes and live trade streaming
- A [Google AI Studio](https://aistudio.google.com) API key — optional,
  only needed for the AI features

### Run locally

```bash
git clone https://github.com/lfernandez79/stockMarket.git
cd stockMarket
bun install          # or: npm install
cp .env.example .env # then fill in your keys (see below)
npm run dev          # or: bun run dev
```

Open http://localhost:3000. The dev server runs on port `3000` by default
(override with the `PORT` environment variable).

### Production build

```bash
npm run build   # vite build + esbuild bundle of server.ts -> dist/server.cjs
npm start       # node dist/server.cjs
```

`npm run lint` runs `tsc --noEmit`; `npm run clean` removes `dist/`.

### First run

On first launch the welcome screen offers three ways in:

1. **Import a Fidelity CSV** — paste CSV text or upload the file, review the
   preview, import.
2. **Load sample data** — randomized demo holdings to explore with.
3. **Add a position manually** — enter symbol, shares, and cost basis; market
   fields stay blank (`—`) until the quote poller fills them from the
   provider.

## Configuration

Copy `.env.example` to `.env`. Never commit `.env` — it is gitignored and
holds secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `FINNHUB_API_KEY` | No | Free key from [finnhub.io](https://finnhub.io). When set, Finnhub serves live quotes and company news as the licensed provider and enables WebSocket trade streaming. Without it, all market data comes from Yahoo Finance (unofficial). |
| `GEMINI_API_KEY` | Only for AI features | Google AI Studio key for portfolio analysis, the AI copilot, and alert explanations. Without it those endpoints return an error and the AI buttons do nothing useful. |
| `APP_URL` | No | The public URL the app is hosted at. Used for self-referential links; injected automatically when hosted from AI Studio. |
| `PORT` | No | Server port. Defaults to `3000`. |
| `FINNHUB_WS_URL` | No | Override the Finnhub WebSocket URL (default `wss://ws.finnhub.io`). Only useful for testing against a mock server. |

## API reference

Base URL: same origin as the app. `/api/*` is rate-limited to 600 requests
per 15 minutes per IP. Unknown `/api/*` paths return a JSON 404.

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Liveness check. Returns `{ "status": "ok", ... }`. |
| `GET /api/market/quotes?symbols=NVDA,MSFT` | Live quotes for up to 50 symbols. Returns provider label, quotes keyed by symbol, and a per-symbol `errors` map. |
| `GET /api/market/history?symbol=NVDA&range=1M` | Historical closes for charts. `range`: `1D`, `5D`, `1M`, `6M`, `YTD`, `1Y`, `5Y`, `ALL` (default `1M`). |
| `GET /api/market/indices` | S&P 500, NASDAQ Composite, and Dow Jones snapshots. |
| `GET /api/market/search?q=nvda` | Symbol search. |
| `GET /api/market/news?symbol=NVDA,MSFT` | News articles for one or more symbols, merged and deduplicated, newest first (10 per request). |
| `GET /api/market/stock-details?symbol=NVDA` | Fundamentals: market cap, P/E, forward P/E, price-to-book, beta, dividend, 52-week range, analyst rating/target, earnings date. Unknown fields are `null`. |
| `GET /api/market/screener?screener=day_gainers` | Real screener lists: `most_actives` (default), `day_gainers`, `day_losers`. Optional filters: `assetType`, `sector`, `minDividend`, `maxPE`. |
| `POST /api/ai/portfolio-analysis` | Gemini portfolio analysis. Body: `{ holdings, totalValue, dayGain, totalGain }`. Requires `GEMINI_API_KEY`. |
| `POST /api/ai/explain-alert` | Gemini explanation of a triggered alert. Body: `{ alertTitle, alertDescription, symbol, currentPrice, priceChangePercent }`. |
| `POST /api/ai/copilot-chat` | Gemini chat about the portfolio. Body: `{ userMessage, portfolioContext, chatHistory }`. |
| `WS /api/stream` | Browser WebSocket for live trade ticks. The server holds one shared Finnhub WebSocket, subscribes to the union of browser-requested symbols, and relays ticks batched every 500ms (latest price wins per symbol). Reports `streaming: false` when no Finnhub key is configured or the market is closed. |

## Project structure

```
.
├── server.ts            # Express server: API routes, rate limiting, static serving
├── marketProviders.ts   # Finnhub + Yahoo provider layer, caching, quote merging
├── streaming.ts         # Finnhub WebSocket hub -> browser ticks over /api/stream
├── vite.config.ts       # Vite + Tailwind + React config
├── index.html           # App entry
├── src/
│   ├── App.tsx              # App shell: tabs, polling loop, tick application, modals
│   ├── main.tsx             # React entry
│   ├── types.ts             # Holding, AlertRule, and shared types
│   ├── data/
│   │   └── initialPortfolio.ts  # Empty starter holdings + default alert rules
│   ├── hooks/
│   │   └── useLiveTicks.ts  # Browser WebSocket client (streaming/polling/off)
│   ├── utils/
│   │   ├── marketEngine.ts  # Portfolio math, CSV parsing, alert evaluation
│   │   ├── sampleGenerator.ts   # Randomized demo holdings
│   │   ├── sectorClassifier.ts  # Symbol -> sector mapping
│   │   └── audioChime.ts    # Alert sounds
│   └── components/
│       ├── Header.tsx           # Sticky header, STREAMING/POLLING pill, actions
│       ├── PortfolioOverview.tsx    # Summary cards + sector allocation
│       ├── PerformanceChart.tsx     # Portfolio history + real benchmark overlays
│       ├── IndexCharts.tsx          # S&P 500 / NASDAQ / Dow section
│       ├── HoldingsTable.tsx        # Positions table
│       ├── MarketNewsFeed.tsx       # News for held symbols
│       ├── AllocationChart.tsx      # Allocation donut
│       ├── AlertsManager.tsx        # Alert rules + triggered-alerts center
│       ├── FidelityImporter.tsx     # CSV import modal
│       ├── AddEditPositionModal.tsx # Manual position entry
│       ├── StockDetailModal.tsx     # Per-holding detail view
│       ├── AiPortfolioInsights.tsx  # Gemini portfolio analysis
│       ├── AiCopilotDrawer.tsx      # Gemini chat drawer
│       ├── LiveToastContainer.tsx   # Alert toasts
│       └── WelcomeModal.tsx         # First-run onboarding
└── .env.example         # Environment variable template
```

## Known limitations

Stated plainly, so nobody is surprised later:

- **CSV parser hardening is still pending.** The Fidelity importer uses
  simple line splitting with keyword-based column detection. It works on
  standard Fidelity exports, but it has no proper CSV parser yet and falls
  back to defaults (10 shares, $100 price, 90% of price as cost basis) when
  a field is missing. **Do not import a real Fidelity export without
  reviewing the preview line by line** — verify every position before
  confirming.
- **Volume bars are mocked.** The volume bars in the performance chart use a
  deterministic mock, not real volume. Everything else on the chart is real
  provider data.
- **Streaming is market-hours only.** Live ticks flow Monday–Friday,
  9:30–16:00 America/New_York. Outside those hours the app polls. Mutual
  funds (e.g. FXAIX) price once a day after the close regardless of
  streaming.
- **Yahoo Finance is unofficial.** Without a Finnhub key, everything comes
  from Yahoo's unofficial endpoints via `yahoo-finance2`. Those endpoints
  can change, throttle, or return `Unauthorized` without notice — the app
  degrades to cached data and per-symbol errors rather than inventing
  values, but it is not a licensed data feed.
- **No tests, CI, or Dockerfile yet.** Verification today is `tsc --noEmit`
  and the production build plus manual endpoint checks.
- **No authentication.** Anyone who can reach the server can use it. Keep it
  on your own machine or behind your own access control.
- **Local data only.** Holdings, alert rules, and triggered alerts live in
  browser `localStorage`. Clearing browser data wipes them; there is no
  cloud backup or sync.
