import { useState, useEffect, useCallback, useRef } from 'react';
import { getBlob, setBlob } from '../lib/db';
import { getCurrentUserId } from './useAuth';
import type { SessionExerciseOverrides } from '../types';

const RESOURCE = 'exercise-overrides';
// Per-user cache; the legacy unscoped `marathon-exercise-overrides` key is
// left untouched on the owner's device as a fallback.
const STORAGE_KEY = () => `stride:${getCurrentUserId()}:${RESOURCE}`;

function load(): SessionExerciseOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: SessionExerciseOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY(), JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

export function useExerciseOverrides() {
  const [exerciseOverrides, setExerciseOverrides] = useState<SessionExerciseOverrides>(load);
  const dirty = useRef(false);
  const synced = useRef(false);

  // Hydrate from Supabase once; remote (if present) wins over the local cache.
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    void getBlob<SessionExerciseOverrides>(RESOURCE)
      .then((remote) => {
        if (!remote) return;
        save(remote.value);
        setExerciseOverrides(remote.value);
      })
      .catch(() => { /* offline — cache-loaded state stands */ });
  }, []);

  // Persist after local mutations (state updaters stay pure).
  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    save(exerciseOverrides);
    void setBlob(RESOURCE, exerciseOverrides, Date.now()).catch(() => {
      /* best-effort — cache already written */
    });
  }, [exerciseOverrides]);

  const setSessionExercises = useCallback(
    (date: string, workoutId: string, exerciseIds: string[]) => {
      dirty.current = true;
      setExerciseOverrides((prev) => ({ ...prev, [date]: { workoutId, exerciseIds } }));
    },
    [],
  );

  const resetSessionExercises = useCallback((date: string) => {
    dirty.current = true;
    setExerciseOverrides((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  }, []);

  return { exerciseOverrides, setSessionExercises, resetSessionExercises };
}
