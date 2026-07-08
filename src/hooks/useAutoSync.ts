import { useEffect, useRef } from 'react';

interface SyncSource {
  connected: boolean | null;
  syncing: boolean;
  lastSynced: Date | null;
  sync: (days?: number) => Promise<unknown>;
}

const FRESH_WINDOW_MS = 15 * 60 * 1000;

/**
 * Auto-sync Oura (once per app session, plus on foreground return) and Strava (throttled
 * to 15 min) once each service reports as connected. Called once from AppShell
 * (src/App.tsx), which stays mounted for the life of the session, so sync fires
 * regardless of which tab is active — previously this lived in DailyScreen alone, so
 * leaving the Daily tab killed the only sync trigger and other screens (e.g. Coach) were
 * stuck reading whatever was last cached.
 *
 * The mount-time effects below only fire once per app *launch* (when `connected` first
 * flips true), which isn't enough for an installed PWA: reopening it from the app
 * switcher resumes the existing page instead of remounting it, so a session left running
 * since this morning would never pick up a readiness score that Oura finalizes later in
 * the day. The visibilitychange/focus listener re-syncs whenever the app comes back to
 * the foreground and the last sync is stale, independent of any remount.
 */
export function useAutoSync(oura: SyncSource, strava: SyncSource) {
  const ouraRef = useRef(oura);
  ouraRef.current = oura;
  const stravaRef = useRef(strava);
  stravaRef.current = strava;

  useEffect(() => {
    if (oura.connected === true) {
      oura.sync(7).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oura.connected, oura.sync]);

  useEffect(() => {
    if (strava.connected === true) {
      // First sync ever on this device pulls the full plan-to-date window (up to
      // Strava's 90-day cap) so weekly volume/pace history isn't stuck at "just today's
      // run" after connecting. Later auto-syncs only need a narrow catch-up window —
      // anything already fetched stays merged into the local cache regardless.
      const isFirstSync = !strava.lastSynced;
      const fifteenMinAgo = Date.now() - FRESH_WINDOW_MS;
      if (isFirstSync || strava.lastSynced!.getTime() < fifteenMinAgo) {
        strava.sync(isFirstSync ? 90 : 7).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strava.connected, strava.sync, strava.lastSynced]);

  useEffect(() => {
    const trySync = () => {
      if (document.visibilityState !== 'visible') return;
      const o = ouraRef.current;
      const s = stravaRef.current;
      if (o.connected === true && (!o.lastSynced || Date.now() - o.lastSynced.getTime() > FRESH_WINDOW_MS)) {
        o.sync(7).catch(() => {});
      }
      if (s.connected === true && (!s.lastSynced || Date.now() - s.lastSynced.getTime() > FRESH_WINDOW_MS)) {
        s.sync(7).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', trySync);
    window.addEventListener('focus', trySync);
    return () => {
      document.removeEventListener('visibilitychange', trySync);
      window.removeEventListener('focus', trySync);
    };
  }, []);
}
