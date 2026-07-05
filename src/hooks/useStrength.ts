import { useState, useEffect, useCallback, useRef } from 'react';
import type { SetLog, WorkoutLog } from '../types';

type SyncedLog = WorkoutLog & { updatedAt?: number };
type StrengthMap = Record<string, SyncedLog>;

const KEY = 'marathon-strength';
const OUTBOX_KEY = 'marathon-strength-outbox';
const MIGRATED_KEY = 'marathon-strength-migrated';

function readLocal(): StrengthMap {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function writeLocal(data: StrengthMap) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}
function readOutbox(): SyncedLog[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]'); } catch { return []; }
}
function writeOutbox(entries: SyncedLog[]) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries)); } catch {}
}

async function pushEntry(entry: SyncedLog): Promise<boolean> {
  try {
    const r = await fetch('/api/strength', {
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
  const failed: SyncedLog[] = [];
  for (const entry of outbox) {
    if (!(await pushEntry(entry))) failed.push(entry);
  }
  writeOutbox(failed);
}

async function fetchRemote(): Promise<SyncedLog[]> {
  try {
    const r = await fetch('/api/strength');
    if (!r.ok) return [];
    const data = (await r.json()) as { entries?: SyncedLog[] };
    return data.entries ?? [];
  } catch { return []; }
}

export function useStrength() {
  const [strength, setStrength] = useState<StrengthMap>(readLocal);
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
        const existing = local[entry.date];
        if (!existing || (entry.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
          local[entry.date] = entry;
        }
      }
      writeLocal(local);
      setStrength({ ...local });
    } finally {
      syncing.current = false;
    }
  }, []);

  // One-time migration of existing localStorage data into Redis
  useEffect(() => {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    const local = readLocal();
    const entries = Object.values(local);
    localStorage.setItem(MIGRATED_KEY, '1');
    if (entries.length === 0) return;
    const now = Date.now();
    void (async () => {
      for (const entry of entries) {
        await pushEntry({ ...entry, updatedAt: entry.updatedAt ?? now });
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

  const logSet = useCallback(
    async (date: string, workoutId: string, exerciseId: string, setIndex: number, setLog: SetLog) => {
      const existing: SyncedLog = strength[date] ?? { workoutId, date, exercises: {} };
      const sets = [...(existing.exercises[exerciseId] ?? [])];
      sets[setIndex] = setLog;
      const updated: SyncedLog = {
        ...existing,
        exercises: { ...existing.exercises, [exerciseId]: sets },
        updatedAt: Date.now(),
      };
      const next = { ...strength, [date]: updated };
      setStrength(next);
      writeLocal(next);
      if (!(await pushEntry(updated))) {
        const ob = readOutbox().filter((e) => !(e.date === date && e.workoutId === workoutId));
        writeOutbox([...ob, updated]);
      }
    },
    [strength],
  );

  const markComplete = useCallback(
    async (date: string, workoutId: string) => {
      const existing: SyncedLog = strength[date] ?? { workoutId, date, exercises: {} };
      const updated: SyncedLog = {
        ...existing,
        completedAt: new Date().toISOString(),
        updatedAt: Date.now(),
      };
      const next = { ...strength, [date]: updated };
      setStrength(next);
      writeLocal(next);
      if (!(await pushEntry(updated))) {
        const ob = readOutbox().filter((e) => !(e.date === date && e.workoutId === workoutId));
        writeOutbox([...ob, updated]);
      }
    },
    [strength],
  );

  const markExerciseDone = useCallback(
    async (date: string, workoutId: string, exerciseId: string, done: boolean) => {
      const existing: SyncedLog = strength[date] ?? { workoutId, date, exercises: {} };
      const updated: SyncedLog = {
        ...existing,
        exerciseDone: { ...existing.exerciseDone, [exerciseId]: done },
        updatedAt: Date.now(),
      };
      const next = { ...strength, [date]: updated };
      setStrength(next);
      writeLocal(next);
      if (!(await pushEntry(updated))) {
        const ob = readOutbox().filter((e) => !(e.date === date && e.workoutId === workoutId));
        writeOutbox([...ob, updated]);
      }
    },
    [strength],
  );

  return { strength, loading: false, logSet, markComplete, markExerciseDone };
}
