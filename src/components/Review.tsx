import { Brain, CalendarDays, CheckCircle2, LineChart, TrendingDown, TrendingUp } from 'lucide-react';
import type { CoachingInsight, JournalEntry, SetupScore } from '../types';

interface ReviewProps {
  entries: JournalEntry[];
  insights: CoachingInsight[];
  setupScore: SetupScore;
}

export function Review({ entries, insights, setupScore }: ReviewProps) {
  const wins = entries.filter((entry) => entry.outcome === 'win').length;
  const losses = entries.filter((entry) => entry.outcome === 'loss').length;
  const averageR = entries.reduce((sum, entry) => sum + entry.rMultiple, 0) / entries.length;

  return (
    <section className="review-grid">
      <div className="panel review-hero">
        <div className="panel-heading">
          <div>
            <span>Stats + AI Coach</span>
            <h2>Daily and weekly pattern review</h2>
          </div>
          <Brain size={22} />
        </div>
        <div className="review-stats">
          <Stat icon={TrendingUp} label="Wins" value={String(wins)} />
          <Stat icon={TrendingDown} label="Losses" value={String(losses)} />
          <Stat icon={LineChart} label="Avg R" value={`${averageR.toFixed(2)}R`} />
          <Stat icon={CheckCircle2} label="Setup score" value={`${setupScore.score}%`} />
        </div>
        <p>
          What improved this week: stronger patience around manual zones. Recommendation: tighten invalidation notes before entry
          and tag every trade with the active news or headline context.
        </p>
      </div>

      <div className="insight-grid">
        {insights.map((insight) => (
          <article className={`insight-card ${insight.tone}`} key={insight.id}>
            <span>{insight.title}</span>
            <strong>{insight.value}</strong>
            <p>{insight.detail}</p>
          </article>
        ))}
      </div>

      <aside className="panel learning-panel">
        <div className="panel-heading">
          <div>
            <span>Learning loop</span>
            <h2>How the score improves</h2>
          </div>
          <CalendarDays size={21} />
        </div>
        <ol className="learning-list">
          <li>Capture trade context, screenshot, S/R zone, setup type, and news/headline state.</li>
          <li>Compare outcome against checklist conditions and reaction window data.</li>
          <li>Update setup-quality statistics without rewriting past trade history.</li>
          <li>Generate coaching language that explains patterns but avoids direct signals.</li>
        </ol>
      </aside>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="stat-card">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
