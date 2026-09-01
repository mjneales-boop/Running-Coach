import { useState, useEffect, useCallback, useRef } from 'react';
import storage from '../lib/storage';

export const STORAGE_UPDATED_EVENT = 'marathon-storage-updated';

export function useStorage<T>(
  key: string,
  defaultValue: T,
): [T, (val: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  // Mirrors `value`, but updated synchronously inside write(). React batches state
  // across a burst of events, so two writes in the same tick would both read the
  // pre-batch `value` from their render closure and the first would be lost. The
  // ref is what makes the functional form of write() safe under rapid taps.
  const latest = useRef<T>(defaultValue);

  useEffect(() => {
    let cancelled = false;
    storage.get(key).then((result) => {
      if (cancelled) return;
      if (result?.value) {
        try {
          const parsed = JSON.parse(result.value) as T;
          latest.current = parsed;
          setValue(parsed);
        } catch {
          latest.current = defaultValue;
          setValue(defaultValue);
        }
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Re-read when an external writer (e.g. useOura.sync) signals a change
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail?.key !== key) return;
      storage.get(key).then((result) => {
        if (result?.value) {
          try {
            const parsed = JSON.parse(result.value) as T;
            latest.current = parsed;
            setValue(parsed);
          } catch { /* keep the value we already have */ }
        }
      });
    };
    window.addEventListener(STORAGE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STORAGE_UPDATED_EVENT, handler);
  }, [key]);

  const write = useCallback(
    async (val: T | ((prev: T) => T)) => {
      const next = typeof val === 'function' ? (val as (prev: T) => T)(latest.current) : val;
      latest.current = next;
      setValue(next);
      await storage.set(key, JSON.stringify(next));
    },
    [key],
  );

  return [value, write, loading];
}
