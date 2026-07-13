import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../lib/verifyUser.js';
import { signState } from '../../lib/oauthState.js';

// See api/strava/authorize.ts — called via fetch with the Supabase Bearer token;
// returns the Oura authorize URL as JSON with a signed `state` carrying the user id.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const state = signState(user.id, 'oura');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.OURA_CLIENT_ID!,
    redirect_uri: process.env.OURA_REDIRECT_URI!,
    scope: 'daily heartrate personal',
    state,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.json({ url: `https://cloud.ouraring.com/oauth/authorize?${params}` });
}
