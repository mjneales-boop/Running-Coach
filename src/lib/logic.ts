import { ATHLETE, PHASES, ZONES, GOAL_PACE, PEAK_KM } from '../constants/plan';
import type { Week, Day, PhaseInfo, CompletionEntry, ReadinessEntry, ReadinessTier, WeekContentMap, GymOverrides, Zone, StravaActivity } from '../types';

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

export function daysToRace(today: Date): number {
  const race = new Date('2026-10-10T08:00:00');
  return Math.max(0, Math.ceil((race.getTime() - today.getTime()) / 86400000));
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
  return week.days.reduce((sum, d) => {
    const entry = completion[`${week.id}-${d.d}`];
    if (!entry?.done) return sum;
    const km = entry.actualKm ?? d.km ?? 0;
    return sum + km;
  }, 0);
}

export function currentPhase(week: Week): PhaseInfo {
  return PHASES.find((p) => p.num === week.phase)!;
}

export function groupWeeksByPhase(weeks: Week[]): { phase: PhaseInfo; weeks: Week[] }[] {
  const groups: { phase: PhaseInfo; weeks: Week[] }[] = [];
  for (const w of weeks) {
    const last = groups[groups.length - 1];
    if (last && last.phase.num === w.phase) {
      last.weeks.push(w);
    } else {
      groups.push({ phase: currentPhase(w), weeks: [w] });
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

export function nextNonRestDay(today: Date, week: Week): Day | undefined {
  const t = localDateStr(today);
  return week.days.find((d) => d.date > t && d.type !== 'REST');
}

export function zoneForPace(paceStr: string | undefined): Zone | undefined {
  if (!paceStr) return undefined;
  const exact = ZONES.find((z) => z.pace === paceStr);
  if (exact) return exact;
  const lower = paceStr.toLowerCase();
  return ZONES.find((z) => lower.includes(z.name.toLowerCase().split(' ')[0]));
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

export function isHardSession(type: string): boolean {
  return type === 'LONG' || type === 'WORKOUT' || type === 'RACE';
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

export function metricBaseline(key: 'hrv' | 'rhr' | 'sleep'): number {
  if (key === 'hrv') return ATHLETE.baselineHRV;
  if (key === 'rhr') return ATHLETE.baselineRHR;
  return ATHLETE.baselineSleep;
}

export function readinessSecondaryWarnings(
  entries: ReadinessEntry[],
): string[] {
  const warnings: string[] = [];
  const last2 = entries.slice(-2);

  if (last2.length === 2) {
    const rhrAbove = last2.every((e) => (e.rhr ?? 0) > ATHLETE.baselineRHR + 7);
    if (rhrAbove) warnings.push('RHR elevated 2+ days — drop intensity');

    const hrvBelow = last2.every((e) => (e.hrv ?? Infinity) < ATHLETE.baselineHRV - 13);
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
  km: number;
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
): ProgressStats {
  const volume: WeekVolumePoint[] = weeks.map((w, i) => {
    const isPlanned = i > currentWeekIndex;
    const km = isPlanned ? w.targetKm : weeklyKmDone(w, completion);
    return { weekId: w.id, label: w.num, km, isPlanned, isCurrent: i === currentWeekIndex };
  });

  const windowStart = Math.max(0, currentWeekIndex - 3);
  const window = volume.slice(windowStart, currentWeekIndex + 1);
  const fourWeekAvgKm = window.length
    ? Math.round((window.reduce((s, w) => s + w.km, 0) / window.length) * 10) / 10
    : 0;

  const prevKm = volume[currentWeekIndex - 1]?.km ?? 0;
  const curKm = volume[currentWeekIndex]?.km ?? 0;
  const rampPct = prevKm > 0 ? Math.round(((curKm - prevKm) / prevKm) * 100) : 0;

  return { fourWeekAvgKm, peakWeekKm: PEAK_KM, rampPct, volume };
}

function parsePaceToMinutes(pace: string): number {
  const [m, s] = pace.split(':').map(Number);
  return m + s / 60;
}

export interface PacePoint {
  weekId: string;
  label: string;
  actual?: number;
  planned: number;
}

export function buildPaceProgression(weeks: Week[], activities: StravaActivity[]): PacePoint[] {
  const easyZone = ZONES.find((z) => z.name === 'Easy')!;
  const [easyLo, easyHi] = easyZone.pace.split('–').map(parsePaceToMinutes);
  const easyMid = (easyLo + easyHi) / 2;
  const goalPaceMin = parsePaceToMinutes(GOAL_PACE);
  const steadyZone = ZONES.find((z) => z.name === 'Steady')!;
  const steadyLo = parsePaceToMinutes(steadyZone.pace.split('–')[0]);

  return weeks.map((w, i) => {
    const base = easyMid + (goalPaceMin - easyMid) * (i / (weeks.length - 1));
    // Cutback weeks ease off (slightly slower); the peak week sharpens (slightly faster) —
    // reflects the plan's real periodization instead of a flat ramp.
    const periodizationOffset = w.cutback ? 0.12 : w.peak ? -0.08 : 0;
    const planned = base + periodizationOffset;
    const inWeek = activities.filter(
      (a) => a.sportType === 'Run' && a.date >= w.dateStart && a.date <= w.dateEnd && a.avgPaceMinKm >= steadyLo,
    );
    const actual = inWeek.length
      ? Math.round((inWeek.reduce((s, a) => s + a.avgPaceMinKm, 0) / inWeek.length) * 100) / 100
      : undefined;
    return { weekId: w.id, label: w.num, actual, planned: Math.round(planned * 100) / 100 };
  });
}
