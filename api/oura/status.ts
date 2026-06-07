import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIronSession } from 'iron-session';
import { sessionOptions, type OuraSession } from '../../lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getIronSession<OuraSession>(req, res, sessionOptions);
  res.json({ connected: !!session.accessToken });
}
