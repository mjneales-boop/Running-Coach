import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { stravaSessionOptions, type StravaSession } from '../../lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getIronSession<StravaSession>(req, res, stravaSessionOptions);
  session.destroy();
  res.json({ ok: true });
}
