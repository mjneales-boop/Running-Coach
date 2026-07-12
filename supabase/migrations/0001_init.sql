-- STRIDE multi-user Phase 1 schema
-- Run once in the Supabase SQL Editor (or via supabase db push).

-- ============================================================
-- Tables
-- ============================================================

create table if not exists allowed_emails (
  email text primary key,
  added_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  weight_kg numeric,
  height_cm numeric,
  sex text,                      -- 'male' | 'female' | 'other'
  experience text,               -- 'beginner' | 'intermediate' | 'advanced'
  weekly_km_current numeric,
  days_per_week int,
  injury_history text,
  recent_race_times jsonb,       -- [{distance, time}]
  include_strength boolean default false,
  race_name text,                -- null => general fitness mode
  race_date date,
  goal_time text,
  race_time text,                -- start time 'HH:MM' (feeds days-to-race countdown)
  race_location text,            -- 'Start → Finish'
  goal_pace text,                -- curated pace string, e.g. '5:41'
  baseline_hrv numeric,
  baseline_rhr numeric,
  baseline_sleep numeric,
  max_hr numeric,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mode text not null,            -- 'race' | 'general'
  weeks jsonb not null,          -- Week[] (src/types)
  zones jsonb not null,          -- Zone[]
  phases jsonb not null default '[]', -- PhaseInfo[]
  generated_at timestamptz default now(),
  active boolean default true
);
create unique index if not exists plans_one_active_per_user on plans (user_id) where active;

create table if not exists completions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,             -- `${weekId}-${dayAbbr}`
  entry jsonb not null,          -- CompletionEntry + weekId/day/updatedAt
  updated_at bigint not null default 0, -- epoch ms, last-write-wins
  primary key (user_id, key)
);

create table if not exists readiness_entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  entry jsonb not null,          -- ReadinessEntry
  primary key (user_id, date)
);

create table if not exists strava_activities (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id text not null,
  data jsonb not null,           -- StravaActivity
  primary key (user_id, activity_id)
);

create table if not exists strength_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,            -- 'YYYY-MM-DD'
  entry jsonb not null,          -- WorkoutLog (+ updatedAt)
  updated_at bigint not null default 0,
  primary key (user_id, date)
);

-- Generic per-user LWW blobs: swaps, gymOverrides, exercise-overrides,
-- settings, coach-messages, strava-lastrun, app-settings
create table if not exists user_blobs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  resource text not null,
  value jsonb not null,
  updated_at bigint not null default 0,
  primary key (user_id, resource)
);

-- Server-only in every phase; populated in Phase 4
create table if not exists oauth_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,        -- 'strava' | 'oura'
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,    -- Unix seconds, both providers
  primary key (user_id, provider)
);

-- Populated in Phase 4 (chat persistence)
create table if not exists coach_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null,            -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row-level security
-- ============================================================

alter table profiles enable row level security;
create policy profiles_own on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

alter table plans enable row level security;
create policy plans_own on plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table completions enable row level security;
create policy completions_own on completions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table readiness_entries enable row level security;
create policy readiness_own on readiness_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table strava_activities enable row level security;
create policy strava_own on strava_activities for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table strength_logs enable row level security;
create policy strength_own on strength_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table user_blobs enable row level security;
create policy blobs_own on user_blobs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table coach_messages enable row level security;
create policy coach_messages_own on coach_messages for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No policies: client can never read/write tokens; server uses service role.
alter table oauth_connections enable row level security;

alter table allowed_emails enable row level security;
create policy allowlist_admin on allowed_emails for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- ============================================================
-- Signup allowlist enforcement (server-side, not just UI)
-- ============================================================

create or replace function public.enforce_allowlist()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'signup_not_allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_allowlist_on_signup on auth.users;
create trigger enforce_allowlist_on_signup
  before insert on auth.users
  for each row execute function public.enforce_allowlist();

-- Auto-create a profile row for each new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_on_signup on auth.users;
create trigger create_profile_on_signup
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Friendly pre-check for the signup UI (trigger errors surface as generic
-- "Database error saving new user", so the client checks first).
create or replace function public.is_email_allowed(check_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from allowed_emails where lower(email) = lower(check_email));
$$;

grant execute on function public.is_email_allowed(text) to anon, authenticated;
