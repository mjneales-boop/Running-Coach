import { getConnection, saveConnection, deleteConnection } from './tokenStore.js';

/** Returns a valid Strava access token for the user, refreshing (and
 *  re-persisting) if it expires within 60s. Deletes the connection and returns
 *  null if the refresh fails or the user has no connection. */
export async function ensureValidStravaToken(uid: string): Promise<string | null> {
  const conn = await getConnection(uid, 'strava');
  if (!conn) return null;

  const nowSec = Date.now() / 1000;
  if (conn.expiresAt - nowSec >= 60) return conn.accessToken;

  const refreshRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refreshToken,
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
    }),
  });

  if (!refreshRes.ok) {
    await deleteConnection(uid, 'strava');
    return null;
  }

  const { access_token, refresh_token, expires_at } = (await refreshRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Strava returns Unix seconds directly
  };

  await saveConnection(uid, 'strava', {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at,
  });
  return access_token;
}
