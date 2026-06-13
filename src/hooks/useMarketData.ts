import { useEffect, useState } from 'react';
import { candles as mockCandles } from '../data/mockData';
import { fetchMt5Candles, fetchOnlineMarketData, type MarketDataSnapshot } from '../services/marketData';
import type { Timeframe } from '../types';

export function useMarketData(timeframe: Timeframe): MarketDataSnapshot {
  const [snapshot, setSnapshot] = useState<MarketDataSnapshot>({
    candles: mockCandles,
    macro: [],
    news: [],
    source: 'mock',
    status: 'fallback',
    message: 'Using sample data until an online API or MT5 bridge is available.',
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const errors: string[] = [];

      try {
        const online = await fetchOnlineMarketData();
        if (!cancelled && online.quote) {
          setSnapshot({
            candles: mockCandles,
            quote: online.quote,
            macro: online.macro,
            news: online.news,
            source: 'online-api',
            status: 'connected',
            message:
              online.warnings.length > 0
                ? `Online APIs connected with warnings: ${online.warnings.join('; ')}`
                : 'Online APIs connected: Alpha Vantage spot/news and FRED macro context.',
          });
          return;
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Online API unavailable.');
      }

      try {
        const response = await fetchMt5Candles(timeframe);
        if (!cancelled && response.candles.length > 0) {
          setSnapshot({
            candles: response.candles,
            macro: [],
            news: [],
            source: 'mt5-live',
            status: 'connected',
            message: `Live MT5 candles from ${response.symbol} ${response.timeframe}.`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          errors.push(error instanceof Error ? error.message : 'MT5 bridge unavailable.');
          setSnapshot({
            candles: mockCandles,
            macro: [],
            news: [],
            source: 'mock',
            status: 'fallback',
            message: errors.join(' | '),
          });
        }
      }
    }

    void load();
    const interval = window.setInterval(load, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [timeframe]);

  return snapshot;
}
