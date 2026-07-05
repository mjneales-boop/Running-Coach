import { useCallback } from 'react';
import { createSyncedBlob } from './createSyncedBlob';
import type { DayAbbr, SwapStore, WeekContentMap } from '../types';

const { Provider: SwapsProvider, useSyncedBlob: useSwapsBlob } = createSyncedBlob<SwapStore>('swaps', {});
export { SwapsProvider };

export function useSwaps() {
  const { value: swaps, update } = useSwapsBlob();

  const swapDays = useCallback((weekId: string, dayA: DayAbbr, dayB: DayAbbr) => {
    update((prev) => {
      const weekMap: WeekContentMap = { ...(prev[weekId] ?? {}) };
      const srcA = weekMap[dayA] ?? dayA;
      const srcB = weekMap[dayB] ?? dayB;

      const next: WeekContentMap = { ...weekMap };
      // Each position now shows the other's current source; delete entry if it becomes identity
      if (srcB === dayA) delete next[dayA]; else next[dayA] = srcB;
      if (srcA === dayB) delete next[dayB]; else next[dayB] = srcA;

      return { ...prev, [weekId]: next };
    });
  }, [update]);

  return { swaps, swapDays };
}
