import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../lib/verifyUser.js';
import { getConnection } from '../../lib/tokenStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await verifyUser(req);
  if (!user) return res.json({ connected: false });
  const conn = await getConnection(user.id, 'oura');
  res.json({ connected: !!conn });
}
