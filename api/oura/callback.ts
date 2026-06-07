import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { sessionOptions, type OuraSession } from '../../lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/?oura_error=${encodeURIComponent(String(error))}`);
  }

  // CSRF state check
  const cookieState = req.cookies['oura-state'];
  if (!state || state !== cookieState) {
    return res.status(400).send('Invalid state parameter');
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing code');
  }

  const tokenRes = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.OURA_REDIRECT_URI!,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return res.status(500).send(`Token exchange failed: ${errText}`);
  }

  const { access_token, refresh_token, expires_in } = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const session = await getIronSession<OuraSession>(req, res, sessionOptions);
  session.accessToken = access_token;
  session.refreshToken = refresh_token;
  session.expiresAt = Date.now() + expires_in * 1000;
  await session.save();

  // Clear state cookie — append rather than replace so iron-session's cookie survives
  const existing = res.getHeader('Set-Cookie');
  const existing_arr = Array.isArray(existing)
    ? existing
    : existing != null
      ? [String(existing)]
      : [];
  res.setHeader('Set-Cookie', [
    ...existing_arr,
    'oura-state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
  ]);

  res.redirect('/?oura_connected=1');
}
