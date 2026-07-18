// Aerobic efficiency: heart rate at a given pace, tracked over time.
//
// The premise is the oldest read in endurance training — if you run the same pace this
// month at a lower heart rate than last month, you got fitter. Nothing else in the app
// captures that, because both existing charts move one variable at a time (pace trend
// assumes constant effort, HR alone is meaningless without the pace it bought).
//
// Source data is the cached Strava activity map (`marathon-strava`), which carries one
// summary row per date with avgPaceMinKm + avgHR. That's a whole-run average, so a
// mixed-effort session (intervals, progression) lands in whichever zone its *average*
// pace falls — which is why we bucket by zone and never compare across zones.

import type { StravaActivity, Zone } from '../types';

/** Parse a zone's pace band ("6:30–7:00", "5:41", "4:50-5:05") into min/max minutes-per-km. */
export function zonePaceBand(pace: string | undefined): { lo: number; hi: number } | null {
  if (!pace) return null;
  const cleaned = pace.replace(/\s/g, '');
  if (/[a-z]/i.test(cleaned)) return null; // "easy→5:41" — mixed effort, not a band
  const nums = cleaned
    .split(/[–\-→>]+/)
    .filter(Boolean)
    .map((p) => {
      const [m, s] = p.split(':').map(Number);
      return Number.isNaN(m) ? undefined : m + (s ?? 0) / 60;
    })
    .filter((n): n is number => n != null);
  if (!nums.length) return null;
  return { lo: Math.min(...nums), hi: Math.max(...nums) };
}

/**
 * Which zone an *actual* run pace belongs to. Distinct from logic.ts's zoneForPace, which
 * matches a planned pace *string* to its zone by exact/name match — here we only have a
 * number off Strava, so we test it against each zone's numeric band.
 *
 * Bands are widened to meet their neighbours (a 6:15 run shouldn't fall through the gap
 * between a 5:41 MP zone and a 6:30–7:00 easy zone), so every pace lands somewhere: each
 * run is assigned to the zone whose band it falls in, else the nearest band by distance.
 */
export function zoneForActualPace(paceMinKm: number, zones: Zone[]): Zone | undefined {
  let nearest: Zone | undefined;
  let nearestGap = Infinity;

  for (const z of zones) {
    const band = zonePaceBand(z.pace);
    if (!band) continue;
    if (paceMinKm >= band.lo && paceMinKm <= band.hi) return z;
    const gap = paceMinKm < band.lo ? band.lo - paceMinKm : paceMinKm - band.hi;
    if (gap < nearestGap) {
      nearestGap = gap;
      nearest = z;
    }
  }
  // Beyond ~45 s/km outside every band it isn't really that zone's effort any more.
  return nearestGap <= 0.75 ? nearest : undefined;
}

export interface HrPoint {
  date: string;
  hr: number;
  paceMinKm: number;
  distanceKm: number;
}

export interface ZoneEfficiency {
  zone: string;
  points: HrPoint[];
  /** Change in HR from the window's first third to its last third, in bpm. Negative = fitter. */
  hrDelta: number | null;
  /** Matching pace change over the same span — context for the HR move. */
  paceDelta: number | null;
  avgHR: number;
  avgPaceMinKm: number;
}

/** Mean of the first and last third of a series, used for a noise-tolerant trend read. */
function edgeMeans<T>(points: T[], pick: (p: T) => number): { start: number; end: number } | null {
  if (points.length < 4) return null;
  const n = Math.max(1, Math.floor(points.length / 3));
  const mean = (xs: T[]) => xs.reduce((a, b) => a + pick(b), 0) / xs.length;
  return { start: mean(points.slice(0, n)), end: mean(points.slice(-n)) };
}

/**
 * Group runs from the last `days` into pace zones and describe each zone's HR trend.
 * Zones with fewer than two runs are dropped — a single point is not a trend.
 */
export function buildHrEfficiency(
  activities: StravaActivity[],
  zones: Zone[],
  days = 90,
  today = new Date(),
): ZoneEfficiency[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const byZone = new Map<string, HrPoint[]>();
  for (const a of activities) {
    // avgHR is optional on StravaActivity — a run recorded without a strap tells us nothing here.
    if (a.avgHR == null || !a.avgPaceMinKm || a.date < cutoffStr) continue;
    const z = zoneForActualPace(a.avgPaceMinKm, zones);
    if (!z) continue;
    const list = byZone.get(z.name) ?? [];
    list.push({
      date: a.date,
      hr: a.avgHR,
      paceMinKm: a.avgPaceMinKm,
      distanceKm: a.distanceKm ?? 0,
    });
    byZone.set(z.name, list);
  }

  const result: ZoneEfficiency[] = [];
  for (const [zone, points] of byZone) {
    if (points.length < 2) continue;
    points.sort((a, b) => a.date.localeCompare(b.date));

    const hrEdges = edgeMeans(points, (p) => p.hr);
    const paceEdges = edgeMeans(points, (p) => p.paceMinKm);
    const avg = (pick: (p: HrPoint) => number) =>
      points.reduce((a, b) => a + pick(b), 0) / points.length;

    result.push({
      zone,
      points,
      hrDelta: hrEdges ? Math.round(hrEdges.end - hrEdges.start) : null,
      paceDelta: paceEdges ? Math.round((paceEdges.end - paceEdges.start) * 600) / 600 : null,
      avgHR: Math.round(avg((p) => p.hr)),
      avgPaceMinKm: Math.round(avg((p) => p.paceMinKm) * 100) / 100,
    });
  }

  // Most-run zone first — that's the one with the most trustworthy trend, and for a
  // marathon block it's almost always Easy, which is what the athlete wants to see.
  return result.sort((a, b) => b.points.length - a.points.length);
}

/** "5:41" from 5.6833 minutes-per-km. */
export function fmtPaceMin(min: number): string {
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}
