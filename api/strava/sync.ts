import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureValidStravaToken } from '../../lib/strava-refresh.js';
import { verifyUser } from '../../lib/verifyUser.js';
import type { StravaActivity, StravaRunDetail, StravaSplit } from '../../src/types/index.js';

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

interface StravaSplitRaw {
  split: number;
  distance: number;           // metres
  average_speed: number;      // m/s
  average_heartrate?: number;
  elevation_difference?: number;
}

interface StravaActivityDetailRaw {
  id: number;
  name: string;
  start_date_local: string;
  distance: number;                 // metres
  average_speed: number;            // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain: number;     // metres
  map?: { summary_polyline?: string; polyline?: string };
  splits_metric?: StravaSplitRaw[];
}

// Sibling of the main sync handler below, folded into the same serverless function to
// stay under Vercel Hobby's 12-function cap (each api/**/*.ts file is its own function).
// GET /api/strava/sync?mode=last-run
async function handleLastRun(req: VercelRequest, res: VercelResponse, token: string) {
  const listRes = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=30',
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!listRes.ok) {
    if (listRes.status === 429) {
      return res.status(429).json({ error: 'rate limit — try again in 15 min' });
    }
    return res.status(502).json({ error: 'Strava API error', status: listRes.status });
  }

  const list = (await listRes.json()) as { id: number; sport_type: string; start_date_local: string }[];
  const runs = list.filter((a) => a.sport_type === 'Run' || a.sport_type === 'TrailRun');
  runs.sort((a, b) => b.start_date_local.localeCompare(a.start_date_local));
  const latestRun = runs[0];

  if (!latestRun) {
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ data: null });
  }

  const detailRes = await fetch(
    `https://www.strava.com/api/v3/activities/${latestRun.id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!detailRes.ok) {
    if (detailRes.status === 429) {
      return res.status(429).json({ error: 'rate limit — try again in 15 min' });
    }
    return res.status(502).json({ error: 'Strava API error', status: detailRes.status });
  }

  const a = (await detailRes.json()) as StravaActivityDetailRaw;

  const splits = (a.splits_metric ?? []).map((s) => ({
    split: s.split,
    distanceM: Math.round(s.distance),
    avgPaceMinKm: +(1000 / s.average_speed / 60).toFixed(2),
    ...(s.average_heartrate != null && { avgHR: Math.round(s.average_heartrate) }),
    ...(s.elevation_difference != null && { elevationDiffM: Math.round(s.elevation_difference) }),
  }));

  const result: StravaRunDetail = {
    id: String(a.id),
    name: a.name,
    date: a.start_date_local.slice(0, 10),
    distanceKm: +(a.distance / 1000).toFixed(2),
    avgPaceMinKm: +(1000 / a.average_speed / 60).toFixed(2),
    elevationGainM: Math.round(a.total_elevation_gain),
    ...(a.average_heartrate != null && { avgHR: Math.round(a.average_heartrate) }),
    ...(a.max_heartrate != null && { maxHR: Math.round(a.max_heartrate) }),
    ...(a.map?.summary_polyline && { polyline: a.map.summary_polyline }),
    ...(a.map?.polyline && { fullPolyline: a.map.polyline }),
    splits,
  };

  res.setHeader('Cache-Control', 'no-store');
  res.json({ data: result });
}

// GET /api/strava/sync?mode=splits&ids=123,456
//
// Per-km splits for specific activities, so the client can measure the *easy portion*
// of a mixed run (the aerobic kilometres of a long run, the warmup and cooldown either
// side of intervals) instead of only its whole-run average.
//
// Strava has no bulk detail endpoint — this is one call per activity, against a 100-per-
// 15-minute budget. The client backfills in batches and caches forever, since the splits
// of a finished run never change. BATCH_CAP leaves plenty of headroom in the window for
// the list sync and last-run detail that run alongside it.
const BATCH_CAP = 20;

async function handleSplits(req: VercelRequest, res: VercelResponse, token: string) {
  const raw = String(req.query.ids ?? '').trim();
  if (!raw) return res.status(400).json({ error: 'ids required' });

  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s)))];
  if (!ids.length) return res.status(400).json({ error: 'no valid ids' });
  if (ids.length > BATCH_CAP) {
    return res.status(400).json({ error: `too many ids (max ${BATCH_CAP})` });
  }

  const data: Record<string, StravaSplit[]> = {};
  // Sequential, not Promise.all: a burst of parallel calls is the fastest way to trip
  // Strava's rate limiter, and we stop the moment it pushes back so the ids we did get
  // are still returned and cached rather than lost with the whole batch.
  let rateLimited = false;
  for (const id of ids) {
    const r = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 429) { rateLimited = true; break; }
    // A single unreadable activity (deleted, made private, manual entry with no GPS)
    // shouldn't sink the batch — skip it and keep going.
    if (!r.ok) continue;

    const a = (await r.json()) as StravaActivityDetailRaw;
    data[String(id)] = (a.splits_metric ?? []).map((s) => ({
      split: s.split,
      distanceM: Math.round(s.distance),
      avgPaceMinKm: +(1000 / s.average_speed / 60).toFixed(2),
      ...(s.average_heartrate != null && { avgHR: Math.round(s.average_heartrate) }),
      ...(s.elevation_difference != null && { elevationDiffM: Math.round(s.elevation_difference) }),
    }));
  }

  res.setHeader('Cache-Control', 'no-store');
  // `missing` lets the client tell "no splits exist for this run" (don't ask again) apart
  // from "we ran out of budget" (do ask again next sync).
  res.json({
    data,
    rateLimited,
    missing: rateLimited ? [] : ids.filter((id) => !(id in data)),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const token = await ensureValidStravaToken(user.id);
  if (!token) return res.status(401).json({ error: 'Not connected' });

  if (req.query.mode === 'last-run') {
    return handleLastRun(req, res, token);
  }

  if (req.query.mode === 'splits') {
    return handleSplits(req, res, token);
  }

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
