import { useState, useCallback, useEffect } from 'react';
import storage from '../lib/storage';
import type { DayAbbr, SwapStore, WeekContentMap } from '../types';

export function useSwaps() {
  const [swaps, setSwaps] = useState<SwapStore>({});

  useEffect(() => {
    storage.get('marathon-swaps').then((result) => {
      if (result?.value) {
        try { setSwaps(JSON.parse(result.value) as SwapStore); } catch {}
      }
    });
  }, []);

  const swapDays = useCallback((weekId: string, dayA: DayAbbr, dayB: DayAbbr) => {
    setSwaps((prev) => {
      const weekMap: WeekContentMap = { ...(prev[weekId] ?? {}) };
      const srcA = weekMap[dayA] ?? dayA;
      const srcB = weekMap[dayB] ?? dayB;

      const next: WeekContentMap = { ...weekMap };
      // Each position now shows the other's current source; delete entry if it becomes identity
      if (srcB === dayA) delete next[dayA]; else next[dayA] = srcB;
      if (srcA === dayB) delete next[dayB]; else next[dayB] = srcA;

      const result = { ...prev, [weekId]: next };
      storage.set('marathon-swaps', JSON.stringify(result));
      return result;
    });
  }, []);

  return { swaps, swapDays };
}
