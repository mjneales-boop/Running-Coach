import { useState, useEffect, useCallback } from 'react';
import storage from '../lib/storage';
import { STORAGE_UPDATED_EVENT } from './useStorage';
import { useCompletion } from './useCompletion';
import { WEEKS } from '../constants/plan';
import type { StravaActivity } from '../types';

type StravaMap = Record<string, StravaActivity>;

interface StravaSyncResponse {
  data: StravaMap;
}

const SYNC_TS_KEY = 'marathon-strava-synced';

function formatPace(avgPaceMinKm: number): string {
  const totalSec = Math.round(avgPaceMinKm * 60);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

export function useStrava() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    try {
      const ts = localStorage.getItem(SYNC_TS_KEY);
      return ts ? new Date(Number(ts)) : null;
    } catch { return null; }
  });
  const [lastError, setLastError] = useState<string | null>(null);
  const { setActual } = useCompletion();

  useEffect(() => {
    fetch('/api/strava/status')
      .then((r) => r.json())
      .then(({ connected: c }: { connected: boolean }) => setConnected(c))
      .catch(() => setConnected(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get('strava_connected') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      setConnected(true);
    }
    if (params.get('strava_error')) {
      setLastError(decodeURIComponent(params.get('strava_error')!));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const autoComplete = useCallback(
    async (activities: StravaMap) => {
      for (const week of WEEKS) {
        for (const day of week.days) {
          if (day.type === 'REST') continue;
          const activity = activities[day.date];
          if (!activity) continue;
          await setActual(week.id, day.d, {
            done: true,
            actualKm: activity.distanceKm,
            actualPace: formatPace(activity.avgPaceMinKm),
            ...(activity.avgHR != null && { actualHR: activity.avgHR }),
          });
        }
      }
    },
    [setActual],
  );

  const sync = useCallback(
    async (days = 30): Promise<StravaMap> => {
      setSyncing(true);
      setLastError(null);

      try {
        const res = await fetch(`/api/strava/sync?days=${days}`);
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const errJson = await res.json() as { error?: string };
            if (errJson.error) msg = errJson.error;
          } catch {}
          throw new Error(msg);
        }

        const { data }: StravaSyncResponse = await res.json();

        // Merge with any existing cached activities
        let existing: StravaMap = {};
        const cur = await storage.get('marathon-strava');
        if (cur?.value) {
          try { existing = JSON.parse(cur.value) as StravaMap; } catch {}
        }

        const merged: StravaMap = { ...existing, ...data };
        await storage.set('marathon-strava', JSON.stringify(merged));

        window.dispatchEvent(
          new CustomEvent(STORAGE_UPDATED_EVENT, { detail: { key: 'marathon-strava' } }),
        );

        await autoComplete(merged);

        const now = new Date();
        setLastSynced(now);
        try { localStorage.setItem(SYNC_TS_KEY, String(now.getTime())); } catch {}
        return merged;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        throw e;
      } finally {
        setSyncing(false);
      }
    },
    [autoComplete],
  );

  const connect = useCallback(() => {
    window.location.href = '/api/strava/authorize';
  }, []);

  const disconnect = useCallback(async () => {
    await fetch('/api/strava/disconnect', { method: 'POST' });
    setConnected(false);
    setLastSynced(null);
  }, []);

  return { connected, syncing, lastSynced, lastError, sync, connect, disconnect };
}
