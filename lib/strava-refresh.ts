import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { stravaSessionOptions, type StravaSession } from './session.js';

export async function ensureValidStravaToken(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  const session = await getIronSession<StravaSession>(req, res, stravaSessionOptions);

  if (!session.accessToken) return null;

  const expiresAt = session.expiresAt ?? 0;
  // expiresAt is in seconds; Date.now() is ms — divide to compare in seconds
  if (expiresAt - Date.now() / 1000 < 60 && session.refreshToken) {
    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: process.env.STRAVA_CLIENT_ID!,
        client_secret: process.env.STRAVA_CLIENT_SECRET!,
      }),
    });

    if (!refreshRes.ok) {
      session.destroy();
      return null;
    }

    const { access_token, refresh_token, expires_at } = (await refreshRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number; // Strava returns Unix seconds directly
    };

    session.accessToken = access_token;
    session.refreshToken = refresh_token;
    session.expiresAt = expires_at; // already in seconds — do NOT multiply by 1000
    await session.save();
  }

  return session.accessToken ?? null;
}
