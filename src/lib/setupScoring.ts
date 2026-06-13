import type { Candle, JournalEntry, MarketEvent, PriceZone, SetupScore } from '../types';

export function scoreCurrentSetup(
  candles: Candle[],
  zones: PriceZone[],
  events: MarketEvent[],
  journalEntries: JournalEntry[],
): SetupScore {
  if (candles.length < 12 || zones.length === 0) {
    return {
      bias: 'neutral',
      score: 0,
      confidence: 'low',
      checklist: [
        {
          label: 'Market data',
          passed: false,
          detail: 'Waiting for enough candles and support/resistance zones.',
        },
      ],
    };
  }

  const last = candles[candles.length - 1];
  const previous = candles[Math.max(0, candles.length - 20)];
  const momentum = last.close - previous.close;
  const recent = candles.slice(-20);
  const averageRange = recent.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / recent.length;
  const candleRange = Math.max(0.01, last.high - last.low);
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const nearestZone = zones
    .map((zone) => {
      const inside = zone.bottom <= last.close && last.close <= zone.top;
      const distance = inside ? 0 : Math.min(Math.abs(last.close - zone.top), Math.abs(last.close - zone.bottom));
      return { zone, distance, inside };
    })
    .sort((a, b) => a.distance - b.distance)[0];
  const lastTime = new Date(last.time).getTime();
  const highImpactNear = events.some((event) => {
    const eventTime = new Date(event.time).getTime();
    return event.impact === 'high' && Number.isFinite(eventTime) && Math.abs(eventTime - lastTime) <= 90 * 60 * 1000;
  });
  const rejectionAtZone =
    nearestZone.distance <= Math.max(4, averageRange * 0.8) &&
    ((last.close > last.open && lowerWick / candleRange > 0.35) || (last.close < last.open && upperWick / candleRange > 0.35));
  const trendDetail =
    Math.abs(momentum) > averageRange * 1.4
      ? `${momentum > 0 ? 'Bullish' : 'Bearish'} pressure across the last 20 candles.`
      : 'Momentum is mixed; wait for clearer acceptance or rejection.';
  const strongJournalPattern = journalEntries.filter((entry) => entry.setup === 'SR Rejection' && entry.outcome === 'win').length >= 1;
  const checklist = [
    {
      label: 'S/R quality',
      passed: nearestZone.distance <= Math.max(5, averageRange) && nearestZone.zone.strength >= 70,
      detail: `${nearestZone.zone.label} is ${nearestZone.distance.toFixed(1)} points from price with ${nearestZone.zone.strength}% strength.`,
    },
    {
      label: 'Trend context',
      passed: Math.abs(momentum) > averageRange * 1.4,
      detail: trendDetail,
    },
    {
      label: 'News risk',
      passed: !highImpactNear,
      detail: highImpactNear ? 'High-impact news/headline window is active.' : 'No high-impact news window detected.',
    },
    {
      label: 'Reaction behavior',
      passed: candleRange >= averageRange * 0.65,
      detail: `Current range is ${candleRange.toFixed(1)} points vs ${averageRange.toFixed(1)} average.`,
    },
    {
      label: 'Zone rejection',
      passed: rejectionAtZone,
      detail: rejectionAtZone ? 'Latest candle shows wick rejection near the active zone.' : 'No clear wick rejection near the active zone yet.',
    },
    {
      label: 'Journal edge',
      passed: strongJournalPattern,
      detail: 'Recent journal history favors patient S/R rejection setups.',
    },
  ];
  const passed = checklist.filter((item) => item.passed).length;
  const score = Math.round((passed / checklist.length) * 100);

  return {
    bias: momentum > averageRange * 1.4 ? 'bullish' : momentum < -averageRange * 1.4 ? 'bearish' : 'neutral',
    score,
    confidence: score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low',
    checklist,
  };
}
