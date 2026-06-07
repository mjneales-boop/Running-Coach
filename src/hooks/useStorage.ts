import { useState, useEffect, useCallback } from 'react';
import storage from '../lib/storage';

export const STORAGE_UPDATED_EVENT = 'marathon-storage-updated';

export function useStorage<T>(
  key: string,
  defaultValue: T,
): [T, (val: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    storage.get(key).then((result) => {
      if (cancelled) return;
      if (result?.value) {
        try {
          setValue(JSON.parse(result.value) as T);
        } catch {
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
          try { setValue(JSON.parse(result.value) as T); } catch {}
        }
      });
    };
    window.addEventListener(STORAGE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STORAGE_UPDATED_EVENT, handler);
  }, [key]);

  const write = useCallback(
    async (val: T) => {
      setValue(val);
      await storage.set(key, JSON.stringify(val));
    },
    [key],
  );

  return [value, write, loading];
}
