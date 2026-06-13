import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Camera, Filter, Plus, Upload } from 'lucide-react';
import type { JournalEntry, Session, SetupType, Timeframe } from '../types';

interface JournalProps {
  entries: JournalEntry[];
  selectedTrade: JournalEntry;
  onAddTrade: (entry: JournalEntry) => void;
  onSelectTrade: (id: string) => void;
}

const setupTypes: SetupType[] = ['SR Rejection', 'Breakout Retest', 'News Play', 'Liquidity Sweep'];
const sessions: Session[] = ['Asia', 'London', 'New York', 'Overlap'];
const timeframes: Timeframe[] = ['M5', 'M15', 'H1', 'H4'];

export function Journal({ entries, selectedTrade, onAddTrade, onSelectTrade }: JournalProps) {
  const [filter, setFilter] = useState('all');
  const filteredEntries = useMemo(
    () => entries.filter((entry) => filter === 'all' || entry.setup === filter),
    [entries, filter],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry = Number(form.get('entry') || selectedTrade.entry);
    const stop = Number(form.get('stop') || selectedTrade.stop);
    const target = Number(form.get('target') || selectedTrade.target);
    const risk = Math.abs(entry - stop) || 1;
    const reward = Math.abs(target - entry);

    onAddTrade({
      id: `trade-${Date.now()}`,
      date: String(form.get('date') || new Date().toISOString().slice(0, 10)),
      setup: String(form.get('setup')) as SetupType,
      session: String(form.get('session')) as Session,
      timeframe: String(form.get('timeframe')) as Timeframe,
      entry,
      stop,
      target,
      rMultiple: Number((reward / risk).toFixed(2)),
      outcome: 'breakeven',
      zone: String(form.get('zone') || 'Manual Zone'),
      newsContext: String(form.get('newsContext') || 'No major news tagged.'),
      mistakeTags: String(form.get('mistakeTags') || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      emotionTags: String(form.get('emotionTags') || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: String(form.get('notes') || ''),
    });

    event.currentTarget.reset();
  }

  return (
    <section className="journal-grid">
      <div className="panel journal-table-panel">
        <div className="panel-heading">
          <div>
            <span>Trading Journal</span>
            <h2>Stats + AI Coach source data</h2>
          </div>
          <div className="filter-control">
            <Filter size={15} />
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All setups</option>
              {setupTypes.map((setup) => (
                <option key={setup} value={setup}>{setup}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="journal-table" role="table" aria-label="Trading journal">
          <div className="journal-row header" role="row">
            <span>Date</span>
            <span>Setup</span>
            <span>Session</span>
            <span>TF</span>
            <span>R</span>
            <span>Outcome</span>
          </div>
          {filteredEntries.map((entry) => (
            <button
              className={`journal-row ${entry.id === selectedTrade.id ? 'selected' : ''}`}
              key={entry.id}
              onClick={() => onSelectTrade(entry.id)}
              type="button"
              role="row"
            >
              <span>{entry.date}</span>
              <strong>{entry.setup}</strong>
              <span>{entry.session}</span>
              <span>{entry.timeframe}</span>
              <b>{entry.rMultiple.toFixed(1)}R</b>
              <span className={`outcome ${entry.outcome}`}>{entry.outcome}</span>
            </button>
          ))}
        </div>
      </div>

      <aside className="panel trade-detail">
        <div className="panel-heading">
          <div>
            <span>Pattern Review</span>
            <h2>Selected trade detail</h2>
          </div>
          <Camera size={20} />
        </div>
        <div className="screenshot-drop">
          <Upload size={24} />
          <strong>Manual Screenshot</strong>
          <span>Upload chart capture from TradingView or MT5</span>
        </div>
        <dl className="detail-list">
          <div><dt>Entry</dt><dd>{selectedTrade.entry}</dd></div>
          <div><dt>Stop</dt><dd>{selectedTrade.stop}</dd></div>
          <div><dt>Target</dt><dd>{selectedTrade.target}</dd></div>
          <div><dt>Zone</dt><dd>{selectedTrade.zone}</dd></div>
          <div><dt>News</dt><dd>{selectedTrade.newsContext}</dd></div>
        </dl>
        <div className="tag-block">
          <span>Mistake Tags</span>
          {selectedTrade.mistakeTags.map((tag) => <b key={tag}>{tag}</b>)}
        </div>
        <div className="tag-block">
          <span>Emotion / State</span>
          {selectedTrade.emotionTags.map((tag) => <b key={tag}>{tag}</b>)}
        </div>
        <p className="notes">{selectedTrade.notes}</p>
      </aside>

      <form className="panel add-trade-form" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <span>Journal Quick Add</span>
            <h2>Add today’s trade</h2>
          </div>
          <Plus size={20} />
        </div>
        <div className="form-grid">
          <label>Date <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Setup <select name="setup">{setupTypes.map((setup) => <option key={setup}>{setup}</option>)}</select></label>
          <label>Session <select name="session">{sessions.map((session) => <option key={session}>{session}</option>)}</select></label>
          <label>Timeframe <select name="timeframe">{timeframes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Entry <input name="entry" type="number" step="0.1" placeholder="2348.2" /></label>
          <label>Stop <input name="stop" type="number" step="0.1" placeholder="2354.0" /></label>
          <label>Target <input name="target" type="number" step="0.1" placeholder="2336.4" /></label>
          <label>Zone <input name="zone" placeholder="Manual Zone 2348-2352" /></label>
          <label className="wide">News context <input name="newsContext" placeholder="Headline shock, CPI, Fed speaker, no major news..." /></label>
          <label>Mistake tags <input name="mistakeTags" placeholder="Early entry, weak invalidation" /></label>
          <label>Emotion tags <input name="emotionTags" placeholder="Calm, impatient" /></label>
          <label className="wide">Notes <textarea name="notes" placeholder="What happened, what improved, what to tighten next time." /></label>
        </div>
        <button className="primary-button" type="submit">Save journal entry</button>
      </form>
    </section>
  );
}
