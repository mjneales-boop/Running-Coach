import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureValidStravaToken } from '../../lib/strava-refresh.js';
import type { StravaActivity } from '../../src/types/index.js';

interface StravaActivityRaw {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string; // e.g. "2026-06-13T09:37:14Z" — slice(0,10) for date
  distance: number;         // metres
  moving_time: number;      // seconds
  average_speed: number;    // m/s
  average_heartrate?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = await ensureValidStravaToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not connected' });

  const days = Math.min(90, Math.max(1, Number(req.query.days ?? 30)));
  const after = Math.floor(Date.now() / 1000) - days * 86400;

  const r = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${after}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!r.ok) {
    if (r.status === 429) {
      return res.status(429).json({ error: 'rate limit — try again in 15 min' });
    }
    return res.status(502).json({ error: 'Strava API error', status: r.status });
  }

  const raw = (await r.json()) as StravaActivityRaw[];
  const runs = raw.filter((a) => a.sport_type === 'Run');

  // Pick the longest run (by moving_time) per local date
  const byDate = new Map<string, StravaActivityRaw>();
  for (const a of runs) {
    const date = a.start_date_local.slice(0, 10);
    const existing = byDate.get(date);
    if (!existing || a.moving_time > existing.moving_time) byDate.set(date, a);
  }

  const result: Record<string, StravaActivity> = {};
  for (const [date, a] of byDate) {
    result[date] = {
      id: String(a.id),
      name: a.name,
      date,
      sportType: a.sport_type,
      distanceKm: +(a.distance / 1000).toFixed(2),
      movingTimeSec: a.moving_time,
      avgPaceMinKm: +(1000 / a.average_speed / 60).toFixed(2),
      ...(a.average_heartrate != null && { avgHR: Math.round(a.average_heartrate) }),
    };
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json({ data: result });
}
