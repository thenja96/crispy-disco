import type { Candle, CoachingInsight, JournalEntry, MarketEvent, PriceZone, ReactionWindow } from '../types';

const base = 2325;
const startTime = Date.UTC(2026, 5, 13, 8, 0, 0);

export const candles: Candle[] = Array.from({ length: 96 }, (_, index) => {
  const wave = Math.sin(index / 5) * 5.5;
  const impulse = index > 52 && index < 66 ? (index - 52) * 1.7 : index >= 66 ? 22 - (index - 66) * 0.35 : 0;
  const drift = index * 0.18;
  const open = base + wave + drift + impulse + Math.sin(index / 2) * 1.2;
  const close = open + Math.sin(index / 3) * 3.2 + (index % 11 === 0 ? 4.6 : 0) - (index % 17 === 0 ? 3.8 : 0);
  const high = Math.max(open, close) + 2.5 + Math.abs(Math.sin(index)) * 2;
  const low = Math.min(open, close) - 2.2 - Math.abs(Math.cos(index)) * 1.8;
  const time = new Date(startTime + index * 15 * 60 * 1000).toISOString();

  return {
    time,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
  };
});

export const priceZones: PriceZone[] = [
  {
    id: 'manual-1',
    label: 'Manual Zone 2348.20 - 2352.60',
    kind: 'manual',
    top: 2352.6,
    bottom: 2348.2,
    strength: 92,
    reason: 'Weekly supply, two failed pushes, near prior NFP wick.',
  },
  {
    id: 'manual-2',
    label: 'Manual Zone 2320.00 - 2324.80',
    kind: 'manual',
    top: 2324.8,
    bottom: 2320,
    strength: 87,
    reason: 'London base, round number, yesterday value reaction.',
  },
  {
    id: 'auto-1',
    label: 'Auto Pivot 2336.40',
    kind: 'auto',
    top: 2337.7,
    bottom: 2335.1,
    strength: 76,
    reason: 'Session midpoint, swing pivot cluster, current control point.',
  },
  {
    id: 'auto-2',
    label: 'Auto Round Number 2360.00',
    kind: 'auto',
    top: 2361.2,
    bottom: 2358.8,
    strength: 68,
    reason: 'Round-number magnet above headline spike high.',
  },
];

export const marketEvents: MarketEvent[] = [
  {
    id: 'event-cpi',
    type: 'scheduled',
    title: 'US CPI YoY',
    source: 'Economic calendar',
    time: '2026-06-13T12:30:00Z',
    impact: 'high',
    theme: 'inflation / Fed path',
    summary: 'High-impact inflation print. Watch USD and yields response before trusting the first gold spike.',
  },
  {
    id: 'event-fed',
    type: 'scheduled',
    title: 'Fed speaker: policy outlook',
    source: 'Economic calendar',
    time: '2026-06-13T15:00:00Z',
    impact: 'high',
    theme: 'Fed hawkish/dovish',
    summary: 'Language around cuts, inflation persistence, and labor weakness can reprice real yields.',
  },
  {
    id: 'headline-president',
    type: 'headline',
    title: 'US president says tariffs are “on the table”',
    source: 'Headline shock monitor',
    time: '2026-06-13T14:15:00Z',
    impact: 'high',
    theme: 'tariff escalation / risk-off',
    quote: 'Tariffs are on the table.',
    summary: 'AI theme label: risk-off wording with USD and inflation implications. Measure whether gold catches safe-haven bid or rejects at supply.',
  },
  {
    id: 'headline-geopolitics',
    type: 'headline',
    title: 'Ceasefire talks described as “fragile”',
    source: 'Headline shock monitor',
    time: '2026-06-13T16:30:00Z',
    impact: 'medium',
    theme: 'geopolitical tension',
    quote: 'The ceasefire remains fragile.',
    summary: 'Gold-sensitive geopolitical wording. Await candle confirmation near manual resistance before upgrading reaction strength.',
  },
];

export const reactions: ReactionWindow[] = [
  {
    eventId: 'event-cpi',
    pre15: -2.4,
    plus5: 7.8,
    plus15: 12.6,
    plus60: 8.1,
    direction: 'bullish',
    volatility: 'expanded',
    srReaction: 'broke zone',
  },
  {
    eventId: 'headline-president',
    pre15: 1.2,
    plus5: 4.1,
    plus15: 9.7,
    plus60: 5.6,
    direction: 'bullish',
    volatility: 'expanded',
    srReaction: 'rejected zone',
  },
  {
    eventId: 'event-fed',
    pre15: 0.4,
    plus5: -3.3,
    plus15: -7.1,
    plus60: -10.2,
    direction: 'bearish',
    volatility: 'normal',
    srReaction: 'respected zone',
  },
];

export const journalEntries: JournalEntry[] = [
  {
    id: 'trade-1',
    date: '2026-06-12',
    setup: 'SR Rejection',
    session: 'New York',
    timeframe: 'M15',
    entry: 2349.4,
    stop: 2354.2,
    target: 2336.8,
    rMultiple: 2.1,
    outcome: 'win',
    zone: 'Manual Zone 2348.20 - 2352.60',
    newsContext: 'Post-CPI spike rejected weekly supply after +15m reaction slowed.',
    mistakeTags: ['Waited for close'],
    emotionTags: ['Calm', 'Patient'],
    notes: 'Best trade this week. Entry came after wick rejection and lower-timeframe momentum loss.',
  },
  {
    id: 'trade-2',
    date: '2026-06-11',
    setup: 'Breakout Retest',
    session: 'London',
    timeframe: 'M5',
    entry: 2327.2,
    stop: 2322.9,
    target: 2338.4,
    rMultiple: -1,
    outcome: 'loss',
    zone: 'Auto Pivot 2336.40',
    newsContext: 'No major news. Chased breakout before retest confirmation.',
    mistakeTags: ['Early entry', 'Weak invalidation'],
    emotionTags: ['Impatient'],
    notes: 'Entered before retest completed. Invalidation note was vague.',
  },
  {
    id: 'trade-3',
    date: '2026-06-10',
    setup: 'News Play',
    session: 'New York',
    timeframe: 'M15',
    entry: 2332.5,
    stop: 2326.3,
    target: 2345.2,
    rMultiple: 0,
    outcome: 'breakeven',
    zone: 'Manual Zone 2320.00 - 2324.80',
    newsContext: 'Fed comments created first spike, but reaction window stayed mixed.',
    mistakeTags: ['Reduced late'],
    emotionTags: ['Cautious'],
    notes: 'Good risk control, but no strong continuation after +15m window.',
  },
];

export const coachingInsights: CoachingInsight[] = [
  {
    id: 'best',
    title: 'Best setup',
    value: 'SR Rejection after spike exhaustion',
    detail: 'Your highest-quality trades wait for the first news impulse to slow near a manual zone.',
    tone: 'positive',
  },
  {
    id: 'weakest',
    title: 'Weakest setup',
    value: 'Early breakout retest',
    detail: 'Losses cluster when the retest is assumed before a close confirms the level is accepted.',
    tone: 'warning',
  },
  {
    id: 'mistake',
    title: 'Common mistake',
    value: 'Weak invalidation notes',
    detail: 'Recommendation: tighten invalidation notes before entry and review them after each session.',
    tone: 'warning',
  },
  {
    id: 'news-window',
    title: 'News-window performance',
    value: '+15m confirmation improves quality',
    detail: 'Trades aligned with the +15m reaction window show cleaner follow-through than first-spike entries.',
    tone: 'neutral',
  },
];
