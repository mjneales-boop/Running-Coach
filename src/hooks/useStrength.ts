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

/**
 * How long to sit on a changed log before pushing it.
 *
 * Local storage is written synchronously on every commit, so nothing here risks
 * data — this only coalesces the network. Committing a set used to fire one push
 * per keystroke; a 22-set session now settles into a handful of requests.
 */
const PUSH_DEBOUNCE_MS = 1200;

function readLocal(): StrengthMap {
  try { return JSON.parse(localStorage.getItem(KEY()) ?? '{}'); } catch { return {}; }
}
function writeLocal(data: StrengthMap) {
  try { localStorage.setItem(KEY(), JSON.stringify(data)); } catch { /* quota or private mode — the in-memory state still holds */ }
}
function readOutbox(): SyncedLog[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY()) ?? '[]'); } catch { return []; }
}
function writeOutbox(entries: SyncedLog[]) {
  try { localStorage.setItem(OUTBOX_KEY(), JSON.stringify(entries)); } catch { /* see writeLocal */ }
}

async function pushEntry(entry: SyncedLog): Promise<boolean> {
  try {
    await upsertStrength(entry);
    return true;
  } catch { return false; }
}

/** A failed push is queued, replacing any earlier queued version of the same log. */
function queueEntry(entry: SyncedLog) {
  const rest = readOutbox().filter((e) => !(e.date === entry.date && e.workoutId === entry.workoutId));
  writeOutbox([...rest, entry]);
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

  // Logs changed but not yet pushed, keyed by date. Always holds the newest
  // version of each, so a burst of commits pushes once with everything in it.
  const pending = useRef<Map<string, SyncedLog>>(new Map());
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPending = useCallback(() => {
    if (pushTimer.current) { clearTimeout(pushTimer.current); pushTimer.current = null; }
    if (pending.current.size === 0) return;
    const entries = [...pending.current.values()];
    pending.current.clear();
    void (async () => {
      for (const entry of entries) {
        if (!(await pushEntry(entry))) queueEntry(entry);
      }
    })();
  }, []);

  const schedulePush = useCallback(
    (entry: SyncedLog) => {
      pending.current.set(entry.date, entry);
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(flushPending, PUSH_DEBOUNCE_MS);
    },
    [flushPending],
  );

  // Never let a debounce window swallow a session. Backgrounding the PWA or
  // closing the tab pushes immediately; whatever fails lands in the outbox.
  useEffect(() => {
    const onHide = () => { if (document.hidden) flushPending(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushPending);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushPending);
      flushPending();
    };
  }, [flushPending]);

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

  /**
   * Single write path. The updater runs inside setState so back-to-back writes
   * always build on the newest log — the previous implementation closed over
   * `strength`, so two commits in the same tick could lose the first.
   */
  const writeLog = useCallback(
    (date: string, workoutId: string, mutate: (log: SyncedLog) => SyncedLog) => {
      setStrength((prev) => {
        const existing: SyncedLog = prev[date] ?? { workoutId, date, exercises: {} };
        const updated: SyncedLog = { ...mutate(existing), updatedAt: Date.now() };
        const next = { ...prev, [date]: updated };
        writeLocal(next);
        schedulePush(updated);
        return next;
      });
    },
    [schedulePush],
  );

  /**
   * Writes one set. Called on an explicit commit — never per keystroke.
   * Optimistic: local state and storage are updated synchronously, and the
   * network push is debounced behind them.
   */
  const commitSet = useCallback(
    (date: string, workoutId: string, exerciseId: string, setIndex: number, setLog: SetLog) => {
      writeLog(date, workoutId, (log) => {
        const sets = [...(log.exercises[exerciseId] ?? [])];
        // Pad rather than leaving holes: a sparse array serialises to nulls,
        // which every consumer would then have to defend against.
        while (sets.length < setIndex) sets.push({});
        sets[setIndex] = setLog;
        return { ...log, exercises: { ...log.exercises, [exerciseId]: sets } };
      });
    },
    [writeLog],
  );

  /** Appends an empty row so the athlete can log a set beyond the plan. */
  const addSet = useCallback(
    (date: string, workoutId: string, exerciseId: string) => {
      writeLog(date, workoutId, (log) => {
        const sets = [...(log.exercises[exerciseId] ?? []), {}];
        return { ...log, exercises: { ...log.exercises, [exerciseId]: sets } };
      });
    },
    [writeLog],
  );

  const markComplete = useCallback(
    (date: string, workoutId: string) => {
      writeLog(date, workoutId, (log) => ({ ...log, completedAt: new Date().toISOString() }));
    },
    [writeLog],
  );

  const markExerciseDone = useCallback(
    (date: string, workoutId: string, exerciseId: string, done: boolean) => {
      writeLog(date, workoutId, (log) => ({
        ...log,
        exerciseDone: { ...log.exerciseDone, [exerciseId]: done },
      }));
    },
    [writeLog],
  );

  return { strength, loading: false, commitSet, addSet, markComplete, markExerciseDone, flushPending };
}
