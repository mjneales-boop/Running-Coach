import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { sessionOptions, type OuraSession } from './session.js';

/**
 * Returns a valid access token from the session, refreshing if it expires within 60s.
 * Destroys the session and returns null if refresh fails or no session exists.
 */
export async function ensureValidToken(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  const session = await getIronSession<OuraSession>(req, res, sessionOptions);

  if (!session.accessToken) return null;

  const expiresAt = session.expiresAt ?? 0;
  if (expiresAt - Date.now() < 60_000 && session.refreshToken) {
    const refreshRes = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: process.env.OURA_CLIENT_ID!,
        client_secret: process.env.OURA_CLIENT_SECRET!,
      }),
    });

    if (!refreshRes.ok) {
      session.destroy();
      return null;
    }

    const { access_token, refresh_token, expires_in } = (await refreshRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    session.accessToken = access_token;
    session.refreshToken = refresh_token;
    session.expiresAt = Date.now() + expires_in * 1000;
    await session.save();
  }

  return session.accessToken ?? null;
}
