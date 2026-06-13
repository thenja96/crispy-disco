import type { Candle, PriceZone } from '../types';

interface PivotCandidate {
  price: number;
  type: 'support' | 'resistance';
  time: string;
  touches: number;
}

function lastPrice(candles: Candle[]) {
  return candles[candles.length - 1]?.close ?? 0;
}

function zoneFromLevel(id: string, label: string, price: number, strength: number, reason: string): PriceZone {
  const width = Math.max(1.2, price * 0.00035);

  return {
    id,
    label,
    kind: 'auto',
    top: Number((price + width).toFixed(2)),
    bottom: Number((price - width).toFixed(2)),
    strength: Math.min(96, Math.max(45, Math.round(strength))),
    reason,
  };
}

function mergeNearbyZones(zones: PriceZone[], tolerance: number) {
  const sorted = [...zones].sort((a, b) => (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
  const merged: PriceZone[] = [];

  sorted.forEach((zone) => {
    const center = (zone.top + zone.bottom) / 2;
    const existing = merged.find((item) => {
      const existingCenter = (item.top + item.bottom) / 2;
      return Math.abs(existingCenter - center) <= tolerance;
    });

    if (!existing) {
      merged.push(zone);
      return;
    }

    existing.top = Number(Math.max(existing.top, zone.top).toFixed(2));
    existing.bottom = Number(Math.min(existing.bottom, zone.bottom).toFixed(2));
    existing.strength = Math.min(98, existing.strength + Math.round(zone.strength * 0.18));
    existing.reason = `${existing.reason} + ${zone.reason}`;
  });

  return merged;
}

function findSwingPivots(candles: Candle[]) {
  const pivots: PivotCandidate[] = [];
  const leftRight = 3;

  for (let index = leftRight; index < candles.length - leftRight; index += 1) {
    const candle = candles[index];
    const neighbors = candles.slice(index - leftRight, index + leftRight + 1);
    const isSwingHigh = neighbors.every((item) => candle.high >= item.high);
    const isSwingLow = neighbors.every((item) => candle.low <= item.low);

    if (isSwingHigh) {
      pivots.push({ price: candle.high, type: 'resistance', time: candle.time, touches: 1 });
    }

    if (isSwingLow) {
      pivots.push({ price: candle.low, type: 'support', time: candle.time, touches: 1 });
    }
  }

  return pivots;
}

function clusterPivots(candles: Candle[], currentPrice: number) {
  const tolerance = Math.max(2.5, currentPrice * 0.0008);
  const pivots = findSwingPivots(candles);
  const clusters: PivotCandidate[] = [];

  pivots.forEach((pivot) => {
    const cluster = clusters.find((item) => Math.abs(item.price - pivot.price) <= tolerance);
    if (!cluster) {
      clusters.push({ ...pivot });
      return;
    }

    cluster.price = (cluster.price * cluster.touches + pivot.price) / (cluster.touches + 1);
    cluster.touches += 1;
    cluster.time = pivot.time > cluster.time ? pivot.time : cluster.time;
  });

  return clusters
    .map((pivot, index) => {
      const distance = Math.abs(currentPrice - pivot.price);
      const recencyBonus = candles.findIndex((candle) => candle.time === pivot.time) / Math.max(1, candles.length);
      const strength = 48 + pivot.touches * 11 + recencyBonus * 12 - Math.min(18, distance / tolerance);

      return zoneFromLevel(
        `auto-pivot-${index}`,
        `${pivot.type === 'support' ? 'Swing Support' : 'Swing Resistance'} ${pivot.price.toFixed(2)}`,
        pivot.price,
        strength,
        `${pivot.touches} pivot touch${pivot.touches === 1 ? '' : 'es'} within recent structure.`,
      );
    })
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8);
}

function priorDayZones(candles: Candle[]) {
  const byDate = new Map<string, Candle[]>();

  candles.forEach((candle) => {
    const day = candle.time.slice(0, 10);
    byDate.set(day, [...(byDate.get(day) ?? []), candle]);
  });

  const days = Array.from(byDate.keys()).sort();
  const previousDay = days[days.length - 2];
  if (!previousDay) {
    return [];
  }

  const dayCandles = byDate.get(previousDay) ?? [];
  const high = Math.max(...dayCandles.map((candle) => candle.high));
  const low = Math.min(...dayCandles.map((candle) => candle.low));

  return [
    zoneFromLevel('auto-prev-day-high', `Prior Day High ${high.toFixed(2)}`, high, 82, 'Yesterday high; common stop and reaction area.'),
    zoneFromLevel('auto-prev-day-low', `Prior Day Low ${low.toFixed(2)}`, low, 82, 'Yesterday low; common stop and reaction area.'),
  ];
}

function sessionZones(candles: Candle[]) {
  const recent = candles.slice(-96);
  if (recent.length < 8) {
    return [];
  }

  const high = Math.max(...recent.map((candle) => candle.high));
  const low = Math.min(...recent.map((candle) => candle.low));

  return [
    zoneFromLevel('auto-session-high', `Recent Session High ${high.toFixed(2)}`, high, 76, 'Highest traded area in the recent intraday window.'),
    zoneFromLevel('auto-session-low', `Recent Session Low ${low.toFixed(2)}`, low, 76, 'Lowest traded area in the recent intraday window.'),
  ];
}

function roundNumberZones(currentPrice: number) {
  const step = currentPrice >= 3000 ? 25 : 10;
  const base = Math.round(currentPrice / step) * step;

  return [-2, -1, 0, 1, 2].map((offset) => {
    const level = base + offset * step;
    const isMajor = level % (step * 2) === 0;
    return zoneFromLevel(
      `auto-round-${level}`,
      `${isMajor ? 'Major' : 'Minor'} Round Number ${level.toFixed(2)}`,
      level,
      isMajor ? 72 : 62,
      'Psychological round-number magnet for gold liquidity.',
    );
  });
}

export function buildSupportResistanceZones(candles: Candle[], manualZones: PriceZone[] = []) {
  if (candles.length === 0) {
    return manualZones;
  }

  const currentPrice = lastPrice(candles);
  const liveAutoZones = [
    ...priorDayZones(candles),
    ...sessionZones(candles),
    ...clusterPivots(candles, currentPrice),
    ...roundNumberZones(currentPrice),
  ];
  const mergedAuto = mergeNearbyZones(liveAutoZones, Math.max(2.5, currentPrice * 0.0009));
  const relevantManual = manualZones.filter((zone) => {
    const center = (zone.top + zone.bottom) / 2;
    return Math.abs(center - currentPrice) <= Math.max(200, currentPrice * 0.06);
  });

  return [...relevantManual, ...mergedAuto]
    .sort((a, b) => {
      const distanceA = Math.abs((a.top + a.bottom) / 2 - currentPrice);
      const distanceB = Math.abs((b.top + b.bottom) / 2 - currentPrice);
      return distanceA - distanceB || b.strength - a.strength;
    })
    .slice(0, 14);
}
