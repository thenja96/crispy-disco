export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4';
export type Bias = 'bullish' | 'bearish' | 'neutral';
export type EventType = 'scheduled' | 'headline';
export type Impact = 'high' | 'medium' | 'low';
export type SetupType = 'SR Rejection' | 'Breakout Retest' | 'News Play' | 'Liquidity Sweep';
export type Session = 'Asia' | 'London' | 'New York' | 'Overlap';

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface OnlineQuote {
  symbol: string;
  price: number;
  provider: string;
  asOf: string;
  note?: string;
}

export interface MacroPoint {
  id: string;
  label: string;
  date?: string;
  value: number | null;
}

export interface OnlineNewsItem {
  title: string;
  source?: string;
  url?: string;
  timePublished?: string;
  summary?: string;
  sentiment?: string;
  score?: number;
}

export interface PriceZone {
  id: string;
  label: string;
  kind: 'manual' | 'auto';
  top: number;
  bottom: number;
  strength: number;
  reason: string;
}

export interface MarketEvent {
  id: string;
  type: EventType;
  title: string;
  source: string;
  time: string;
  impact: Impact;
  theme: string;
  quote?: string;
  summary: string;
}

export interface ReactionWindow {
  eventId: string;
  pre15: number;
  plus5: number;
  plus15: number;
  plus60: number;
  direction: Bias;
  volatility: 'compressed' | 'normal' | 'expanded';
  srReaction: 'respected zone' | 'rejected zone' | 'broke zone' | 'no nearby zone';
}

export interface SetupScore {
  bias: Bias;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  checklist: Array<{
    label: string;
    passed: boolean;
    detail: string;
  }>;
}

export interface JournalEntry {
  id: string;
  date: string;
  setup: SetupType;
  session: Session;
  timeframe: Timeframe;
  entry: number;
  stop: number;
  target: number;
  rMultiple: number;
  outcome: 'win' | 'loss' | 'breakeven';
  zone: string;
  newsContext: string;
  screenshotUrl?: string;
  mistakeTags: string[];
  emotionTags: string[];
  notes: string;
}

export interface CoachingInsight {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: 'positive' | 'warning' | 'neutral';
}
