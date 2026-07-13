import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../lib/verifyUser.js';
import { getConnection, deleteConnection } from '../../lib/tokenStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const conn = await getConnection(user.id, 'oura');
  if (conn) {
    try {
      await fetch(`https://api.ouraring.com/oauth/revoke?access_token=${conn.accessToken}`, {
        method: 'POST',
      });
    } catch {
      // Best-effort — don't fail if Oura revoke errors
    }
  }

  await deleteConnection(user.id, 'oura');
  res.json({ ok: true });
}
