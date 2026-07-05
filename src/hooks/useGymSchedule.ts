import { useCallback } from 'react';
import { createSyncedBlob } from './createSyncedBlob';
import type { GymOverrides, GymOverrideEntry } from '../types';

const { Provider: GymScheduleProvider, useSyncedBlob: useGymOverridesBlob } = createSyncedBlob<GymOverrides>('gymOverrides', {});
export { GymScheduleProvider };

export function useGymSchedule() {
  const { value: gymOverrides, update } = useGymOverridesBlob();

  const setGymOnDay = useCallback((date: string, gym: string, workoutId: string) => {
    update((prev) => ({ ...prev, [date]: { gym, workoutId } satisfies GymOverrideEntry }));
  }, [update]);

  const removeGymFromDay = useCallback((date: string) => {
    update((prev) => ({ ...prev, [date]: { gym: null, workoutId: null } satisfies GymOverrideEntry }));
  }, [update]);

  const moveGym = useCallback((
    fromDate: string,
    toDate: string,
    gym: string,
    workoutId: string,
    existingTarget?: { gym: string; workoutId: string } | null,
  ) => {
    update((prev) => {
      const next = { ...prev };
      // Remove (or swap back) source
      if (existingTarget) {
        next[fromDate] = { gym: existingTarget.gym, workoutId: existingTarget.workoutId };
      } else {
        next[fromDate] = { gym: null, workoutId: null };
      }
      next[toDate] = { gym, workoutId };
      return next;
    });
  }, [update]);

  return { gymOverrides, setGymOnDay, removeGymFromDay, moveGym };
}
