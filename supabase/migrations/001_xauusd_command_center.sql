create extension if not exists pgcrypto;

create table public.trading_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  base_symbol text not null default 'XAUUSD',
  created_at timestamptz not null default now()
);

create table public.support_resistance_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('manual', 'auto')),
  top_price numeric(12, 3) not null,
  bottom_price numeric(12, 3) not null,
  strength integer not null check (strength between 0 and 100),
  reason text not null,
  timeframe text not null check (timeframe in ('M5', 'M15', 'H1', 'H4')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.market_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('scheduled', 'headline')),
  title text not null,
  source text not null,
  occurred_at timestamptz not null,
  impact text not null check (impact in ('high', 'medium', 'low')),
  theme text not null,
  quote text,
  summary text not null,
  created_at timestamptz not null default now()
);

create table public.reaction_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.market_events (id) on delete cascade,
  pre_15 numeric(12, 3) not null,
  plus_5 numeric(12, 3) not null,
  plus_15 numeric(12, 3) not null,
  plus_60 numeric(12, 3) not null,
  direction text not null check (direction in ('bullish', 'bearish', 'neutral')),
  volatility text not null check (volatility in ('compressed', 'normal', 'expanded')),
  sr_reaction text not null,
  created_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trade_date date not null,
  setup_type text not null,
  session text not null,
  timeframe text not null check (timeframe in ('M5', 'M15', 'H1', 'H4')),
  entry_price numeric(12, 3) not null,
  stop_price numeric(12, 3) not null,
  target_price numeric(12, 3) not null,
  r_multiple numeric(8, 2) not null,
  outcome text not null check (outcome in ('win', 'loss', 'breakeven')),
  zone_label text not null,
  news_context text not null,
  screenshot_path text,
  mistake_tags text[] not null default '{}',
  emotion_tags text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setup_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  scored_at timestamptz not null default now(),
  bias text not null check (bias in ('bullish', 'bearish', 'neutral')),
  score integer not null check (score between 0 and 100),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  checklist jsonb not null
);

create table public.coaching_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  review_period text not null check (review_period in ('daily', 'weekly')),
  period_start date not null,
  period_end date not null,
  model_provider text not null check (model_provider in ('groq', 'openrouter')),
  summary text not null,
  recommendations jsonb not null,
  created_at timestamptz not null default now()
);

create index support_resistance_zones_user_active_idx on public.support_resistance_zones (user_id, active, timeframe);
create index market_events_user_time_idx on public.market_events (user_id, occurred_at desc);
create index market_events_user_type_time_idx on public.market_events (user_id, event_type, occurred_at desc);
create index reaction_windows_user_event_idx on public.reaction_windows (user_id, event_id);
create index journal_entries_user_date_idx on public.journal_entries (user_id, trade_date desc);
create index journal_entries_user_setup_idx on public.journal_entries (user_id, setup_type);
create index setup_scores_user_time_idx on public.setup_scores (user_id, scored_at desc);
create index coaching_reviews_user_period_idx on public.coaching_reviews (user_id, review_period, period_end desc);

alter table public.trading_profiles enable row level security;
alter table public.support_resistance_zones enable row level security;
alter table public.market_events enable row level security;
alter table public.reaction_windows enable row level security;
alter table public.journal_entries enable row level security;
alter table public.setup_scores enable row level security;
alter table public.coaching_reviews enable row level security;

create policy trading_profiles_owner_select on public.trading_profiles
  for select using ((select auth.uid()) = id);
create policy trading_profiles_owner_insert on public.trading_profiles
  for insert with check ((select auth.uid()) = id);
create policy trading_profiles_owner_update on public.trading_profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy support_resistance_zones_owner_all on public.support_resistance_zones
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy market_events_owner_all on public.market_events
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reaction_windows_owner_all on public.reaction_windows
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy journal_entries_owner_all on public.journal_entries
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy setup_scores_owner_all on public.setup_scores
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy coaching_reviews_owner_all on public.coaching_reviews
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
