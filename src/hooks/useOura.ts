import { useState, useEffect, useCallback } from 'react';
import storage from '../lib/storage';
import { STORAGE_UPDATED_EVENT } from './useStorage';
import type { ReadinessEntry } from '../types';

type ReadinessMap = Record<string, ReadinessEntry>;

interface OuraSyncResponse {
  data: ReadinessMap;
  range: { start: string; end: string };
}

export function useOura() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Check connection status on mount
    fetch('/api/oura/status')
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
      const res = await fetch(`/api/oura/sync?days=${days}`);
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

  const connect = useCallback(() => {
    window.location.href = '/api/oura/authorize';
  }, []);

  const disconnect = useCallback(async () => {
    await fetch('/api/oura/disconnect', { method: 'POST' });
    setConnected(false);
    setLastSynced(null);
  }, []);

  return { connected, syncing, lastSynced, lastError, sync, connect, disconnect };
}
