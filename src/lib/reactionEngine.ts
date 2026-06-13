import type { Candle, MarketEvent, PriceZone, ReactionWindow } from '../types';

const minutes = 60_000;

function findNearestCandle(candles: Candle[], targetTime: number) {
  return candles.reduce((nearest, candle) => {
    const distance = Math.abs(new Date(candle.time).getTime() - targetTime);
    const nearestDistance = Math.abs(new Date(nearest.time).getTime() - targetTime);
    return distance < nearestDistance ? candle : nearest;
  }, candles[0]);
}

function nearestZone(price: number, zones: PriceZone[]) {
  return zones
    .map((zone) => {
      const center = (zone.top + zone.bottom) / 2;
      return { zone, distance: Math.abs(price - center) };
    })
    .sort((a, b) => a.distance - b.distance)[0];
}

export function calculateReaction(event: MarketEvent, candles: Candle[], zones: PriceZone[]): ReactionWindow {
  const eventTime = new Date(event.time).getTime();
  const eventCandle = findNearestCandle(candles, eventTime);
  const preCandle = findNearestCandle(candles, eventTime - 15 * minutes);
  const plus5Candle = findNearestCandle(candles, eventTime + 5 * minutes);
  const plus15Candle = findNearestCandle(candles, eventTime + 15 * minutes);
  const plus60Candle = findNearestCandle(candles, eventTime + 60 * minutes);
  const pre15 = Number((eventCandle.close - preCandle.close).toFixed(2));
  const plus5 = Number((plus5Candle.close - eventCandle.close).toFixed(2));
  const plus15 = Number((plus15Candle.close - eventCandle.close).toFixed(2));
  const plus60 = Number((plus60Candle.close - eventCandle.close).toFixed(2));
  const absoluteRange = Math.abs(plus15) + Math.abs(plus60);
  const closest = nearestZone(eventCandle.close, zones);
  const insideZone = closest?.zone.bottom <= eventCandle.close && eventCandle.close <= closest.zone.top;

  return {
    eventId: event.id,
    pre15,
    plus5,
    plus15,
    plus60,
    direction: plus15 > 2 ? 'bullish' : plus15 < -2 ? 'bearish' : 'neutral',
    volatility: absoluteRange > 16 ? 'expanded' : absoluteRange < 6 ? 'compressed' : 'normal',
    srReaction: insideZone ? (Math.abs(plus15) > 7 ? 'broke zone' : 'rejected zone') : 'no nearby zone',
  };
}
