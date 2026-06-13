import { AlertTriangle, Bot, Clock3, RadioTower, Sparkles } from 'lucide-react';
import type { MarketEvent, ReactionWindow } from '../types';

interface NewsDeskProps {
  events: MarketEvent[];
  reactions: ReactionWindow[];
}

export function NewsDesk({ events, reactions }: NewsDeskProps) {
  return (
    <section className="news-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <span>{events.some((event) => event.type === 'headline') ? 'Headline Shocks' : 'Scheduled News'}</span>
            <h2>Market-moving language monitor</h2>
          </div>
          <RadioTower size={21} />
        </div>

        <div className="news-list">
          {events.map((event) => {
            const reaction = reactions.find((item) => item.eventId === event.id);
            return (
              <article className="news-card" key={event.id}>
                <div className="news-card-main">
                  <div className={`impact-dot ${event.impact}`} />
                  <div>
                    <div className="news-title-line">
                      <strong>{event.title}</strong>
                      <span>{event.source}</span>
                    </div>
                    {event.quote && <blockquote>{event.quote}</blockquote>}
                    <p>{event.summary}</p>
                  </div>
                </div>
                <div className="news-meta">
                  <span><Clock3 size={14} /> {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span><Sparkles size={14} /> {event.theme}</span>
                </div>
                {reaction && (
                  <div className="reaction-strip">
                    <Metric label="-15m" value={reaction.pre15} />
                    <Metric label="+5m" value={reaction.plus5} />
                    <Metric label="+15m" value={reaction.plus15} />
                    <Metric label="+60m" value={reaction.plus60} />
                    <span className="reaction-badge">{reaction.srReaction}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <aside className="panel ai-guardrail">
        <div className="panel-heading">
          <div>
            <span>AI interpretation</span>
            <h2>Theme classifier</h2>
          </div>
          <Bot size={21} />
        </div>
        <div className="guardrail-copy">
          <AlertTriangle size={18} />
          <p>
            The system classifies words like tariff, ceasefire, inflation, cut, and sanctions into gold-sensitive themes,
            then checks how XAUUSD actually reacted. It does not turn headlines into direct trade instructions.
          </p>
        </div>
        <div className="theme-cloud">
          {['risk-off', 'USD strength', 'tariff escalation', 'Fed hawkish', 'inflation fear', 'geopolitical tension'].map((theme) => (
            <span key={theme}>{theme}</span>
          ))}
        </div>
      </aside>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className={`mini-metric ${value > 0 ? 'up' : value < 0 ? 'down' : ''}`}>
      {label} <b>{value > 0 ? '+' : ''}{value.toFixed(1)}</b>
    </span>
  );
}
