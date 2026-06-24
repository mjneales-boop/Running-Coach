import { useState, useCallback, useEffect } from 'react';
import storage from '../lib/storage';
import type { GymOverrides, GymOverrideEntry } from '../types';

const STORAGE_KEY = 'marathon-gym-overrides';

export function useGymSchedule() {
  const [gymOverrides, setGymOverrides] = useState<GymOverrides>({});

  useEffect(() => {
    storage.get(STORAGE_KEY).then((result) => {
      if (result?.value) {
        try { setGymOverrides(JSON.parse(result.value) as GymOverrides); } catch {}
      }
    });
  }, []);

  const setGymOnDay = useCallback((date: string, gym: string, workoutId: string) => {
    setGymOverrides((prev) => {
      const next = { ...prev, [date]: { gym, workoutId } satisfies GymOverrideEntry };
      storage.set(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeGymFromDay = useCallback((date: string) => {
    setGymOverrides((prev) => {
      const next = { ...prev, [date]: { gym: null, workoutId: null } satisfies GymOverrideEntry };
      storage.set(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveGym = useCallback((
    fromDate: string,
    toDate: string,
    gym: string,
    workoutId: string,
    existingTarget?: { gym: string; workoutId: string } | null,
  ) => {
    setGymOverrides((prev) => {
      const next = { ...prev };
      // Remove (or swap back) source
      if (existingTarget) {
        next[fromDate] = { gym: existingTarget.gym, workoutId: existingTarget.workoutId };
      } else {
        next[fromDate] = { gym: null, workoutId: null };
      }
      next[toDate] = { gym, workoutId };
      storage.set(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { gymOverrides, setGymOnDay, removeGymFromDay, moveGym };
}
