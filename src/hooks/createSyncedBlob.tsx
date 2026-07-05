import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

interface SyncedBlob<T> {
  value: T;
  update: (updater: (prev: T) => T) => void;
}

/**
 * Small JSON blobs (day swaps, gym-day overrides, ...) used to live in localStorage
 * only, so a change made on one device never appeared on another. This gives each
 * one a Redis-backed store (same last-write-wins merge as useCompletion) behind a
 * single shared context, so every component reading it sees the same value —
 * mirrors the fix applied to useCompletion for the same reason.
 */
export function createSyncedBlob<T>(resource: string, initial: T) {
  const KEY = `marathon-${resource}`;
  const TS_KEY = `${KEY}-ts`;
  const REMOTE_URL = `/api/completion?resource=${resource}`;

  function readLocal(): T {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  }
  function writeLocal(v: T) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ }
  }
  function readLocalTs(): number {
    try { return Number(localStorage.getItem(TS_KEY) ?? 0); } catch { return 0; }
  }
  function writeLocalTs(ts: number) {
    try { localStorage.setItem(TS_KEY, String(ts)); } catch { /* storage unavailable */ }
  }

  async function pushRemote(value: T, updatedAt: number) {
    try {
      await fetch(REMOTE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, updatedAt }),
      });
    } catch { /* best-effort — local write already applied */ }
  }

  async function fetchRemote(): Promise<{ value: T; updatedAt: number } | null> {
    try {
      const r = await fetch(REMOTE_URL);
      if (!r.ok) return null;
      const data = (await r.json()) as { value: T | null; updatedAt: number };
      if (data.value == null) return null;
      return { value: data.value, updatedAt: data.updatedAt ?? 0 };
    } catch { return null; }
  }

  const Ctx = createContext<SyncedBlob<T> | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [value, setValue] = useState<T>(readLocal);
    const synced = useRef(false);

    useEffect(() => {
      if (synced.current) return;
      synced.current = true;
      void fetchRemote().then((remote) => {
        if (!remote) {
          // Nothing in Redis yet — if this device already has local data (from
          // before cross-device sync existed), seed the remote store with it so
          // other devices pick it up instead of staying stuck out of sync forever.
          const local = readLocal();
          if (local !== initial && JSON.stringify(local) !== JSON.stringify(initial)) {
            const ts = readLocalTs() || Date.now();
            writeLocalTs(ts);
            void pushRemote(local, ts);
          }
          return;
        }
        if (remote.updatedAt > readLocalTs()) {
          writeLocal(remote.value);
          writeLocalTs(remote.updatedAt);
          setValue(remote.value);
        }
      });
    }, []);

    const update = useCallback((updater: (prev: T) => T) => {
      setValue((prev) => {
        const next = updater(prev);
        const ts = Date.now();
        writeLocal(next);
        writeLocalTs(ts);
        void pushRemote(next, ts);
        return next;
      });
    }, []);

    return <Ctx.Provider value={{ value, update }}>{children}</Ctx.Provider>;
  }

  function useSyncedBlob(): SyncedBlob<T> {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error(`useSyncedBlob(${resource}) must be used within its Provider`);
    return ctx;
  }

  return { Provider, useSyncedBlob };
}
