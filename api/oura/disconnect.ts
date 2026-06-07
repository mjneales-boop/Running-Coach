import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { sessionOptions, type OuraSession } from '../../lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getIronSession<OuraSession>(req, res, sessionOptions);

  if (session.accessToken) {
    try {
      await fetch(
        `https://api.ouraring.com/oauth/revoke?access_token=${session.accessToken}`,
        { method: 'POST' },
      );
    } catch {
      // Best-effort — don't fail if Oura revoke errors
    }
  }

  session.destroy();
  res.json({ ok: true });
}
