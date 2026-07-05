import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Also doubles as a generic cross-device key/value blob store (?resource=swaps,
// ?resource=gymOverrides, ...) so small per-device-only settings — day swaps, gym
// day overrides — sync the same way completion does, rather than living in
// localStorage only and silently diverging between a phone and a desktop.
async function handleBlob(req: VercelRequest, res: VercelResponse, resource: string) {
  const key = `blob:${resource}`;

  if (req.method === 'GET') {
    const stored = await redis.get<{ value: unknown; updatedAt: number }>(key);
    return res.status(200).json(stored ?? { value: null, updatedAt: 0 });
  }

  if (req.method === 'PUT') {
    const body = req.body as { value?: unknown; updatedAt?: number } | null;
    if (body?.value === undefined) return res.status(400).json({ error: 'value required' });
    const existing = await redis.get<{ updatedAt?: number }>(key);
    if (!existing || (body.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      await redis.set(key, { value: body.value, updatedAt: body.updatedAt ?? Date.now() });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const resource = typeof req.query.resource === 'string' ? req.query.resource : 'completion';

  try {
    if (resource !== 'completion') {
      return await handleBlob(req, res, resource);
    }

    if (req.method === 'GET') {
      const keys = await redis.keys('completion:*');
      if (keys.length === 0) return res.status(200).json({ entries: [] });
      const entries = await redis.mget<unknown[]>(...keys);
      return res.status(200).json({ entries: entries.filter(Boolean) });
    }

    if (req.method === 'PUT') {
      const entry = req.body as { weekId?: string; day?: string; updatedAt?: number } | null;
      if (!entry?.weekId || !entry?.day) {
        return res.status(400).json({ error: 'weekId and day required' });
      }
      const key = `completion:${entry.weekId}:${entry.day}`;
      const existing = await redis.get<{ updatedAt?: number }>(key);
      if (!existing || (entry.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
        await redis.set(key, entry);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('completion api failed', err);
    return res.status(500).json({ error: 'store error' });
  }
}
