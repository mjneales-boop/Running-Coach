import { getConnection, saveConnection, deleteConnection } from './tokenStore.js';

/** Returns a valid Oura access token for the user, refreshing (and
 *  re-persisting) if it expires within 60s. Deletes the connection and returns
 *  null if the refresh fails or the user has no connection. */
export async function ensureValidToken(uid: string): Promise<string | null> {
  const conn = await getConnection(uid, 'oura');
  if (!conn) return null;

  const nowSec = Date.now() / 1000;
  if (conn.expiresAt - nowSec >= 60) return conn.accessToken;

  const refreshRes = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refreshToken,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });

  if (!refreshRes.ok) {
    await deleteConnection(uid, 'oura');
    return null;
  }

  const { access_token, refresh_token, expires_in } = (await refreshRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number; // seconds until expiry
  };

  await saveConnection(uid, 'oura', {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + expires_in,
  });
  return access_token;
}
