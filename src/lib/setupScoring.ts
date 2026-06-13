import type { Candle, JournalEntry, MarketEvent, PriceZone, SetupScore } from '../types';

export function scoreCurrentSetup(
  candles: Candle[],
  zones: PriceZone[],
  events: MarketEvent[],
  journalEntries: JournalEntry[],
): SetupScore {
  const last = candles[candles.length - 1];
  const previous = candles[candles.length - 8];
  const momentum = last.close - previous.close;
  const nearestZone = zones
    .map((zone) => ({ zone, distance: Math.min(Math.abs(last.close - zone.top), Math.abs(last.close - zone.bottom)) }))
    .sort((a, b) => a.distance - b.distance)[0];
  const highImpactNear = events.some((event) => event.impact === 'high');
  const strongJournalPattern = journalEntries.filter((entry) => entry.setup === 'SR Rejection' && entry.outcome === 'win').length >= 1;
  const checklist = [
    {
      label: 'S/R quality',
      passed: nearestZone.distance <= 7 && nearestZone.zone.strength >= 75,
      detail: `${nearestZone.zone.label} is ${nearestZone.distance.toFixed(1)} points from price.`,
    },
    {
      label: 'Trend context',
      passed: Math.abs(momentum) > 6,
      detail: `${momentum > 0 ? 'Bullish' : 'Bearish'} intraday pressure over recent candles.`,
    },
    {
      label: 'News risk',
      passed: !highImpactNear,
      detail: highImpactNear ? 'High-impact news/headline window is active.' : 'No high-impact news window detected.',
    },
    {
      label: 'Reaction behavior',
      passed: last.high - last.low > 5,
      detail: 'Current candle range shows enough activity to judge reaction.',
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
    bias: momentum > 6 ? 'bullish' : momentum < -6 ? 'bearish' : 'neutral',
    score,
    confidence: score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low',
    checklist,
  };
}
