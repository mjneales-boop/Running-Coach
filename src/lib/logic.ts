import type { Week, Day, PhaseInfo, CompletionEntry, ReadinessEntry, ReadinessTier, WeekContentMap, SwapStore, GymOverrides, Zone, SessionType, StravaActivity, StravaSplit } from '../types';

/** Structural subset of PlanConfig.athlete — anything with baselines works. */
export interface AthleteBaselines {
  baselineHRV: number;
  baselineRHR: number;
  baselineSleep: number;
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function findCurrentWeek(today: Date, weeks: Week[]): Week {
  const t = localDateStr(today);
  for (const w of weeks) {
    if (t >= w.dateStart && t <= w.dateEnd) return w;
  }
  if (t < weeks[0].dateStart) return weeks[0];
  return weeks[weeks.length - 1];
}

export function findCurrentWeekIndex(today: Date, weeks: Week[]): number {
  const t = localDateStr(today);
  for (let i = 0; i < weeks.length; i++) {
    if (t >= weeks[i].dateStart && t <= weeks[i].dateEnd) return i;
  }
  if (t < weeks[0].dateStart) return 0;
  return weeks.length - 1;
}

export function findTodaySession(today: Date, week: Week): Day | undefined {
  const t = localDateStr(today);
  return week.days.find((d) => d.date === t);
}

export function daysToRace(today: Date, race: { date: string; time?: string }): number {
  if (!race.date) return 0;
  const raceStart = new Date(`${race.date}T${race.time || '08:00'}:00`);
  return Math.max(0, Math.ceil((raceStart.getTime() - today.getTime()) / 86400000));
}

export function readinessTier(score: number): ReadinessTier {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 60) return 'yellow';
  if (score >= 50) return 'compromised';
  return 'red';
}

export function readinessColor(score: number | null | undefined): string {
  if (score == null) return 'var(--text-muted)';
  if (score >= 85) return 'var(--success)';
  if (score >= 70) return 'var(--accent)';
  if (score >= 60) return 'var(--warn)';
  return 'var(--danger)';
}

export function readinessStatus(score: number | null | undefined): string {
  if (score == null) return '—';
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 60) return 'COMPROMISED';
  return 'RED';
}

export function readinessHeadline(score: number | null | undefined): { headline: string; sub: string } {
  if (score == null) return { headline: '—', sub: 'No data yet' };
  if (score >= 80) return { headline: 'Primed', sub: 'Above baseline' };
  if (score >= 65) return { headline: 'Steady', sub: 'On track' };
  if (score >= 50) return { headline: 'Compromised', sub: 'Below baseline' };
  return { headline: 'Recovering', sub: 'Prioritize rest' };
}

export function readinessAdjustment(score: number | null | undefined): string {
  if (score == null) return '';
  if (score >= 85) return 'Execute as planned. Top of pace ranges OK.';
  if (score >= 70) return 'Execute as planned.';
  if (score >= 60) return 'Soften: quality day → drop 1 rep, slow end of paces. Easy → recovery pace.';
  if (score >= 50) return 'Quality → 45 min easy. Long run → cut 25%, no MP segments. Sleep priority.';
  return 'Off day or 30 min recovery jog. No quality.';
}

export function weekCompletionPct(week: Week, completion: Record<string, CompletionEntry>): number {
  const total = week.days.length;
  const done = week.days.filter((d) => completion[`${week.id}-${d.d}`]?.done).length;
  return Math.round((done / total) * 100);
}

