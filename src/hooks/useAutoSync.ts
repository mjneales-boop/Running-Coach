import { useEffect } from 'react';

interface SyncSource {
  connected: boolean | null;
  syncing: boolean;
  lastSynced: Date | null;
  sync: (days?: number) => Promise<unknown>;
}

/**
 * Auto-sync Oura (every mount) and Strava (throttled to 15 min) once each
 * service reports as connected. Carried over from the old ReadinessBand,
 * which owned these effects before the Daily-tab redesign retired it.
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
      const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
      if (!strava.lastSynced || strava.lastSynced.getTime() < fifteenMinAgo) {
        strava.sync(7).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strava.connected, strava.sync, strava.lastSynced]);
}
