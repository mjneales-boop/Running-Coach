import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../lib/verifyUser.js';
import { signState } from '../../lib/oauthState.js';

// Called via fetch WITH the Supabase Bearer token (see useStrava.connect), so we
// know which user is connecting. Returns the Strava authorize URL as JSON — the
// client then navigates to it. The user id rides along in a signed `state`
// (no cross-host cookie needed anymore), which the callback verifies.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const state = signState(user.id, 'strava');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    scope: 'activity:read',
    approval_prompt: 'auto',
    state,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.json({ url: `https://www.strava.com/oauth/authorize?${params}` });
}
