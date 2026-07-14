// Post-run heart-rate zone analysis. We don't ingest Strava's second-by-second
// HR streams — only the per-km split HR we already fetch (StravaRunDetail.splits).
// That's enough to tell the coach which zone the run mostly sat in, which is the
// whole point of the post-run debrief ("your HR was right where it needed to be").
//
// The plan's zones (lib/paceCalc.ts → computeZones) carry an `hr` band string per
// zone: "<140" (Recovery), "150–160" (mid zones), "181+" (VO2). Their LOWER bounds
// are monotonic increasing (0.74 → 0.82 → 0.85 → 0.88 → 0.91 → 0.95 × maxHR), so we
// partition a bpm to the hardest zone whose lower bound it clears — clean and
// unambiguous even though the printed upper bounds overlap.

import type { Zone, Day, StravaSplit } from '../types';
import { zoneForPace } from './logic';

/** Lower bpm bound of a zone's `hr` band string. "<140"→0, "150–160"→150, "181+"→181. */
export function zoneLowerBound(hr: string | undefined): number | null {
  if (!hr) return null;
  const cleaned = hr.replace(/\s/g, '');
  if (cleaned.startsWith('<')) return 0; // Recovery: everything below the next zone
  // First integer in the string is the lower bound (handles "150–160", "181+", "160-170").
  const m = cleaned.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** The zone a single HR reading falls in: the hardest zone whose lower bound bpm clears. */
export function zoneForHR(bpm: number, zones: Zone[]): Zone | undefined {
  let best: Zone | undefined;
  let bestLo = -1;
  for (const z of zones) {
    const lo = zoneLowerBound(z.hr);
    if (lo == null) continue;
    if (bpm >= lo && lo >= bestLo) {
      bestLo = lo;
      best = z;
    }
  }
  return best;
}

export interface RunZoneAnalysis {
  /** Zone the run spent the most distance in, by name. Null when no HR data at all. */
  dominantZone: string | null;
  /** Distance (km) and split count per zone, only zones that saw time. */
  perZone: { zone: string; splits: number; km: number }[];
  avgHR: number | null;
  maxHR: number | null;
  /** How many km of HR data backed this (0 when we only had an average). */
  kmWithHR: number;
}

/**
 * Bucket a run's per-km splits into HR zones. Falls back to a single average HR
 * (from the summary activity) when per-split HR isn't available, so an older
 * completed run still yields a coarse "which zone" read.
 */
export function analyzeRunZones(
  splits: StravaSplit[] | undefined,
  zones: Zone[],
  fallback?: { avgHR?: number; maxHR?: number; distanceKm?: number },
): RunZoneAnalysis {
  const byZone = new Map<string, { splits: number; km: number }>();
  let hrSum = 0;
  let hrCount = 0;
  let maxHR: number | null = fallback?.maxHR ?? null;
  let kmWithHR = 0;

  const withHR = (splits ?? []).filter((s) => s.avgHR != null);
  for (const s of withHR) {
    const z = zoneForHR(s.avgHR as number, zones);
    if (!z) continue;
    const km = s.distanceM / 1000;
    const cur = byZone.get(z.name) ?? { splits: 0, km: 0 };
    cur.splits += 1;
    cur.km += km;
    byZone.set(z.name, cur);
    hrSum += s.avgHR as number;
    hrCount += 1;
    kmWithHR += km;
    if (maxHR == null || (s.avgHR as number) > maxHR) maxHR = s.avgHR as number;
  }

  // No per-split HR — approximate the whole run as one bucket at its average HR.
  if (byZone.size === 0 && fallback?.avgHR != null) {
    const z = zoneForHR(fallback.avgHR, zones);
    if (z) {
      const km = fallback.distanceKm ?? 0;
      byZone.set(z.name, { splits: 1, km });
      kmWithHR = km;
    }
    hrSum = fallback.avgHR;
    hrCount = 1;
  }

  const perZone = [...byZone.entries()]
    .map(([zone, v]) => ({ zone, splits: v.splits, km: Math.round(v.km * 100) / 100 }))
    .sort((a, b) => b.km - a.km);

  return {
    dominantZone: perZone[0]?.zone ?? null,
    perZone,
    avgHR: hrCount ? Math.round(hrSum / hrCount) : (fallback?.avgHR ?? null),
    maxHR,
    kmWithHR: Math.round(kmWithHR * 100) / 100,
  };
}

/** The zone the planned session intended, from its prescribed pace. */
export function intendedZone(day: Day, zones: Zone[]): Zone | undefined {
  return zoneForPace(day.pace, zones);
}

/** Did the run's dominant zone match what the session called for? A hint for the coach's praise. */
export function zoneMatch(analysis: RunZoneAnalysis, intended: Zone | undefined): boolean {
  if (!intended || !analysis.dominantZone) return false;
  return analysis.dominantZone === intended.name;
}
