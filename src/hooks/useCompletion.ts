import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type { CompletionEntry, DayAbbr } from '../types';

type CompletionMap = Record<string, CompletionEntry>;

interface UseCompletion {
  completion: CompletionMap;
  loading: boolean;
  toggleDone: (weekId: string, day: DayAbbr) => Promise<void>;
  setNotes: (weekId: string, day: DayAbbr, notes: string) => Promise<void>;
  setActual: (weekId: string, day: DayAbbr, actual: Partial<CompletionEntry>) => Promise<void>;
}

export function useCompletion(): UseCompletion {
  const [completion, write, loading] = useStorage<CompletionMap>('marathon-completion', {});

  const toggleDone = useCallback(
    async (weekId: string, day: DayAbbr) => {
      const key = `${weekId}-${day}`;
      const current = completion[key] ?? { done: false };
      const updated = {
        ...completion,
        [key]: {
          ...current,
          done: !current.done,
          completedAt: !current.done ? new Date().toISOString() : undefined,
        },
      };
      await write(updated);
    },
    [completion, write],
  );

  const setNotes = useCallback(
    async (weekId: string, day: DayAbbr, notes: string) => {
      const key = `${weekId}-${day}`;
      const updated = {
        ...completion,
        [key]: { ...(completion[key] ?? { done: false }), notes },
      };
      await write(updated);
    },
    [completion, write],
  );

  const setActual = useCallback(
    async (weekId: string, day: DayAbbr, actual: Partial<CompletionEntry>) => {
      const key = `${weekId}-${day}`;
      const updated = {
        ...completion,
        [key]: { ...(completion[key] ?? { done: false }), ...actual },
      };
      await write(updated);
    },
    [completion, write],
  );

  return { completion, loading, toggleDone, setNotes, setActual };
}
