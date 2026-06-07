import { useState, useEffect, useCallback } from 'react';
import storage from '../lib/storage';

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

  const write = useCallback(
    async (val: T) => {
      setValue(val);
      await storage.set(key, JSON.stringify(val));
    },
    [key],
  );

  return [value, write, loading];
}
