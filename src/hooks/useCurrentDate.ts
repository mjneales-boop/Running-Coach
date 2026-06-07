import { useState, useEffect } from 'react';
import storage from '../lib/storage';

export function useCurrentDate(): Date {
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    storage.get('marathon-settings').then((result) => {
      if (!result?.value) return;
      try {
        const settings = JSON.parse(result.value) as { dateOverride?: string };
        if (settings.dateOverride) {
          setDate(new Date(settings.dateOverride + 'T12:00:00'));
        }
      } catch {
        // ignore
      }
    });
  }, []);

  return date;
}
