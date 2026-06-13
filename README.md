# XAUUSD Command Center

Private intraday XAUUSD workstation for support/resistance monitoring, scheduled news, headline shocks, journal learning, setup scoring, and coaching review.

## What Is Implemented

- React + Vite dashboard with dark graphite and warm gold trading-workstation UI.
- TradingView Lightweight Charts integration for XAUUSD candles, S/R price lines, and news/headline markers.
- Manual and auto support/resistance zone model.
- Scheduled news and headline shock monitor with reaction windows.
- Checklist-based setup scoring with confidence and guardrails.
- Manual trading journal with setup tags, news context, mistake tags, emotion tags, and R-multiple calculation.
- Review page with statistics, coaching insights, and learning-loop explanation.
- Supabase schema with RLS and indexes for private journal/event/review storage.
- Server-side AI gateway example for GroqCloud and OpenRouter.
- Vercel serverless endpoint for Alpha Vantage gold spot/news and FRED macro context.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Environment

Copy `.env.example` to `.env` and fill in values as needed.

Browser-exposed values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MARKET_SYMBOL=XAUUSD.s
VITE_MARKET_DATA_URL=http://127.0.0.1:8765
VITE_ONLINE_MARKET_DATA_URL=/api/online-market-data
```

Server-side only values:

```bash
OPENROUTER_API_KEY=
GROQ_API_KEY=
ALPHA_VANTAGE_API_KEY=
FRED_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Never put provider secret keys into client-side `VITE_` variables.

## Online APIs For Vercel

For Vercel deployment, use online APIs first and keep MT5 as an optional local backup.

Set these Vercel environment variables:

```bash
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FRED_API_KEY=your_fred_key
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
GROQ_MODEL=llama-3.1-8b-instant
OPENROUTER_MODEL=openai/gpt-4o-mini
VITE_ONLINE_MARKET_DATA_URL=/api/online-market-data
VITE_MARKET_SYMBOL=XAUUSD.s
```

The serverless endpoint lives at:

```text
api/online-market-data.js
```

It fetches:

- Yahoo Finance `GC=F` chart data for free deployed candle fallback.
- Alpha Vantage `GOLD_SILVER_SPOT` for live gold spot price.
- Alpha Vantage `NEWS_SENTIMENT` for market/economy headlines.
- FRED series observations for macro context: US 10Y yield, real yield, breakeven inflation, Fed funds, trade-weighted USD, unemployment, NFP, and CPI.

Important limitation: Yahoo `GC=F` is COMEX gold futures reference data, not your broker's XAUUSD spot execution feed. It is useful for a free live web chart and S/R monitoring, but entries/exits should still be checked against broker pricing. Alpha Vantage gold/silver history is daily/weekly/monthly, not free M5/M15 XAUUSD candles. True broker-matched intraday candles still need MT5 or a dedicated candle-capable provider.

## MT5 Live Price Bridge

The app can read live broker candles from a local MT5 bridge. Your gold symbol is configured as `XAUUSD.s`.

1. Open MT5 and log in to your broker account.
2. In Market Watch, make sure `XAUUSD.s` is visible.
3. Install the MetaTrader5 Python package:

```bash
pip install MetaTrader5
```

4. Start the bridge:

```bash
npm run mt5:bridge
```

5. In another terminal, start the app:

```bash
npm run dev
```

When the bridge is reachable, the top-right data badge changes from `Sample Data` to `MT5 Live`. If MT5 is closed, the package is missing, or `XAUUSD.s` is not selectable, the app falls back to sample data and shows the bridge error in the dashboard.

Bridge endpoints:

```text
GET http://127.0.0.1:8765/health
GET http://127.0.0.1:8765/api/candles?symbol=XAUUSD.s&timeframe=M15&bars=300
GET http://127.0.0.1:8765/api/tick?symbol=XAUUSD.s
```

## Supabase

Apply `supabase/migrations/001_xauusd_command_center.sql` to create:

- `support_resistance_zones`
- `market_events`
- `reaction_windows`
- `journal_entries`
- `setup_scores`
- `coaching_reviews`

The schema enables Row Level Security and indexes user/date/type fields used by the app.

## AI Routing

The frontend calls `/api/ai/complete` through `src/services/aiProvider.ts`. The Vercel serverless endpoint lives at `api/ai/complete.js`; the included Supabase Edge Function example in `supabase/functions/ai-complete/index.ts` is an alternative if you prefer Supabase Edge Functions.

Default routing:

- GroqCloud: fast headline classification, journal summaries, setup tagging.
- OpenRouter: deeper weekly coaching, pattern analysis, fallback model routing.

## Product Guardrail

V1 provides setup score, checklist confidence, and coaching analysis. It does not provide direct buy/sell calls, position sizing, or guaranteed predictions.
