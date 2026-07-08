import { useEffect } from 'react';

interface SyncSource {
  connected: boolean | null;
  syncing: boolean;
  lastSynced: Date | null;
  sync: (days?: number) => Promise<unknown>;
}

/**
 * Auto-sync Oura (once per app session) and Strava (throttled to 15 min) once each
 * service reports as connected. Called once from AppShell (src/App.tsx), which stays
 * mounted for the life of the session, so sync fires regardless of which tab is active
 * — previously this lived in DailyScreen alone, so leaving the Daily tab killed the only
 * sync trigger and other screens (e.g. Coach) were stuck reading whatever was last cached.
 */
export function useAutoSync(oura: SyncSource, strava: SyncSource) {
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
      const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
      if (isFirstSync || strava.lastSynced!.getTime() < fifteenMinAgo) {
        strava.sync(isFirstSync ? 90 : 7).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strava.connected, strava.sync, strava.lastSynced]);
}
