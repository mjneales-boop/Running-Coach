import { useState, useEffect, useCallback, useRef } from 'react';
import storage from '../lib/storage';
import { STORAGE_UPDATED_EVENT } from './useStorage';
import { authFetch } from '../lib/authFetch';
import { getCurrentUserId } from './useAuth';
import type { StravaActivity, StravaSplit } from '../types';

const CACHE_KEY = 'marathon-strava-splits';
/** Device-local backoff stamp, scoped per user. Only set when Strava pushes back. */
const COOLDOWN_KEY = () => `stride:${getCurrentUserId()}:strava-splits-cooldown`;
const COOLDOWN_MS = 15 * 60 * 1000;
/** Must not exceed the endpoint's own BATCH_CAP. */
const BATCH = 20;

/**
 * `null` splits mean "asked Strava, it has none for this run" — a manual entry, a
 * treadmill log, anything without per-km data. Cached as a tombstone so the backfill
 * doesn't spend a request re-asking on every sync.
 */
export type SplitsCache = Record<string, StravaSplit[] | null>;

function readCooldown(): number {
  try { return Number(localStorage.getItem(COOLDOWN_KEY()) ?? 0); } catch { return 0; }
}
function writeCooldown(until: number) {
  try { localStorage.setItem(COOLDOWN_KEY(), String(until)); } catch { /* private mode */ }
}

/**
 * Per-km splits for every synced run, backfilled a batch at a time.
 *
 * Strava has no bulk detail endpoint, so a full history costs one request per run
 * against a 100-per-15-min budget. We fetch only the ids we've never seen, newest
 * first (recent weeks are what the charts lead with), and cache permanently — a
 * finished run's splits never change.
 *
 * Batches chain: each successful write re-runs the effect and pulls the next 20, so a
 * ~90-day history converges in a couple of minutes rather than over hours. The only
 * thing that stops the chain is running out of gaps, or Strava returning 429 — which
 * parks the backfill behind a 15-minute cooldown instead of retrying in a tight loop.
 */
export function useRunSplits(activities: StravaActivity[], connected: boolean | null) {
  const [splits, setSplits] = useState<SplitsCache>({});
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    storage.get(CACHE_KEY).then((result) => {
      if (cancelled) return;
      if (result?.value) {
        try { setSplits(JSON.parse(result.value) as SplitsCache); } catch { /* corrupt — refetch */ }
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const backfill = useCallback(async (ids: string[], cache: SplitsCache) => {
    try {
      const res = await authFetch(`/api/strava/sync?mode=splits&ids=${ids.join(',')}`);
      if (!res.ok) {
        writeCooldown(Date.now() + COOLDOWN_MS);
        return;
      }
      const { data, missing, rateLimited } = (await res.json()) as {
        data: Record<string, StravaSplit[]>;
        missing?: string[];
        rateLimited?: boolean;
      };

      const merged: SplitsCache = { ...cache, ...data };
      // Tombstone only what Strava actually answered for. On a rate-limited batch the
      // unanswered ids stay absent so the next window retries them.
      for (const id of missing ?? []) merged[id] = null;
      if (rateLimited) writeCooldown(Date.now() + COOLDOWN_MS);

      await storage.set(CACHE_KEY, JSON.stringify(merged));
      setSplits(merged);
      window.dispatchEvent(new CustomEvent(STORAGE_UPDATED_EVENT, { detail: { key: CACHE_KEY } }));
    } catch {
      writeCooldown(Date.now() + COOLDOWN_MS);
    }
  }, []);

  useEffect(() => {
    if (connected !== true || !loaded || inFlight.current) return;
    if (Date.now() < readCooldown()) return;

    const pending = activities
      .filter((a) => a.id && !(a.id in splits))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, BATCH)
      .map((a) => a.id);
    if (!pending.length) return;

    inFlight.current = true;
    backfill(pending, splits).finally(() => { inFlight.current = false; });
  }, [connected, loaded, activities, splits, backfill]);

  return { splits };
}
