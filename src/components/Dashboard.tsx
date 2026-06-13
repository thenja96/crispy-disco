import type { CSSProperties } from 'react';
import { AlertTriangle, Brain, Clock3, Gauge, Newspaper, ShieldCheck } from 'lucide-react';
import { ChartPanel } from './ChartPanel';
import type { Candle, MacroPoint, MarketEvent, OnlineNewsItem, PriceZone, ReactionWindow, SetupScore, Timeframe } from '../types';

interface DashboardProps {
  candles: Candle[];
  events: MarketEvent[];
  zones: PriceZone[];
  reactions: ReactionWindow[];
  setupScore: SetupScore;
  marketMessage: string;
  macro: MacroPoint[];
  onlineNews: OnlineNewsItem[];
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export function Dashboard({
  candles,
  events,
  zones,
  reactions,
  setupScore,
  marketMessage,
  macro,
  onlineNews,
  timeframe,
  onTimeframeChange,
}: DashboardProps) {
  const highImpactEvents = events.filter((event) => event.impact === 'high');
  const activeReaction = reactions.find((reaction) => reaction.eventId === 'headline-president') ?? reactions[0];

  return (
    <section className="dashboard-grid">
      <ChartPanel
        candles={candles}
        events={events}
        timeframe={timeframe}
        zones={zones}
        onTimeframeChange={onTimeframeChange}
      />

      <aside className="right-rail">
        <div className="panel compact">
          <div className="panel-heading">
            <div>
              <span>Setup score</span>
              <h2>{setupScore.bias.toUpperCase()} context</h2>
            </div>
            <Gauge size={20} />
          </div>
          <div className="score-ring" style={{ '--score': `${setupScore.score}%` } as CSSProperties}>
            <strong>{setupScore.score}</strong>
            <span>{setupScore.confidence} confidence</span>
          </div>
          <div className="checklist">
            {setupScore.checklist.map((item) => (
              <div className="check-row" key={item.label}>
                <ShieldCheck className={item.passed ? 'pass' : 'fail'} size={16} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel compact">
          <div className="panel-heading">
            <div>
              <span>Upcoming High Impact News</span>
              <h2>US macro and Fed</h2>
            </div>
            <Newspaper size={20} />
          </div>
          {macro.length > 0 && (
            <div className="macro-grid">
              {macro.slice(0, 4).map((point) => (
                <div className="macro-tile" key={point.id}>
                  <span>{point.label}</span>
                  <strong>{point.value ?? 'n/a'}</strong>
                  <small>{point.date}</small>
                </div>
              ))}
            </div>
          )}
          <div className="event-list">
            {highImpactEvents.map((event) => (
              <article className="event-row" key={event.id}>
                <Clock3 size={16} />
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.theme}</span>
                </div>
                <b>{event.type === 'headline' ? 'Shock' : 'High'}</b>
              </article>
            ))}
          </div>
        </div>

        {onlineNews.length > 0 && (
          <div className="panel compact">
            <div className="panel-heading">
              <div>
                <span>Alpha Vantage News</span>
                <h2>Market sentiment feed</h2>
              </div>
              <Newspaper size={20} />
            </div>
            <div className="online-news-list">
              {onlineNews.slice(0, 3).map((item) => (
                <article key={`${item.title}-${item.timePublished}`}>
                  <strong>{item.title}</strong>
                  <span>{item.source} · {item.sentiment ?? 'sentiment n/a'}</span>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="panel compact gold-panel">
          <div className="panel-heading">
            <div>
              <span>News Reaction Window</span>
              <h2>Headline shock monitor</h2>
            </div>
            <AlertTriangle size={20} />
          </div>
          <div className="reaction-grid">
            <Metric label="Pre News" value={activeReaction.pre15} />
            <Metric label="+5m" value={activeReaction.plus5} />
            <Metric label="+15m Reaction" value={activeReaction.plus15} />
            <Metric label="+60m" value={activeReaction.plus60} />
          </div>
          <p className="muted-copy">
            AI theme labels are analysis only. No buy/sell advice or position sizing is generated.
          </p>
        </div>

        <div className="panel compact">
          <div className="panel-heading">
            <div>
              <span>Coaching Mode: Pattern Review</span>
              <h2>Today’s discipline focus</h2>
            </div>
            <Brain size={20} />
          </div>
          <p className="coach-note">Wait for +15m confirmation near manual zones before trusting first-spike emotion.</p>
          <p className="muted-copy">{marketMessage}</p>
        </div>
      </aside>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={`metric ${value > 0 ? 'up' : value < 0 ? 'down' : ''}`}>
      <span>{label}</span>
      <strong>{value > 0 ? '+' : ''}{value.toFixed(1)}</strong>
    </div>
  );
}
