import { useEffect, useRef } from 'react';
import { usePlanConfig } from './usePlanConfig';
import { getCurrentUserId } from './useAuth';
import { supabase } from '../lib/supabase';

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** General-fitness mode: once the athlete enters the final week of their
 *  rolling block, generate the next 4-week block from their actual completed
 *  volume. Guarded per block on the client (flag) and server (409 if early). */
export function useBlockExtension(today: Date) {
  const plan = usePlanConfig();
  const attempted = useRef(false);

  useEffect(() => {
    if (plan.mode !== 'general' || attempted.current) return;
    const lastWeek = plan.weeks[plan.weeks.length - 1];
    if (!lastWeek) return;
    if (localDateStr(today) < lastWeek.dateStart) return; // final week not started yet

    const flagKey = `stride:${getCurrentUserId()}:block-extended:${lastWeek.id}`;
    try {
      if (localStorage.getItem(flagKey)) return;
    } catch { /* storage unavailable — server guard still applies */ }
    attempted.current = true;

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const r = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ extend: true }),
        });
        if (r.ok) {
          try { localStorage.setItem(flagKey, new Date().toISOString()); } catch { /* ignore */ }
          window.location.reload(); // pick up the extended plan
        }
        // Non-OK (409 too early, 5xx): leave unflagged — retried on next app open.
      } catch { /* offline — retried on next app open */ }
    })();
  }, [plan, today]);
}
