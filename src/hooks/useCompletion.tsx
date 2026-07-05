import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { CompletionEntry, DayAbbr } from '../types';

type SyncedEntry = CompletionEntry & { weekId: string; day: DayAbbr; updatedAt?: number };
type CompletionMap = Record<string, SyncedEntry>;

const KEY = 'marathon-completion';
const OUTBOX_KEY = 'marathon-completion-outbox';
const MIGRATED_KEY = 'marathon-completion-migrated';

function readLocal(): CompletionMap {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function writeLocal(data: CompletionMap) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}
function readOutbox(): SyncedEntry[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]'); } catch { return []; }
}
function writeOutbox(entries: SyncedEntry[]) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries)); } catch { /* storage unavailable */ }
}

async function pushEntry(entry: SyncedEntry): Promise<boolean> {
  try {
    const r = await fetch('/api/completion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return r.ok;
  } catch { return false; }
}

async function flushOutbox(): Promise<void> {
  const outbox = readOutbox();
  if (outbox.length === 0) return;
  const failed: SyncedEntry[] = [];
  for (const entry of outbox) {
    if (!(await pushEntry(entry))) failed.push(entry);
  }
  writeOutbox(failed);
}

async function fetchRemote(): Promise<SyncedEntry[]> {
  try {
    const r = await fetch('/api/completion');
    if (!r.ok) return [];
    const data = (await r.json()) as { entries?: SyncedEntry[] };
    return data.entries ?? [];
  } catch { return []; }
}

interface UseCompletion {
  completion: CompletionMap;
  loading: boolean;
  toggleDone: (weekId: string, day: DayAbbr) => Promise<void>;
  setNotes: (weekId: string, day: DayAbbr, notes: string) => Promise<void>;
  setActual: (weekId: string, day: DayAbbr, actual: Partial<CompletionEntry>) => Promise<void>;
}

const CompletionContext = createContext<UseCompletion | null>(null);

// Single instance lives in CompletionProvider (mounted once at the app root) so every
// screen reads and writes the same state — otherwise each screen's own useCompletion()
// call held an independent copy that only re-synced on remount, so a toggle made in one
// still-mounted screen (e.g. the Daily card) never appeared in another (e.g. the Details
// modal) until the user navigated away and back.
export function CompletionProvider({ children }: { children: ReactNode }) {
  const [completion, setCompletion] = useState<CompletionMap>(readLocal);
  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      await flushOutbox();
      const remote = await fetchRemote();
      if (remote.length === 0) return;
      const local = readLocal();
      for (const entry of remote) {
        const key = `${entry.weekId}-${entry.day}`;
        const existing = local[key];
        if (!existing || (entry.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
          local[key] = entry;
        }
      }
      writeLocal(local);
      setCompletion({ ...local });
    } finally {
      syncing.current = false;
    }
  }, []);

  // One-time migration of existing localStorage-only data (pre-cross-device-sync) into Redis
  useEffect(() => {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    const local = readLocal();
    const rows = Object.entries(local);
    localStorage.setItem(MIGRATED_KEY, '1');
    if (rows.length === 0) return;
    const now = Date.now();
    void (async () => {
      for (const [key, entry] of rows) {
        if (entry.weekId && entry.day) {
          await pushEntry({ ...entry, updatedAt: entry.updatedAt ?? now });
          continue;
        }
        // Legacy rows saved before weekId/day were embedded in the entry — derive from the map key.
        const dash = key.lastIndexOf('-');
        const weekId = key.slice(0, dash);
        const day = key.slice(dash + 1) as DayAbbr;
        await pushEntry({ ...entry, weekId, day, updatedAt: now });
      }
    })();
  }, []);

  // Background sync on mount
  useEffect(() => { void sync(); }, [sync]);

  // Re-sync when connection is restored
  useEffect(() => {
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [sync]);

  const write = useCallback(
    async (weekId: string, day: DayAbbr, patch: Partial<CompletionEntry>) => {
      setCompletion((prev) => {
        const key = `${weekId}-${day}`;
        const existing = prev[key] ?? { done: false };
        const updated: SyncedEntry = { ...existing, ...patch, weekId, day, updatedAt: Date.now() };
        const next = { ...prev, [key]: updated };
        writeLocal(next);
        void pushEntry(updated).then((ok) => {
          if (!ok) {
            const ob = readOutbox().filter((e) => !(e.weekId === weekId && e.day === day));
            writeOutbox([...ob, updated]);
          }
        });
        return next;
      });
    },
    [],
  );

  const toggleDone = useCallback(
    async (weekId: string, day: DayAbbr) => {
      const key = `${weekId}-${day}`;
      const current = completion[key] ?? { done: false };
      await write(weekId, day, { done: !current.done, completedAt: !current.done ? new Date().toISOString() : undefined });
    },
    [completion, write],
  );

  const setNotes = useCallback(
    async (weekId: string, day: DayAbbr, notes: string) => {
      await write(weekId, day, { notes });
    },
    [write],
  );

  const setActual = useCallback(
    async (weekId: string, day: DayAbbr, actual: Partial<CompletionEntry>) => {
      await write(weekId, day, actual);
    },
    [write],
  );

  const value: UseCompletion = { completion, loading: false, toggleDone, setNotes, setActual };
  return <CompletionContext.Provider value={value}>{children}</CompletionContext.Provider>;
}

export function useCompletion(): UseCompletion {
  const ctx = useContext(CompletionContext);
  if (!ctx) throw new Error('useCompletion must be used within a CompletionProvider');
  return ctx;
}
