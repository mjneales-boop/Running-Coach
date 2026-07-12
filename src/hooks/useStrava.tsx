import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import storage from '../lib/storage';
import { STORAGE_UPDATED_EVENT } from './useStorage';
import { useCompletion } from './useCompletion';
import { usePlanConfig } from './usePlanConfig';
import { getCurrentUserId } from './useAuth';
import { formatPaceMinKm } from '../lib/format';
import type { StravaActivity } from '../types';

type StravaMap = Record<string, StravaActivity>;

interface StravaSyncResponse {
  data: StravaMap;
}

// Device-local throttle timestamp, scoped per user (legacy key left untouched).
const SYNC_TS_KEY = () => `stride:${getCurrentUserId()}:strava-synced`;

interface UseStrava {
  connected: boolean | null;
  syncing: boolean;
  lastSynced: Date | null;
  lastError: string | null;
  sync: (days?: number) => Promise<StravaMap>;
  connect: () => void;
  disconnect: () => Promise<void>;
}

const StravaContext = createContext<UseStrava | null>(null);

// Single instance lives in StravaProvider (mounted once at the app root, nested inside
// CompletionProvider since autoComplete() writes into completion state) so every screen
// reads the same connection/sync state — see useOura.tsx for why this matters (Daily was
// previously the only screen that kept a sync effect alive).
export function StravaProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    try {
      const ts = localStorage.getItem(SYNC_TS_KEY());
      return ts ? new Date(Number(ts)) : null;
    } catch { return null; }
  });
  const [lastError, setLastError] = useState<string | null>(null);
  const { setActual } = useCompletion();
  const { weeks } = usePlanConfig();

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
      for (const week of weeks) {
        for (const day of week.days) {
          if (day.type === 'REST') continue;
          const activity = activities[day.date];
          if (!activity) continue;
          await setActual(week.id, day.d, {
            done: true,
            actualKm: activity.distanceKm,
            actualPace: formatPaceMinKm(activity.avgPaceMinKm),
            ...(activity.avgHR != null && { actualHR: activity.avgHR }),
          });
        }
      }
    },
    [setActual, weeks],
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
        try { localStorage.setItem(SYNC_TS_KEY(), String(now.getTime())); } catch {}
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
    await fetch('/api/strava/status', { method: 'POST' });
    setConnected(false);
    setLastSynced(null);
  }, []);

  const value: UseStrava = { connected, syncing, lastSynced, lastError, sync, connect, disconnect };
  return <StravaContext.Provider value={value}>{children}</StravaContext.Provider>;
}

export function useStrava(): UseStrava {
  const ctx = useContext(StravaContext);
  if (!ctx) throw new Error('useStrava must be used within a StravaProvider');
  return ctx;
}
