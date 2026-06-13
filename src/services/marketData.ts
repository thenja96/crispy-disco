import type { Candle, MacroPoint, OnlineNewsItem, OnlineQuote, Timeframe } from '../types';

export interface MarketDataSnapshot {
  candles: Candle[];
  quote?: OnlineQuote;
  macro: MacroPoint[];
  news: OnlineNewsItem[];
  source: 'online-api' | 'mt5-live' | 'mock';
  status: 'connected' | 'fallback';
  message: string;
}

interface CandleResponse {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
}

const marketDataUrl = import.meta.env.VITE_MARKET_DATA_URL as string | undefined;
const onlineMarketDataUrl = import.meta.env.VITE_ONLINE_MARKET_DATA_URL as string | undefined;
const marketSymbol = (import.meta.env.VITE_MARKET_SYMBOL as string | undefined) ?? 'XAUUSD.s';

export function configuredMarketSymbol() {
  return marketSymbol;
}

export async function fetchMt5Candles(timeframe: Timeframe, bars = 300): Promise<CandleResponse> {
  if (!marketDataUrl) {
    throw new Error('VITE_MARKET_DATA_URL is not configured');
  }

  const url = new URL('/api/candles', marketDataUrl);
  url.searchParams.set('symbol', marketSymbol);
  url.searchParams.set('timeframe', timeframe);
  url.searchParams.set('bars', String(bars));

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `Market data request failed with ${response.status}`);
  }

  return payload as CandleResponse;
}

export interface OnlineMarketDataResponse {
  source: 'online-api';
  quote: OnlineQuote | null;
  macro: MacroPoint[];
  news: OnlineNewsItem[];
  warnings: string[];
  fetchedAt: string;
}

export async function fetchOnlineMarketData(): Promise<OnlineMarketDataResponse> {
  if (!onlineMarketDataUrl) {
    throw new Error('VITE_ONLINE_MARKET_DATA_URL is not configured');
  }

  const response = await fetch(onlineMarketDataUrl);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? payload.warnings?.join('; ') ?? `Online API request failed with ${response.status}`);
  }

  return payload as OnlineMarketDataResponse;
}
