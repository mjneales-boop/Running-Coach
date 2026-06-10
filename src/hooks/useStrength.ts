import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type { SetLog, WorkoutLog } from '../types';

type StrengthMap = Record<string, WorkoutLog>;

interface UseStrength {
  strength: StrengthMap;
  loading: boolean;
  logSet: (date: string, workoutId: string, exerciseId: string, setIndex: number, setLog: SetLog) => Promise<void>;
  markComplete: (date: string, workoutId: string) => Promise<void>;
}

export function useStrength(): UseStrength {
  const [strength, write, loading] = useStorage<StrengthMap>('marathon-strength', {});

  const logSet = useCallback(
    async (date: string, workoutId: string, exerciseId: string, setIndex: number, setLog: SetLog) => {
      const existing = strength[date] ?? { workoutId, date, exercises: {} };
      const sets = [...(existing.exercises[exerciseId] ?? [])];
      sets[setIndex] = setLog;
      const updated: StrengthMap = {
        ...strength,
        [date]: { ...existing, exercises: { ...existing.exercises, [exerciseId]: sets } },
      };
      await write(updated);
    },
    [strength, write],
  );

  const markComplete = useCallback(
    async (date: string, workoutId: string) => {
      const existing = strength[date] ?? { workoutId, date, exercises: {} };
      const updated: StrengthMap = {
        ...strength,
        [date]: { ...existing, completedAt: new Date().toISOString() },
      };
      await write(updated);
    },
    [strength, write],
  );

  return { strength, loading, logSet, markComplete };
}
