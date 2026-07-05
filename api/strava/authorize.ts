import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // The state cookie must be set on the same host the OAuth callback lands on
  // (STRAVA_REDIRECT_URI's host). Vercel deployments are reachable from several
  // hosts (stable prod alias, per-deploy preview URLs) — if a user starts the
  // flow from a different host than the fixed redirect_uri, the cookie never
  // makes it back and Strava's callback fails with "Invalid state parameter".
  // Bounce to the canonical host first so the cookie always lands where it's needed.
  const canonicalHost = new URL(process.env.STRAVA_REDIRECT_URI!).host;
  if (req.headers.host !== canonicalHost) {
    return res.redirect(`https://${canonicalHost}/api/strava/authorize`);
  }

  const state = crypto.randomBytes(16).toString('hex');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `strava-state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${secure}`,
  );

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    scope: 'activity:read',
    approval_prompt: 'auto',
    state,
  });

  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
