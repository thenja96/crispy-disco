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

const timeframeMinutes: Record<Timeframe, number> = {
  M5: 5,
  M15: 15,
  H1: 60,
  H4: 240,
};

function timeframeMs(timeframe: Timeframe) {
  return timeframeMinutes[timeframe] * 60 * 1000;
}

function bucketTime(date: Date, timeframe: Timeframe) {
  const interval = timeframeMs(timeframe);
  return new Date(Math.floor(date.getTime() / interval) * interval);
}

function seededNoise(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function buildSpotQuoteCandles(quote: OnlineQuote, timeframe: Timeframe, bars = 180): Candle[] {
  const interval = timeframeMs(timeframe);
  const anchor = bucketTime(new Date(quote.asOf), timeframe).getTime();
  const seed = Math.round(quote.price * 100);
  const volatility = Math.max(1.2, quote.price * 0.0009);

  return Array.from({ length: bars }, (_, index) => {
    const distanceFromLatest = bars - index - 1;
    const time = anchor - distanceFromLatest * interval;
    const trend = (index - bars) * volatility * 0.015;
    const wave = Math.sin(index / 5.5) * volatility * 1.8 + Math.cos(index / 13) * volatility * 1.1;
    const close = quote.price + trend + wave - Math.sin((bars - 1) / 5.5) * volatility * 1.8;
    const previousWave =
      Math.sin((index - 1) / 5.5) * volatility * 1.8 + Math.cos((index - 1) / 13) * volatility * 1.1;
    const open = index === 0 ? close - volatility * 0.25 : quote.price + trend + previousWave;
    const upperWick = volatility * (0.25 + seededNoise(index, seed) * 0.85);
    const lowerWick = volatility * (0.25 + seededNoise(index + 1000, seed) * 0.85);

    return {
      time: new Date(time).toISOString(),
      open: Number(open.toFixed(2)),
      high: Number((Math.max(open, close) + upperWick).toFixed(2)),
      low: Number((Math.min(open, close) - lowerWick).toFixed(2)),
      close: Number(close.toFixed(2)),
    };
  }).map((candle, index, series) => {
    if (index !== series.length - 1) {
      return candle;
    }

    return {
      ...candle,
      close: quote.price,
      high: Number(Math.max(candle.high, quote.price).toFixed(2)),
      low: Number(Math.min(candle.low, quote.price).toFixed(2)),
    };
  });
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
  candles?: Candle[];
  candleSource?: string;
  macro: MacroPoint[];
  news: OnlineNewsItem[];
  warnings: string[];
  fetchedAt: string;
}

export async function fetchOnlineMarketData(timeframe?: Timeframe): Promise<OnlineMarketDataResponse> {
  if (!onlineMarketDataUrl) {
    throw new Error('VITE_ONLINE_MARKET_DATA_URL is not configured');
  }

  const url = new URL(onlineMarketDataUrl, window.location.origin);
  if (timeframe) {
    url.searchParams.set('timeframe', timeframe);
  }

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? payload.warnings?.join('; ') ?? `Online API request failed with ${response.status}`);
  }

  return payload as OnlineMarketDataResponse;
}
