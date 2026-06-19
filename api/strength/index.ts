import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const keys = await redis.keys('strength:*');
      if (keys.length === 0) return res.status(200).json({ entries: [] });
      const entries = await redis.mget<unknown[]>(...keys);
      return res.status(200).json({ entries: entries.filter(Boolean) });
    }

    if (req.method === 'PUT') {
      const entry = req.body as { date?: string; workoutId?: string; updatedAt?: number } | null;
      if (!entry?.date || !entry?.workoutId) {
        return res.status(400).json({ error: 'date and workoutId required' });
      }
      const key = `strength:${entry.date}:${entry.workoutId}`;
      const existing = await redis.get<{ updatedAt?: number }>(key);
      if (!existing || (entry.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
        await redis.set(key, entry);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('strength api failed', err);
    return res.status(500).json({ error: 'store error' });
  }
}
