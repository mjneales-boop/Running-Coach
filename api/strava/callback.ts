import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { stravaSessionOptions, type StravaSession } from '../../lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/?strava_error=${encodeURIComponent(String(error))}`);
  }

  // CSRF state check
  const cookieState = req.cookies['strava-state'];
  if (!state || state !== cookieState) {
    return res.status(400).send('Invalid state parameter');
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing code');
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.STRAVA_REDIRECT_URI!,
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return res.status(500).send(`Token exchange failed: ${errText}`);
  }

  const { access_token, refresh_token, expires_at } = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Strava returns Unix seconds — do NOT multiply by 1000
  };

  const session = await getIronSession<StravaSession>(req, res, stravaSessionOptions);
  session.accessToken = access_token;
  session.refreshToken = refresh_token;
  session.expiresAt = expires_at;
  await session.save();

  // Clear state cookie without clobbering the iron-session cookie
  const existing = res.getHeader('Set-Cookie');
  const existingArr = Array.isArray(existing)
    ? existing
    : existing != null
      ? [String(existing)]
      : [];
  res.setHeader('Set-Cookie', [
    ...existingArr,
    'strava-state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
  ]);

  res.redirect('/?strava_connected=1');
}
