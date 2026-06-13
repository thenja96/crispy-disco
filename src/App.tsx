import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarClock,
  Gauge,
  Landmark,
  Newspaper,
  Plus,
  Radar,
  Settings,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { ChartPanel } from './components/ChartPanel';
import { Dashboard } from './components/Dashboard';
import { Journal } from './components/Journal';
import { NewsDesk } from './components/NewsDesk';
import { Review } from './components/Review';
import { SettingsView } from './components/SettingsView';
import { calculateReaction } from './lib/reactionEngine';
import { scoreCurrentSetup } from './lib/setupScoring';
import { coachingInsights, journalEntries, marketEvents, priceZones, reactions } from './data/mockData';
import { useMarketData } from './hooks/useMarketData';
import { configuredMarketSymbol } from './services/marketData';
import type { JournalEntry, Timeframe } from './types';

type View = 'Dashboard' | 'Levels' | 'News' | 'Headline Shocks' | 'Journal' | 'Review' | 'Settings';

const navItems: Array<{ view: View; icon: typeof Gauge }> = [
  { view: 'Dashboard', icon: Gauge },
  { view: 'Levels', icon: Landmark },
  { view: 'News', icon: Newspaper },
  { view: 'Headline Shocks', icon: Radar },
  { view: 'Journal', icon: BookOpen },
  { view: 'Review', icon: Brain },
  { view: 'Settings', icon: Settings },
];

export function App() {
  const [activeView, setActiveView] = useState<View>('Dashboard');
  const [timeframe, setTimeframe] = useState<Timeframe>('M15');
  const [entries, setEntries] = useState<JournalEntry[]>(journalEntries);
  const [selectedTradeId, setSelectedTradeId] = useState(journalEntries[0].id);
  const marketData = useMarketData(timeframe);
  const activeCandles = marketData.candles;
  const symbol = configuredMarketSymbol();

  const calculatedReactions = useMemo(
    () => [
      ...reactions,
      ...marketEvents
        .filter((event) => !reactions.some((reaction) => reaction.eventId === event.id))
        .map((event) => calculateReaction(event, activeCandles, priceZones)),
    ],
    [activeCandles],
  );
  const setupScore = useMemo(() => scoreCurrentSetup(activeCandles, priceZones, marketEvents, entries), [activeCandles, entries]);
  const selectedTrade = entries.find((entry) => entry.id === selectedTradeId) ?? entries[0];
  const latestPrice = marketData.quote?.price ?? activeCandles[activeCandles.length - 1].close;

  function addTrade(entry: JournalEntry) {
    setEntries((current) => [entry, ...current]);
    setSelectedTradeId(entry.id);
    setActiveView('Journal');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">X</div>
          <div>
            <strong>XAUUSD Command</strong>
            <span>Private Journal</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeView === item.view ? 'active' : ''}`}
                key={item.view}
                onClick={() => setActiveView(item.view)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.view}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-status">
          <ShieldCheck size={17} />
          <span>No buy/sell advice</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{activeView === 'Dashboard' ? 'Live Gold Dashboard' : activeView}</h1>
            <p>Support/resistance map, news reaction, journal learning, and coaching mode.</p>
          </div>
          <div className="topbar-actions">
            <div className="price-tile">
              <span>{symbol}</span>
              <strong>{latestPrice.toFixed(2)}</strong>
            </div>
            <div className={`data-status ${marketData.status}`}>
              <span>
                {marketData.source === 'online-api'
                  ? 'Online API'
                  : marketData.source === 'mt5-live'
                    ? 'MT5 Live'
                    : 'Sample Data'}
              </span>
              <b>{timeframe}</b>
            </div>
            <button className="icon-button" type="button" aria-label="Alerts">
              <Bell size={19} />
            </button>
            <button className="primary-button" type="button" onClick={() => setActiveView('Journal')}>
              <Plus size={17} />
              Journal Quick Add
            </button>
          </div>
        </header>

        {activeView === 'Dashboard' && (
          <Dashboard
            candles={activeCandles}
            events={marketEvents}
            zones={priceZones}
            reactions={calculatedReactions}
            setupScore={setupScore}
            marketMessage={marketData.message}
            macro={marketData.macro}
            onlineNews={marketData.news}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        )}

        {activeView === 'Levels' && (
          <section className="page-grid two-column">
            <ChartPanel
              candles={activeCandles}
              events={marketEvents}
              timeframe={timeframe}
              zones={priceZones}
              onTimeframeChange={setTimeframe}
            />
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <span>Support / Resistance Map</span>
                  <h2>Manual and auto confluence</h2>
                </div>
                <BarChart3 size={20} />
              </div>
              <div className="zone-list">
                {priceZones.map((zone) => (
                  <article className="zone-card" key={zone.id}>
                    <div>
                      <strong>{zone.label}</strong>
                      <span>{zone.reason}</span>
                    </div>
                    <b>{zone.strength}%</b>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {(activeView === 'News' || activeView === 'Headline Shocks') && (
          <NewsDesk
            events={marketEvents.filter((event) => activeView === 'News' ? event.type === 'scheduled' : event.type === 'headline')}
            reactions={calculatedReactions}
          />
        )}

        {activeView === 'Journal' && (
          <Journal
            entries={entries}
            selectedTrade={selectedTrade}
            onAddTrade={addTrade}
            onSelectTrade={setSelectedTradeId}
          />
        )}

        {activeView === 'Review' && (
          <Review entries={entries} insights={coachingInsights} setupScore={setupScore} />
        )}

        {activeView === 'Settings' && <SettingsView />}
      </main>

      <div className="mobile-tabbar" aria-label="Mobile navigation">
        {[
          { view: 'Dashboard' as const, icon: Activity },
          { view: 'News' as const, icon: CalendarClock },
          { view: 'Journal' as const, icon: Upload },
          { view: 'Review' as const, icon: Brain },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activeView === item.view ? 'active' : ''}
              key={item.view}
              onClick={() => setActiveView(item.view)}
              type="button"
            >
              <Icon size={19} />
              <span>{item.view}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
