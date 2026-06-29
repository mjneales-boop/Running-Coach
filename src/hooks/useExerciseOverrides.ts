import { useState, useCallback } from 'react';
import type { SessionExerciseOverrides } from '../types';

const STORAGE_KEY = 'marathon-exercise-overrides';

function load(): SessionExerciseOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: SessionExerciseOverrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useExerciseOverrides() {
  const [exerciseOverrides, setExerciseOverrides] = useState<SessionExerciseOverrides>(load);

  const setSessionExercises = useCallback((date: string, workoutId: string, exerciseIds: string[]) => {
    setExerciseOverrides((prev) => {
      const next = { ...prev, [date]: { workoutId, exerciseIds } };
      save(next);
      return next;
    });
  }, []);

  const resetSessionExercises = useCallback((date: string) => {
    setExerciseOverrides((prev) => {
      const next = { ...prev };
      delete next[date];
      save(next);
      return next;
    });
  }, []);

  return { exerciseOverrides, setSessionExercises, resetSessionExercises };
}
