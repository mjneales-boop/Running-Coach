import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import storage from '../lib/storage';
import { STORAGE_UPDATED_EVENT } from './useStorage';
import { authFetch } from '../lib/authFetch';
import type { ReadinessEntry } from '../types';

type ReadinessMap = Record<string, ReadinessEntry>;

interface OuraSyncResponse {
  data: ReadinessMap;
  range: { start: string; end: string };
}

interface UseOura {
  connected: boolean | null;
  syncing: boolean;
  lastSynced: Date | null;
  lastError: string | null;
  sync: (days?: number) => Promise<ReadinessMap>;
  connect: () => void;
  disconnect: () => Promise<void>;
}

const OuraContext = createContext<UseOura | null>(null);

// Single instance lives in OuraProvider (mounted once at the app root) so every screen
// reads the same connection/sync state — otherwise each screen's own useOura() call held
// an independent instance that only synced while that screen was mounted, so navigating
// away from Daily (which owned the only sync trigger) meant Coach never saw a fresh
// readiness score for the rest of the session.
export function OuraProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Check connection status on mount
    authFetch('/api/oura/status')
      .then((r) => r.json())
      .then(({ connected: c }: { connected: boolean }) => setConnected(c))
      .catch(() => setConnected(false));

    // Handle return from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('oura_connected') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      setConnected(true);
    }
    if (params.get('oura_error')) {
      setLastError(decodeURIComponent(params.get('oura_error')!));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const sync = useCallback(async (days = 30): Promise<ReadinessMap> => {
    setSyncing(true);
    setLastError(null);

    try {
      const res = await authFetch(`/api/oura/sync?days=${days}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const { data }: OuraSyncResponse = await res.json();

      // Merge Oura data on top of any manually-logged entries
      let existing: ReadinessMap = {};
      const cur = await storage.get('marathon-readiness');
      if (cur?.value) {
        try { existing = JSON.parse(cur.value) as ReadinessMap; } catch {}
      }

      const merged: ReadinessMap = { ...existing };
      for (const [day, vals] of Object.entries(data)) {
        merged[day] = { ...(existing[day] ?? {}), ...vals };
      }

      await storage.set('marathon-readiness', JSON.stringify(merged));

      // Notify useStorage('marathon-readiness') instances to re-read
      window.dispatchEvent(
        new CustomEvent(STORAGE_UPDATED_EVENT, { detail: { key: 'marathon-readiness' } }),
      );

      setLastSynced(new Date());
      return merged;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      throw e;
    } finally {
      setSyncing(false);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      const res = await authFetch('/api/oura/authorize');
      const { url } = (await res.json()) as { url?: string };
      if (url) window.location.href = url;
      else setLastError('Could not start Oura connection');
    } catch {
      setLastError('Could not start Oura connection');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await authFetch('/api/oura/disconnect', { method: 'POST' });
    setConnected(false);
    setLastSynced(null);
  }, []);

  const value: UseOura = { connected, syncing, lastSynced, lastError, sync, connect, disconnect };
  return <OuraContext.Provider value={value}>{children}</OuraContext.Provider>;
}

export function useOura(): UseOura {
  const ctx = useContext(OuraContext);
  if (!ctx) throw new Error('useOura must be used within an OuraProvider');
  return ctx;
}
