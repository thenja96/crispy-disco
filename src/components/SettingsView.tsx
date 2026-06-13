import { Database, KeyRound, Lock, Server, ShieldAlert, Zap } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export function SettingsView() {
  const providerRows = [
    { label: 'Supabase', value: supabase ? 'Configured' : 'Waiting for env', icon: Database },
    { label: 'GroqCloud', value: 'Server-side key required', icon: Zap },
    { label: 'OpenRouter', value: 'Server-side key required', icon: KeyRound },
    { label: 'Alpha Vantage', value: 'Spot/news via Vercel API', icon: Server },
    { label: 'FRED', value: 'Macro series via Vercel API', icon: Server },
    { label: 'MT5', value: 'Optional local fallback', icon: Server },
  ];

  return (
    <section className="settings-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <span>Settings</span>
            <h2>Private provider configuration</h2>
          </div>
          <Lock size={21} />
        </div>
        <div className="provider-list">
          {providerRows.map((row) => {
            const Icon = row.icon;
            return (
              <div className="provider-row" key={row.label}>
                <Icon size={18} />
                <strong>{row.label}</strong>
                <span>{row.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="panel security-panel">
        <div className="panel-heading">
          <div>
            <span>Guardrails</span>
            <h2>Signal safety model</h2>
          </div>
          <ShieldAlert size={21} />
        </div>
        <ul>
          <li>v1 provides setup scores and confidence, not direct buy/sell calls.</li>
          <li>API keys are server-side only and excluded from frontend code.</li>
          <li>Journal history is append-first; learning reports never rewrite old outcomes.</li>
          <li>AI text is coaching and analysis, not position sizing or financial advice.</li>
        </ul>
      </aside>
    </section>
  );
}
