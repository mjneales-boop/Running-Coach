import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { stravaSessionOptions, type StravaSession } from '../../lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getIronSession<StravaSession>(req, res, stravaSessionOptions);

  if (req.method === 'POST') {
    session.destroy();
    return res.json({ ok: true });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json({ connected: !!session.accessToken });
}
