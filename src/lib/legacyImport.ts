// One-time import of the pre-multi-user localStorage data (owner's device)
// into Supabase. Only the keys that never had a server-side home are imported
// here — completion/strength/swaps/gymOverrides come from Redis via
// scripts/seed-owner.ts. Legacy keys are read, NEVER deleted: they stay on the
// device as a fallback until Phase 1 is verified.

import * as db from './db';
import { getCurrentUserId } from '../hooks/useAuth';
import type { ReadinessEntry, StravaActivity } from '../types';

const FLAG = () => `stride:${getCurrentUserId()}:legacy-imported`;

const LEGACY_KEYS = [
  'marathon-readiness',
  'marathon-strava',
  'marathon-strava-lastrun',
  'marathon-exercise-overrides',
  'stride-settings',
  'stride-coach-messages',
] as const;

function readLegacy<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function legacyImportPending(): boolean {
  try {
    if (localStorage.getItem(FLAG())) return false;
    return LEGACY_KEYS.some((k) => localStorage.getItem(k) != null);
  } catch {
    return false;
  }
}

export interface LegacyImportResult {
  readiness: number;
  stravaActivities: number;
  blobs: string[];
}

/** Imports legacy local-only data. Skips any domain that already has remote
 *  data (never clobbers), then sets the per-user imported flag. */
export async function runLegacyImport(): Promise<LegacyImportResult> {
  const result: LegacyImportResult = { readiness: 0, stravaActivities: 0, blobs: [] };

  // The legacy `marathon-*` keys are the OWNER's personal history, living in this
  // device's browser storage. Only import them into the owner's own account —
  // never into some other account that happens to log in on the owner's device
  // (otherwise every test/guest account inherits the owner's runs & readiness).
  const profile = await db.fetchProfile();
  if (!profile?.is_admin) {
    try { localStorage.setItem(FLAG(), new Date().toISOString()); } catch { /* retry-safe */ }
    return result;
  }

  const readiness = readLegacy<Record<string, ReadinessEntry>>('marathon-readiness');
  if (readiness && Object.keys(readiness).length) {
    const remote = await db.fetchReadinessMap();
    if (Object.keys(remote).length === 0) {
      const rows = Object.entries(readiness).map(([date, entry]) => ({ date, entry }));
      await db.upsertReadinessRows(rows);
      result.readiness = rows.length;
    }
  }

  const strava = readLegacy<Record<string, StravaActivity>>('marathon-strava');
  if (strava && Object.keys(strava).length) {
    const remote = await db.fetchStravaMap();
    if (Object.keys(remote).length === 0) {
      const activities = Object.values(strava);
      await db.upsertStravaRows(activities);
      result.stravaActivities = activities.length;
    }
  }

  const blobImports: [legacyKey: string, resource: string][] = [
    ['marathon-strava-lastrun', 'strava-lastrun'],
    ['marathon-exercise-overrides', 'exercise-overrides'],
    ['stride-settings', 'settings'],
    ['stride-coach-messages', 'coach-messages'],
  ];
  for (const [legacyKey, resource] of blobImports) {
    const value = readLegacy<unknown>(legacyKey);
    if (value == null) continue;
    const remote = await db.getBlob(resource);
    if (remote != null) continue;
    await db.setBlob(resource, value, Date.now());
    result.blobs.push(resource);
  }

  try {
    localStorage.setItem(FLAG(), new Date().toISOString());
  } catch { /* flag write failed — worst case the no-clobber checks re-skip */ }
  return result;
}
