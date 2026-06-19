import type { StravaActivity } from '../types';

// Monday-based week key from a YYYY-MM-DD date string
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// decimal min/km → "m:ss"
export function fmtPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface WeekVolume {
  week: string;
  km: number;
  runs: number;
}

export function weeklyVolume(acts: StravaActivity[], weeks = 13): WeekVolume[] {
  const runs = acts.filter((a) => a.sportType === 'Run');
  const map = new Map<string, WeekVolume>();
  for (const a of runs) {
    const w = weekStart(a.date);
    const cur = map.get(w) ?? { week: w, km: 0, runs: 0 };
    cur.km += a.distanceKm;
    cur.runs += 1;
    map.set(w, cur);
  }
  const out: WeekVolume[] = [];
  const today = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const w = weekStart(d.toISOString().slice(0, 10));
    const hit = map.get(w);
    out.push(hit ? { ...hit, km: Math.round(hit.km * 10) / 10 } : { week: w, km: 0, runs: 0 });
  }
  return out;
}

export interface LongRunPoint {
  week: string;
  km: number;
}

export function longRunProgression(acts: StravaActivity[], weeks = 13): LongRunPoint[] {
  const vols = weeklyVolume(acts, weeks);
  const runs = acts.filter((a) => a.sportType === 'Run');
  return vols.map(({ week }) => {
    const inWeek = runs.filter((a) => weekStart(a.date) === week);
    const longest = inWeek.reduce((mx, a) => Math.max(mx, a.distanceKm), 0);
    return { week, km: Math.round(longest * 10) / 10 };
  });
}

export interface PaceBucket {
  label: string;
  count: number;
}

// Sub-4:00 marathon goal pace = 341s/km = 341/60 min/km ≈ 5.683 min/km
const GOAL_MIN_PER_KM = 341 / 60;

export function paceDistribution(
  acts: StravaActivity[],
  goalMinPerKm = GOAL_MIN_PER_KM,
): PaceBucket[] {
  const buckets: PaceBucket[] = [
    { label: 'Easy  (>goal +40s)', count: 0 },
    { label: 'Steady (goal +10–40s)', count: 0 },
    { label: 'Goal pace (±10s)', count: 0 },
    { label: 'Fast  (<goal −10s)', count: 0 },
  ];
  const thresh40 = 40 / 60;
  const thresh10 = 10 / 60;
  for (const a of acts.filter((x) => x.sportType === 'Run')) {
    const diff = a.avgPaceMinKm - goalMinPerKm;
    if (diff > thresh40) buckets[0].count++;
    else if (diff > thresh10) buckets[1].count++;
    else if (diff >= -thresh10) buckets[2].count++;
    else buckets[3].count++;
  }
  return buckets;
}

export interface TrainingSummary {
  weeks: WeekVolume[];
  longRun: LongRunPoint[];
  paceMix: PaceBucket[];
  longestRunKm: number;
  peakWeekKm: number;
  avgWeeklyKm: number;
  goalPace: string;
  weeksToRace: number;
}

export function buildSummary(
  acts: StravaActivity[],
  raceDateISO = '2026-10-10',
): TrainingSummary {
  const weeks = weeklyVolume(acts);
  const active = weeks.filter((w) => w.runs > 0);
  const runs = acts.filter((a) => a.sportType === 'Run');
  const longest = runs.reduce((mx, a) => Math.max(mx, a.distanceKm), 0);
  const weeksToRace = Math.max(
    0,
    Math.round((new Date(raceDateISO).getTime() - Date.now()) / (7 * 864e5)),
  );
  return {
    weeks,
    longRun: longRunProgression(acts),
    paceMix: paceDistribution(acts),
    longestRunKm: Math.round(longest * 10) / 10,
    peakWeekKm: Math.max(0, ...weeks.map((w) => w.km)),
    avgWeeklyKm: active.length
      ? Math.round((active.reduce((s, w) => s + w.km, 0) / active.length) * 10) / 10
      : 0,
    goalPace: fmtPace(GOAL_MIN_PER_KM),
    weeksToRace,
  };
}
