import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyState } from '../../lib/oauthState.js';
import { saveConnection } from '../../lib/tokenStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/?oura_error=${encodeURIComponent(String(error))}`);
  }

  // Signed state carries + authenticates the connecting user's id (CSRF guard).
  const uid = typeof state === 'string' ? verifyState(state, 'oura') : null;
  if (!uid) {
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
    expires_in: number; // seconds until expiry
  };

  await saveConnection(uid, 'oura', {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + expires_in,
  });

  res.redirect('/?oura_connected=1');
}