export function weeklyKmDone(week: Week, completion: Record<string, CompletionEntry>): number {
  const total = week.days.reduce((sum, d) => {
    const entry = completion[`${week.id}-${d.d}`];
    if (!entry?.done) return sum;
    const km = entry.actualKm ?? d.km ?? 0;
    return sum + km;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function currentPhase(week: Week, phases: PhaseInfo[]): PhaseInfo {
  return phases.find((p) => p.num === week.phase) ?? phases[0];
}

export function groupWeeksByPhase(weeks: Week[], phases: PhaseInfo[]): { phase: PhaseInfo; weeks: Week[] }[] {
  const groups: { phase: PhaseInfo; weeks: Week[] }[] = [];
  for (const w of weeks) {
    const last = groups[groups.length - 1];
    if (last && last.phase.num === w.phase) {
      last.weeks.push(w);
    } else {
      groups.push({ phase: currentPhase(w, phases), weeks: [w] });
    }
  }
  return groups;
}

/** The week's defining session (race day, then long run, then quality workout) for a one-line summary. */
export function weekFocus(week: Week): string {
  const race = week.days.find((d) => d.type === 'RACE');
  if (race) return race.title;
  const long = week.days.find((d) => d.type === 'LONG');
  if (long) return long.title;
  const workout = week.days.find((d) => d.type === 'WORKOUT');
  if (workout) return workout.title;
  return week.label;
}

export function applySwapsToWeek(week: Week, contentMap: WeekContentMap): Week {
  if (!contentMap || Object.keys(contentMap).length === 0) return week;
  const byAbbr = new Map(week.days.map((d) => [d.d, d]));
  const days = week.days.map((pos) => {
    const src = contentMap[pos.d] ?? pos.d;
    if (src === pos.d) return pos;
    const srcDay = byAbbr.get(src);
    if (!srcDay) return pos;
    return { ...srcDay, d: pos.d, date: pos.date };
  });
  return { ...week, days };
}

export function applyGymOverrides(week: Week, overrides: GymOverrides): Week {
  if (!overrides || Object.keys(overrides).length === 0) return week;
  const days = week.days.map((day) => {
    const o = overrides[day.date];
    if (!o) return day;
    if (o.gym === null) return { ...day, gym: undefined, workoutId: undefined };
    return { ...day, gym: o.gym, workoutId: o.workoutId ?? undefined };
  });
  return { ...week, days };
}

/**
 * The plan as the athlete actually sees it: every week with its swaps and gym overrides
 * applied. Daily/Full Plan resolve this per-week at render time; anything that reasons
 * about the whole plan (the coach context, notably) must go through here — otherwise it
 * reads the raw generated plan and reports the wrong session on any swapped day.
 */
export function applyPlanOverrides(weeks: Week[], swaps: SwapStore, gymOverrides: GymOverrides): Week[] {
  return weeks.map((w) => applyGymOverrides(applySwapsToWeek(w, swaps[w.id] ?? {}), gymOverrides));
}

export function nextNonRestDay(today: Date, week: Week, allWeeks?: Week[]): Day | undefined {
  const t = localDateStr(today);
  const inWeek = week.days.find((d) => d.date > t && d.type !== 'REST');
  if (inWeek) return inWeek;
  if (!allWeeks) return undefined;
  // Nothing left this week (e.g. Sat/Sun with only rest ahead) — look into following weeks.
  const idx = allWeeks.findIndex((w) => w.id === week.id);
  for (let i = idx + 1; i < allWeeks.length; i++) {
    const found = allWeeks[i].days.find((d) => d.date > t && d.type !== 'REST');
    if (found) return found;
  }
  return undefined;
}

export function zoneForPace(paceStr: string | undefined, zones: Zone[]): Zone | undefined {
  if (!paceStr) return undefined;
  const exact = zones.find((z) => z.pace === paceStr);
  if (exact) return exact;
  const lower = paceStr.toLowerCase();
  return zones.find((z) => lower.includes(z.name.toLowerCase().split(' ')[0]));
}

function paceToMinutes(pace: string): number | undefined {
  const cleaned = pace.replace(/\s/g, '');
  if (/[a-z]/i.test(cleaned)) return undefined; // e.g. "easy→5:41" — mixed-effort, too ambiguous to average
  const parts = cleaned.split(/[–\-→>]+/).filter(Boolean);
  const nums = parts
    .map((p) => {
      const [m, s] = p.split(':').map(Number);
      if (Number.isNaN(m)) return undefined;
      return m + (s ?? 0) / 60;
    })
    .filter((n): n is number => n != null);
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function estimateDuration(day: Day): string | undefined {
  if (day.duration) {
    const h = Math.floor(day.duration / 60);
    const m = day.duration % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}m`;
  }
  if (!day.km || !day.pace) return undefined;
  const paceMin = paceToMinutes(day.pace);
  if (paceMin == null) return undefined;
  const totalMin = day.km * paceMin;
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function nextGymDay(today: Date, week: Week): Day | undefined {
  const t = localDateStr(today);
  return week.days.find((d) => d.date >= t && d.gym);
}

/**
 * Sessions that carry real intensity cost. A competitive 90-minute match is
 * high-intensity with repeated accelerations and change of direction — it counts,
 * and the app under-counted load for as long as it did not.
 */
const HARD_TYPES = new Set<SessionType>(['LONG', 'WORKOUT', 'RACE', 'GAME']);

export function isHardSession(type: SessionType): boolean {
  return HARD_TYPES.has(type);
}

/** Weekly hard-session count. Two is the target; three means something must give. */
export function hardSessionCount(week: Week): number {
  return week.days.filter((d) => isHardSession(d.type)).length;
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function trendDir(
  value: number | undefined,
  baseline: number,
  higherIsBetter: boolean,
): 'good-up' | 'good-down' | 'flat' {
  if (value == null) return 'flat';
  const diff = value - baseline;
  if (Math.abs(diff) < baseline * 0.03) return 'flat';
  if (higherIsBetter) return diff > 0 ? 'good-up' : 'good-down';
  return diff < 0 ? 'good-up' : 'good-down';
}

export function readinessTrendColor(dir: 'good-up' | 'good-down' | 'flat'): string {
  if (dir === 'good-up' || dir === 'good-down') return 'var(--success)';
  return 'var(--text-muted)';
}

export function metricBaseline(key: 'hrv' | 'rhr' | 'sleep', athlete: AthleteBaselines): number {
  if (key === 'hrv') return athlete.baselineHRV;
  if (key === 'rhr') return athlete.baselineRHR;
  return athlete.baselineSleep;
}

export function readinessSecondaryWarnings(
  entries: ReadinessEntry[],
  athlete: AthleteBaselines,
): string[] {
  const warnings: string[] = [];
  const last2 = entries.slice(-2);

  if (last2.length === 2) {
    const rhrAbove = last2.every((e) => (e.rhr ?? 0) > athlete.baselineRHR + 7);
    if (rhrAbove) warnings.push('RHR elevated 2+ days — drop intensity');

    const hrvBelow = last2.every((e) => (e.hrv ?? Infinity) < athlete.baselineHRV - 13);
    if (hrvBelow) warnings.push('HRV suppressed 2+ days — easy day');
  }

  const latest = entries[entries.length - 1];
  if (latest?.sleep != null && latest.sleep < 6) {
    warnings.push('Sleep <6h last night — no quality today');
  }

  if (warnings.length >= 2) {
    warnings.length = 0;
    warnings.push('Multiple stress signals — full rest recommended');
  }

  return warnings;
}

export interface WeekVolumePoint {
  weekId: string;
  label: string;
  /** Km actually completed. 0 for weeks that haven't happened yet. */
  km: number;
  /** The week's planned target — drawn as the outline the completed bar fills toward. */
  targetKm: number;
  isPlanned: boolean;
  isCurrent: boolean;
}

export interface ProgressStats {
  fourWeekAvgKm: number;
  peakWeekKm: number;
  rampPct: number;
  volume: WeekVolumePoint[];
}

export function buildProgressStats(
  weeks: Week[],
  completion: Record<string, CompletionEntry>,
  currentWeekIndex: number,
  peakKm: number,
): ProgressStats {
  // `km` is always what was actually run — future weeks are 0, not their target. The chart
  // draws the target as an outline the completed bar fills, so a half-done current week
  // reads as half-full rather than as a finished week of that height.
  const volume: WeekVolumePoint[] = weeks.map((w, i) => ({
    weekId: w.id,
    label: w.num,
    km: i > currentWeekIndex ? 0 : weeklyKmDone(w, completion),
    targetKm: w.targetKm,
    isPlanned: i > currentWeekIndex,
    isCurrent: i === currentWeekIndex,
  }));

  const windowStart = Math.max(0, currentWeekIndex - 3);
  const window = volume.slice(windowStart, currentWeekIndex + 1);
  const fourWeekAvgKm = window.length
    ? Math.round((window.reduce((s, w) => s + w.km, 0) / window.length) * 10) / 10
    : 0;

  const prevKm = volume[currentWeekIndex - 1]?.km ?? 0;
  const curKm = volume[currentWeekIndex]?.km ?? 0;
  const rampPct = prevKm > 0 ? Math.round(((curKm - prevKm) / prevKm) * 100) : 0;

  return { fourWeekAvgKm, peakWeekKm: peakKm, rampPct, volume };
}

function parsePaceToMinutes(pace: string): number {
  const [m, s] = pace.split(':').map(Number);
  return m + s / 60;
}

export interface PacePoint {
  weekId: string;
  label: string;
  /** Distance-weighted pace across the week's easy kilometres. Undefined if none. */
  actual?: number;
  /** Distance-weighted average HR over those same kilometres. Undefined if unrecorded. */
  hr?: number;
  /** How many kilometres of easy running the week's numbers rest on. */
  easyKm: number;
  /** The Easy zone as [fast bound, slow bound] — the band `actual` should sit inside. */
  band: [number, number];
}

export interface PaceProgression {
  points: PacePoint[];
  /** Fast end of the Easy zone (smaller number = quicker). */
  easyLo: number;
  /** Slow end of the Easy zone. */
  easyHi: number;
  /** True when at least one week fell back to whole-run averages (splits still syncing). */
  approximate: boolean;
  /** The pace window a kilometre must fall in to count. Wider than the band itself. */
  window: { fast: number; slow: number };
}

/**
 * The pace window that counts as an easy kilometre.
 *
 * Not the Easy band verbatim, and not a flat tolerance either — a symmetric ±30s window
 * around a 6:10–6:40 band reaches 5:40, which is marathon pace, so the MP finish of a
 * long run would be admitted as easy running. Instead each edge extends halfway to the
 * neighbouring zone, so every kilometre lands in whichever zone it is genuinely nearest
 * and the boundaries can never cross into Steady or Recovery territory.
 */
export function easyKmWindow(zones: Zone[]): { fast: number; slow: number } {
  const easy = zones.find((z) => z.name === 'Easy')!;
  const [lo, hi] = easy.pace.split('\u2013').map(parsePaceToMinutes);

  // Every other zone's pace bounds, as plain numbers on the same min/km scale.
  const others = zones
    .filter((z) => z.name !== 'Easy')
    .flatMap((z) => z.pace.split('\u2013').map(parsePaceToMinutes))
    .filter((n) => Number.isFinite(n));

  const fasterEdge = Math.max(...others.filter((n) => n < lo), -Infinity);
  const slowerEdge = Math.min(...others.filter((n) => n > hi), Infinity);

  return {
    fast: Number.isFinite(fasterEdge) ? (fasterEdge + lo) / 2 : lo - 0.25,
    slow: Number.isFinite(slowerEdge) ? (hi + slowerEdge) / 2 : hi + 0.25,
  };
}

/**
 * Weekly easy pace and the heart rate that bought it.
 *
 * Measured per kilometre, not per run. A long run is mostly easy running with a harder
 * finish, and an interval session is a hard middle wrapped in easy warmup and cooldown —
 * judging either by its whole-run average throws away the easy kilometres in both. So we
 * take every split whose pace lands in the easy range, wherever it happened, and weight
 * by distance.
 *
 * Runs whose splits haven't been backfilled yet fall back to their whole-run average
 * (counted only if that average is itself easy), so the chart is useful immediately and
 * sharpens as `useRunSplits` fills in. `approximate` reports when that fallback was used.
 */
export function buildPaceProgression(
  weeks: Week[],
  activities: StravaActivity[],
  zones: Zone[],
  splitsById: Record<string, StravaSplit[] | null> = {},
): PaceProgression {
  const easyZone = zones.find((z) => z.name === 'Easy')!;
  const [easyLo, easyHi] = easyZone.pace.split('\u2013').map(parsePaceToMinutes);
  const band: [number, number] = [easyLo, easyHi];
  const win = easyKmWindow(zones);
  const isEasyPace = (p: number) => p >= win.fast && p <= win.slow;

  let approximate = false;

  const points = weeks.map((w) => {
    const inWeek = activities.filter(
      (a) => a.sportType === 'Run' && a.date >= w.dateStart && a.date <= w.dateEnd,
    );

    let km = 0;        // easy distance
    let minutes = 0;   // time over that distance
    let hrKm = 0;      // distance that also carried a HR reading
    let hrSum = 0;     // HR weighted by that distance

    for (const a of inWeek) {
      const splits = splitsById[a.id];

      if (splits && splits.length) {
        for (const sp of splits) {
          if (!isEasyPace(sp.avgPaceMinKm)) continue;
          const d = sp.distanceM / 1000;
          if (d <= 0) continue;
          km += d;
          minutes += sp.avgPaceMinKm * d;
          if (sp.avgHR != null) { hrKm += d; hrSum += sp.avgHR * d; }
        }
        continue;
      }

      // No splits cached (or Strava has none). Fall back to the whole-run average, but
      // only when the run reads as easy end to end — otherwise a tempo session's average
      // would be admitted as if it were an easy run.
      if (splits === undefined) approximate = true;
      if (!a.distanceKm || !isEasyPace(a.avgPaceMinKm)) continue;
      km += a.distanceKm;
      minutes += (a.movingTimeSec / 60);
      if (a.avgHR != null) { hrKm += a.distanceKm; hrSum += a.avgHR * a.distanceKm; }
    }

    return {
      weekId: w.id,
      label: w.num,
      actual: km > 0 ? Math.round((minutes / km) * 100) / 100 : undefined,
      hr: hrKm > 0 ? Math.round(hrSum / hrKm) : undefined,
      easyKm: Math.round(km * 10) / 10,
      band,
    };
  });

  return { points, easyLo, easyHi, approximate, window: win };
}
