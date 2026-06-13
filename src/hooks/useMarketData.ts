import { useEffect, useState } from 'react';
import { candles as mockCandles } from '../data/mockData';
import {
  buildSpotQuoteCandles,
  fetchMt5Candles,
  fetchOnlineMarketData,
  type MarketDataSnapshot,
} from '../services/marketData';
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
      let onlineContext: Pick<MarketDataSnapshot, 'macro' | 'news' | 'message'> | null = null;

      try {
        const online = await fetchOnlineMarketData(timeframe);
        const warningText = online.warnings.length > 0 ? online.warnings.join('; ') : '';
        onlineContext = {
          macro: online.macro,
          news: online.news,
          message: warningText
            ? `Online macro/news connected, but live quote is unavailable: ${warningText}`
            : 'Online macro/news connected, but live quote is unavailable.',
        };

        if (!cancelled && online.candles && online.candles.length > 0) {
          setSnapshot({
            candles: online.candles,
            quote: online.quote ?? undefined,
            macro: online.macro,
            news: online.news,
            source: 'online-api',
            status: 'connected',
            message:
              online.warnings.length > 0
                ? `Online candles connected from ${online.candleSource ?? 'market API'} with warnings: ${online.warnings.join('; ')}`
                : `Online candles connected from ${online.candleSource ?? 'market API'}. Use this as futures reference data, not broker execution pricing.`,
          });
          return;
        }

        if (!cancelled && online.quote) {
          const candles = buildSpotQuoteCandles(online.quote, timeframe);
          setSnapshot({
            candles,
            quote: online.quote,
            macro: online.macro,
            news: online.news,
            source: 'online-api',
            status: 'connected',
            message:
              online.warnings.length > 0
                ? `Online APIs connected with warnings: ${online.warnings.join('; ')}`
                : 'Online APIs connected: chart is tracking Alpha Vantage spot quote with derived candles. Full M5/M15 broker candles still need MT5 or another candle feed.',
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
            macro: onlineContext?.macro ?? [],
            news: onlineContext?.news ?? [],
            source: 'mock',
            status: 'fallback',
            message: [onlineContext?.message, ...errors].filter(Boolean).join(' | '),
          });
        }
      }
    }

    void load();
    const interval = window.setInterval(load, 5 * 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [timeframe]);

  return snapshot;
}
