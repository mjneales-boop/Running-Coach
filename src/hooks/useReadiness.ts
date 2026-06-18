import { useCallback, useMemo } from 'react';
import { useStorage } from './useStorage';
import type { ReadinessEntry } from '../types';

type ReadinessMap = Record<string, ReadinessEntry>;

interface UseReadiness {
  readiness: ReadinessMap;
  loading: boolean;
  logEntry: (dateKey: string, entry: ReadinessEntry) => Promise<void>;
  todayEntry: ReadinessEntry;
  latestEntry: ReadinessEntry;
  latestSleepDate: string | null;
  recentEntries: ReadinessEntry[];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useReadiness(): UseReadiness {
  const [readiness, write, loading] = useStorage<ReadinessMap>('marathon-readiness', {});

  const logEntry = useCallback(
    async (dateKey: string, entry: ReadinessEntry) => {
      const updated = { ...readiness, [dateKey]: entry };
      await write(updated);
    },
    [readiness, write],
  );

  const todayEntry = useMemo(() => readiness[todayKey()] ?? {}, [readiness]);

  const { latestEntry, latestSleepDate } = useMemo(() => {
    const keys = Object.keys(readiness).sort().reverse();
    const result: ReadinessEntry = {};
    let sleepDate: string | null = null;
    for (const k of keys) {
      const e = readiness[k];
      if (result.score == null && e.score != null) result.score = e.score;
      if (result.hrv == null && e.hrv != null) { result.hrv = e.hrv; if (!sleepDate) sleepDate = k; }
      if (result.rhr == null && e.rhr != null) result.rhr = e.rhr;
      if (result.sleep == null && e.sleep != null) result.sleep = e.sleep;
      if (result.score != null && result.hrv != null && result.rhr != null && result.sleep != null) break;
    }
    return { latestEntry: result, latestSleepDate: sleepDate };
  }, [readiness]);

  const recentEntries = useMemo(() => {
    const keys = Object.keys(readiness).sort().slice(-7);
    return keys.map((k) => readiness[k]);
  }, [readiness]);

  return { readiness, loading, logEntry, todayEntry, latestEntry, latestSleepDate, recentEntries };
}
