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
  recentEntries: ReadinessEntry[];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
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

  const latestEntry = useMemo(() => {
    const keys = Object.keys(readiness).sort();
    return keys.length ? readiness[keys[keys.length - 1]] : {};
  }, [readiness]);

  const recentEntries = useMemo(() => {
    const keys = Object.keys(readiness).sort().slice(-7);
    return keys.map((k) => readiness[k]);
  }, [readiness]);

  return { readiness, loading, logEntry, todayEntry, latestEntry, recentEntries };
}
