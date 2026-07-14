import { useCallback } from 'react';
import { createSyncedBlob } from './createSyncedBlob';

export interface RunSummary {
  summary: string;
  generatedAt: number;
  hadRunData: boolean;
}

/** Cached post-run coach summaries, keyed by `${weekId}-${dayAbbr}` (same key as completions). */
export type RunSummaryStore = Record<string, RunSummary>;

const { Provider: RunSummariesProvider, useSyncedBlob: useRunSummariesBlob } =
  createSyncedBlob<RunSummaryStore>('run-summaries', {});
export { RunSummariesProvider };

export function useRunSummaries() {
  const { value: summaries, update } = useRunSummariesBlob();

  const saveSummary = useCallback(
    (sessionKey: string, summary: string, hadRunData: boolean) => {
      update((prev) => ({
        ...prev,
        [sessionKey]: { summary, generatedAt: Date.now(), hadRunData },
      }));
    },
    [update],
  );

  const clearSummary = useCallback(
    (sessionKey: string) => {
      update((prev) => {
        if (!(sessionKey in prev)) return prev;
        const next = { ...prev };
        delete next[sessionKey];
        return next;
      });
    },
    [update],
  );

  return { summaries, saveSummary, clearSummary };
}
