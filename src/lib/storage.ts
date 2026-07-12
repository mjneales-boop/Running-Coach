// Storage adapter: same async string get/set/delete interface the hooks have
// always used, now backed by Supabase per-user tables with a localStorage
// cache for optimistic writes and offline reads.
//
// Cache keys are namespaced `stride:{userId}:{key}` so accounts never bleed
// into each other on a shared device, and the legacy unscoped keys
// (`marathon-*`, `stride-*`) are left untouched as the owner's fallback.
//
// Two cache entries per key:
//   stride:{uid}:{key}          — latest local value (optimistic, offline reads)
//   stride:{uid}:{key}:synced   — last value confirmed against Supabase; the
//                                 map-shaped routes diff against this so a
//                                 failed push is retried on the next write.

import * as db from './db';
import { getCurrentUserId } from '../hooks/useAuth';
import type { ReadinessEntry, StravaActivity } from '../types';

interface StorageAPI {
  get(key: string): Promise<{ key: string; value: string; shared: boolean } | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const cacheKey = (key: string) => `stride:${getCurrentUserId()}:${key}`;
const syncedKey = (key: string) => `${cacheKey(key)}:synced`;

function read(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function write(k: string, value: string): void {
  try {
    localStorage.setItem(k, value);
  } catch {
    /* quota/private mode — remote is still authoritative */
  }
}

function parseMap<T>(raw: string | null): Record<string, T> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, T>;
  } catch {
    return {};
  }
}

interface Route {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  delete(): Promise<void>;
}

/** Map-shaped keys backed by dedicated tables: only entries changed since the
 *  last confirmed sync are upserted. */
function mapRoute<T>(
  key: string,
  fetchMap: () => Promise<Record<string, T>>,
  upsert: (changed: [string, T][]) => Promise<void>,
): Route {
  return {
    get: async () => {
      const map = await fetchMap();
      return Object.keys(map).length ? JSON.stringify(map) : null;
    },
    set: async (value) => {
      const next = parseMap<T>(value);
      const synced = parseMap<T>(read(syncedKey(key)));
      const changed = Object.entries(next).filter(
        ([k, entry]) => JSON.stringify(synced[k]) !== JSON.stringify(entry),
      );
      if (changed.length) await upsert(changed);
    },
    delete: async () => {
      /* never bulk-delete history tables */
    },
  };
}

const tableRoutes: Record<string, Route> = {
  'marathon-readiness': mapRoute<ReadinessEntry>(
    'marathon-readiness',
    db.fetchReadinessMap,
    (changed) => db.upsertReadinessRows(changed.map(([date, entry]) => ({ date, entry }))),
  ),
  'marathon-strava': mapRoute<StravaActivity>(
    'marathon-strava',
    db.fetchStravaMap,
    (changed) => db.upsertStravaRows(changed.map(([, activity]) => activity)),
  ),
};

/** Everything else lands in user_blobs under a stable resource name. */
const blobAlias: Record<string, string> = {
  'stride-settings': 'settings',
  'stride-coach-messages': 'coach-messages',
  'marathon-strava-lastrun': 'strava-lastrun',
  'marathon-settings': 'app-settings',
};

function blobRoute(key: string): Route {
  const resource = blobAlias[key] ?? key;
  return {
    get: async () => {
      const blob = await db.getBlob<unknown>(resource);
      return blob == null ? null : JSON.stringify(blob.value);
    },
    set: async (value) => {
      await db.setBlob(resource, JSON.parse(value), Date.now());
    },
    delete: async () => {
      await db.deleteBlob(resource);
    },
  };
}

const route = (key: string): Route => tableRoutes[key] ?? blobRoute(key);

const storage: StorageAPI = {
  async get(key) {
    try {
      const value = await route(key).get();
      if (value == null) {
        // No remote data — fall through to any cached value (e.g. written offline).
        const cached = read(cacheKey(key));
        return cached == null ? null : { key, value: cached, shared: false };
      }
      write(cacheKey(key), value);
      write(syncedKey(key), value);
      return { key, value, shared: false };
    } catch {
      const cached = read(cacheKey(key));
      return cached == null ? null : { key, value: cached, shared: false };
    }
  },
  async set(key, value) {
    write(cacheKey(key), value); // optimistic + offline-safe
    try {
      await route(key).set(value);
      write(syncedKey(key), value);
    } catch {
      // Push failed (offline): cache keeps the value for the UI; the synced
      // snapshot is untouched, so the next set() re-diffs and retries.
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(cacheKey(key));
      localStorage.removeItem(syncedKey(key));
    } catch { /* ignore */ }
    try {
      await route(key).delete();
    } catch { /* offline — remote row survives; harmless for our keys */ }
  },
};

export default storage;
