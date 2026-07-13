import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../lib/verifyUser.js';
import { getConnection, deleteConnection } from '../../lib/tokenStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await verifyUser(req);
  if (!user) {
    if (req.method === 'POST') return res.status(401).json({ error: 'Unauthorized' });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ connected: false });
  }

  // POST = disconnect (this user only).
  if (req.method === 'POST') {
    await deleteConnection(user.id, 'strava');
    return res.json({ ok: true });
  }

  res.setHeader('Cache-Control', 'no-store');
  const conn = await getConnection(user.id, 'strava');
  res.json({ connected: !!conn });
}
