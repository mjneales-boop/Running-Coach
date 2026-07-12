import { useState, useEffect, useCallback, useRef } from 'react';
import { upsertStrength, fetchStrength } from '../lib/db';
import { getCurrentUserId } from './useAuth';
import type { SetLog, WorkoutLog } from '../types';

type SyncedLog = WorkoutLog & { updatedAt?: number };
type StrengthMap = Record<string, SyncedLog>;

// Per-user cache; the legacy unscoped `marathon-strength` key is left
// untouched on the owner's device as a fallback.
const KEY = () => `stride:${getCurrentUserId()}:strength`;
const OUTBOX_KEY = () => `stride:${getCurrentUserId()}:strength-outbox`;

function readLocal(): StrengthMap {
  try { return JSON.parse(localStorage.getItem(KEY()) ?? '{}'); } catch { return {}; }
}
function writeLocal(data: StrengthMap) {
  try { localStorage.setItem(KEY(), JSON.stringify(data)); } catch {}
}
function readOutbox(): SyncedLog[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY()) ?? '[]'); } catch { return []; }
}
function writeOutbox(entries: SyncedLog[]) {
  try { localStorage.setItem(OUTBOX_KEY(), JSON.stringify(entries)); } catch {}
}

async function pushEntry(entry: SyncedLog): Promise<boolean> {
  try {
    await upsertStrength(entry);
    return true;
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
    return await fetchStrength();
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
