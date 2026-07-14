// Deterministic pace-zone calculation. The LLM is bad at the arithmetic of
// deriving training paces (it once gave a 50 km/wk runner a 7:00/km easy pace),
// so we compute the zones in code and hand the model a finished table it must
// use verbatim. This removes the entire class of "wrong pace" bugs.
//
// Method: establish a single anchor — threshold pace T (the ~60-minute race
// effort) — then offset every zone from it. T comes from the athlete's best
// recent time via the Riegel endurance model, or from an experience+volume
// fallback table when they have no times. Standard practice for 40+ years
// (Daniels/VDOT, Riegel); nothing here is a guess by the model.

const RIEGEL_EXP = 1.06;

const DISTANCE_METERS: Record<string, number> = {
  '1 mile': 1609.34,
  '3k': 3000,
  '5k': 5000,
  '10k': 10000,
  half: 21097.5,
  'half marathon': 21097.5,
  marathon: 42195,
};

export interface RaceTimeInput {
  distance: string;
  time: string;
}

export interface ComputedZone {
  name: string;
  pace: string;
  hr: string;
  hero?: boolean;
}

export interface ComputedZones {
  zones: ComputedZone[];
  thresholdPaceSecPerKm: number;
  /** Fitness-predicted marathon pace (sec/km) — a useful goal-pace anchor. */
  marathonPaceSecPerKm: number;
  /** How T was derived, for diagnostics. */
  basis: 'race-times' | 'estimate';
}

/** "44:30" → 2670, "3:59:59" → 14399, "25:00" → 1500. null if unparseable. */
export function parseTimeToSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parts = raw.trim().split(':').map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function distanceToMeters(label: string | null | undefined): number | null {
  if (!label) return null;
  return DISTANCE_METERS[label.trim().toLowerCase()] ?? null;
}

/** Riegel: predict the time for distance d2 (m) from a known time t1 over d1 (m). */
function riegelPredict(t1Sec: number, d1M: number, d2M: number): number {
  return t1Sec * (d2M / d1M) ** RIEGEL_EXP;
}

/** Threshold pace (sec/km) ≈ the pace sustainable for a ~60-minute race, solved
 *  directly from a known result via the Riegel model. */
function thresholdFromRace(t1Sec: number, d1M: number): number {
  const d60Km = (d1M / 1000) * (3600 / t1Sec) ** (1 / RIEGEL_EXP);
  return 3600 / d60Km;
}

/** Fallback anchor when no race times exist — mirrors the coaching table:
 *  a runner sustaining this volume for months is AT LEAST this fit. */
function thresholdFromProfile(experience: string | null, weeklyKm: number | null): number {
  const km = weeklyKm ?? 0;
  const exp = (experience ?? 'intermediate').toLowerCase();
  if (exp === 'advanced') {
    if (km >= 70) return 225; // 3:45/km
    if (km >= 45) return 255; // 4:15/km
    if (km >= 25) return 275; // 4:35/km
    return 300; // 5:00/km
  }
  if (exp === 'beginner') {
    if (km >= 25) return 330; // 5:30/km
    return 355; // 5:55/km
  }
  // intermediate
  if (km >= 45) return 275; // 4:35/km
  if (km >= 25) return 300; // 5:00/km
  return 330; // 5:30/km
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function secToPace(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function paceRange(a: number, b: number): string {
  return `${secToPace(a)}–${secToPace(b)}`; // en-dash, matches UI zones
}

/**
 * Compute the 7 canonical training zones for an athlete. Prefers recent race
 * times (the reliable signal); falls back to experience + weekly volume.
 */
export function computeZones(input: {
  raceTimes?: RaceTimeInput[] | null;
  experience?: string | null;
  weeklyKm?: number | null;
  age?: number | null;
  maxHr?: number | null;
}): ComputedZones {
  // 1) Establish threshold pace T. From race times, take the sharpest (fastest
  //    implied T) valid result; else estimate from the profile.
  let basis: ComputedZones['basis'] = 'estimate';
  let tFromRaces: number | null = null;
  let mpFromRaces: number | null = null;

  for (const rt of input.raceTimes ?? []) {
    const t = parseTimeToSeconds(rt.time);
    const d = distanceToMeters(rt.distance);
    if (t == null || d == null || t <= 0) continue;
    const thr = thresholdFromRace(t, d);
    if (tFromRaces == null || thr < tFromRaces) {
      tFromRaces = thr;
      mpFromRaces = riegelPredict(t, d, DISTANCE_METERS.marathon) / (DISTANCE_METERS.marathon / 1000);
    }
  }

  let T: number;
  if (tFromRaces != null) {
    T = tFromRaces;
    basis = 'race-times';
  } else {
    T = thresholdFromProfile(input.experience ?? null, input.weeklyKm ?? null);
  }
  T = clamp(T, 165, 450); // 2:45–7:30/km sanity bounds

  // 2) Marathon pace: from races when available, else a fixed offset from T.
  //    Clamp so it always sits between Sub-T and Steady (keeps zone ordering).
  const mp = clamp(mpFromRaces ?? T + 28, T + 19, T + 40);

  // 3) Max HR for %-based HR bands: measured, else age-estimated, else 190.
  const maxHr = (input.maxHr && input.maxHr > 0) ? input.maxHr
    : (input.age && input.age > 0) ? 220 - input.age
    : 190;
  const hrPct = (a: number, b: number) => `${Math.round(a * maxHr)}–${Math.round(b * maxHr)}`;

  // 4) Zones as offsets from T (slowest → fastest, matching CANONICAL_ZONES).
  const zones: ComputedZone[] = [
    { name: 'Recovery', pace: paceRange(T + 95, T + 125), hr: `<${Math.round(0.74 * maxHr)}` },
    { name: 'Easy', pace: paceRange(T + 60, T + 90), hr: hrPct(0.74, 0.82) },
    { name: 'Steady', pace: paceRange(T + 35, T + 50), hr: hrPct(0.82, 0.87) },
    { name: 'Marathon (MP)', pace: secToPace(mp), hr: hrPct(0.85, 0.9), hero: true },
    { name: 'Sub-T', pace: paceRange(T + 8, T + 18), hr: hrPct(0.88, 0.92) },
    { name: 'Threshold', pace: paceRange(T - 5, T + 5), hr: hrPct(0.91, 0.95) },
    { name: 'VO2 / CV', pace: paceRange(T - 25, T - 12), hr: `${Math.round(0.95 * maxHr)}+` },
  ];

  return { zones, thresholdPaceSecPerKm: Math.round(T), marathonPaceSecPerKm: Math.round(mp), basis };
}
