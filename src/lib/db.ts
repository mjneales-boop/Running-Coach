// Typed Supabase data layer. RLS scopes every query to the signed-in user;
// user_id columns default to auth.uid() server-side, so it is never sent.

import { supabase } from './supabase';
import { getCurrentUserId } from '../hooks/useAuth';
import type {
  CompletionEntry,
  DayAbbr,
  PhaseInfo,
  ReadinessEntry,
  StravaActivity,
  Week,
  WorkoutLog,
  Zone,
} from '../types';

export type SyncedCompletion = CompletionEntry & {
  weekId: string;
  day: DayAbbr;
  updatedAt?: number;
};

export type SyncedWorkoutLog = WorkoutLog & { updatedAt?: number };

// ---------- completions (row per `${weekId}-${day}`, LWW) ----------

export async function fetchCompletions(): Promise<SyncedCompletion[]> {
  const { data, error } = await supabase.from('completions').select('entry');
  if (error) throw error;
  return (data ?? []).map((row) => row.entry as SyncedCompletion);
}

export async function upsertCompletion(entry: SyncedCompletion): Promise<void> {
  const { error } = await supabase.from('completions').upsert(
    {
      key: `${entry.weekId}-${entry.day}`,
      entry,
      updated_at: entry.updatedAt ?? Date.now(),
    },
    { onConflict: 'user_id,key' },
  );
  if (error) throw error;
}

// ---------- strength logs (row per date, LWW) ----------

export async function fetchStrength(): Promise<SyncedWorkoutLog[]> {
  const { data, error } = await supabase.from('strength_logs').select('entry');
  if (error) throw error;
  return (data ?? []).map((row) => row.entry as SyncedWorkoutLog);
}

export async function upsertStrength(log: SyncedWorkoutLog): Promise<void> {
  const { error } = await supabase.from('strength_logs').upsert(
    {
      date: log.date,
      entry: log,
      updated_at: log.updatedAt ?? Date.now(),
    },
    { onConflict: 'user_id,date' },
  );
  if (error) throw error;
}

// ---------- readiness (map ⇄ rows) ----------

export async function fetchReadinessMap(): Promise<Record<string, ReadinessEntry>> {
  const { data, error } = await supabase.from('readiness_entries').select('date, entry');
  if (error) throw error;
  const map: Record<string, ReadinessEntry> = {};
  for (const row of data ?? []) map[row.date as string] = row.entry as ReadinessEntry;
  return map;
}

export async function upsertReadinessRows(
  rows: { date: string; entry: ReadinessEntry }[],
): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase
    .from('readiness_entries')
    .upsert(rows, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ---------- strava activities (map ⇄ rows) ----------

export async function fetchStravaMap(): Promise<Record<string, StravaActivity>> {
  const { data, error } = await supabase.from('strava_activities').select('data');
  if (error) throw error;
  const map: Record<string, StravaActivity> = {};
  for (const row of data ?? []) {
    const activity = row.data as StravaActivity;
    map[activity.date] = activity;
  }
  return map;
}

export async function upsertStravaRows(activities: StravaActivity[]): Promise<void> {
  if (!activities.length) return;
  const { error } = await supabase.from('strava_activities').upsert(
    activities.map((a) => ({ activity_id: a.id, data: a })),
    { onConflict: 'user_id,activity_id' },
  );
  if (error) throw error;
}

// ---------- generic per-user blobs (LWW) ----------

export async function getBlob<T>(
  resource: string,
): Promise<{ value: T; updatedAt: number } | null> {
  const { data, error } = await supabase
    .from('user_blobs')
    .select('value, updated_at')
    .eq('resource', resource)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { value: data.value as T, updatedAt: Number(data.updated_at) };
}

export async function setBlob<T>(resource: string, value: T, updatedAt: number): Promise<void> {
  const { error } = await supabase
    .from('user_blobs')
    .upsert({ resource, value, updated_at: updatedAt }, { onConflict: 'user_id,resource' });
  if (error) throw error;
}

export async function deleteBlob(resource: string): Promise<void> {
  const { error } = await supabase.from('user_blobs').delete().eq('resource', resource);
  if (error) throw error;
}

// ---------- plan + profile (read-only in Phase 1) ----------

export interface ActivePlan {
  mode: string;
  weeks: Week[];
  zones: Zone[];
  phases: PhaseInfo[];
}

export async function fetchActivePlan(): Promise<ActivePlan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('mode, weeks, zones, phases')
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    mode: data.mode as string,
    weeks: data.weeks as Week[],
    zones: data.zones as Zone[],
    phases: (data.phases ?? []) as PhaseInfo[],
  };
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  race_name: string | null;
  race_date: string | null;
  race_time: string | null;
  race_location: string | null;
  goal_time: string | null;
  goal_pace: string | null;
  baseline_hrv: number | null;
  baseline_rhr: number | null;
  baseline_sleep: number | null;
  max_hr: number | null;
  injury_history: string | null;
  include_strength: boolean | null;
  is_admin: boolean;
}

export async function fetchProfile(): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, race_name, race_date, race_time, race_location, goal_time, goal_pace, baseline_hrv, baseline_rhr, baseline_sleep, max_hr, injury_history, include_strength, is_admin',
    )
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

export interface ProfilePatch {
  display_name?: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  sex?: string | null;
  experience?: string | null;
  weekly_km_current?: number | null;
  days_per_week?: number | null;
  injury_history?: string | null;
  recent_race_times?: { distance: string; time: string }[] | null;
  include_strength?: boolean;
  race_name?: string | null;
  race_date?: string | null;
  race_time?: string | null;
  race_location?: string | null;
  goal_time?: string | null;
  goal_pace?: string | null;
}

// ---------- signup allowlist (admin only — RLS `allowlist_admin`) ----------

export interface AllowedEmail {
  email: string;
  added_at: string | null;
}

export async function fetchAllowlist(): Promise<AllowedEmail[]> {
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('email, added_at')
    .order('added_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AllowedEmail[];
}

export async function addAllowedEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from('allowed_emails')
    .upsert({ email: email.trim().toLowerCase() }, { onConflict: 'email' });
  if (error) throw error;
}

export async function removeAllowedEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from('allowed_emails')
    .delete()
    .eq('email', email.trim().toLowerCase());
  if (error) throw error;
}

export async function updateProfile(patch: ProfilePatch): Promise<void> {
  // Explicit WHERE: the project rejects unfiltered UPDATEs (RLS scoping alone
  // is not enough — Postgres error 21000).
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', getCurrentUserId())
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('profile update matched no row');
}
