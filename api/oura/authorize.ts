import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // See api/strava/authorize.ts — bounce to the redirect_uri's own host first so
  // the state cookie always lands on the same host the OAuth callback returns to.
  const canonicalHost = new URL(process.env.OURA_REDIRECT_URI!).host;
  if (req.headers.host !== canonicalHost) {
    return res.redirect(`https://${canonicalHost}/api/oura/authorize`);
  }

  const state = crypto.randomBytes(16).toString('hex');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `oura-state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${secure}`,
  );

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.OURA_CLIENT_ID!,
    redirect_uri: process.env.OURA_REDIRECT_URI!,
    scope: 'daily heartrate personal',
    state,
  });

  res.redirect(`https://cloud.ouraring.com/oauth/authorize?${params}`);
}
