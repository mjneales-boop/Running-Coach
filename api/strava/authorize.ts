import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
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
