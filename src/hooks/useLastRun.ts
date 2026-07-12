import { useState, useEffect, useCallback } from 'react';
import storage from '../lib/storage';
import { STORAGE_UPDATED_EVENT } from './useStorage';
import { getCurrentUserId } from './useAuth';
import type { StravaRunDetail } from '../types';

const CACHE_KEY = 'marathon-strava-lastrun';
// Device-local throttle timestamp, scoped per user (legacy key left untouched).
const SYNC_TS_KEY = () => `stride:${getCurrentUserId()}:strava-lastrun-synced`;
const THROTTLE_MS = 15 * 60 * 1000;

interface LastRunResponse {
  data: StravaRunDetail | null;
}

// Mirrors useStrava.ts's caching conventions (storage adapter, STORAGE_UPDATED_EVENT,
// localStorage sync-timestamp throttle) for this card's own two-call refresh.
export function useLastRun(connected: boolean | null) {
  const [run, setRun] = useState<StravaRunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    storage.get(CACHE_KEY).then((result) => {
      if (cancelled || !result?.value) return;
      try { setRun(JSON.parse(result.value) as StravaRunDetail); } catch {}
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail?.key !== CACHE_KEY) return;
      storage.get(CACHE_KEY).then((result) => {
        if (result?.value) {
          try { setRun(JSON.parse(result.value) as StravaRunDetail); } catch {}
        }
      });
    };
    window.addEventListener(STORAGE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STORAGE_UPDATED_EVENT, handler);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/strava/sync?mode=last-run');
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }

      const { data }: LastRunResponse = await res.json();
      if (data) {
        setRun(data);
        await storage.set(CACHE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent(STORAGE_UPDATED_EVENT, { detail: { key: CACHE_KEY } }));
      }
      try { localStorage.setItem(SYNC_TS_KEY(), String(Date.now())); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected !== true) return;
    let lastSync = 0;
    try { lastSync = Number(localStorage.getItem(SYNC_TS_KEY()) ?? 0); } catch {}
    if (Date.now() - lastSync > THROTTLE_MS) {
      refresh().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return { run, loading, error, refresh };
}
