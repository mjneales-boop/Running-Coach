import { ATHLETE, PHASES } from '../constants/plan';
import type { Week, Day, PhaseInfo, CompletionEntry, ReadinessEntry, ReadinessTier } from '../types';

export function findCurrentWeek(today: Date, weeks: Week[]): Week {
  const t = today.toISOString().slice(0, 10);
  for (const w of weeks) {
    if (t >= w.dateStart && t <= w.dateEnd) return w;
  }
  if (t < weeks[0].dateStart) return weeks[0];
  return weeks[weeks.length - 1];
}

export function findCurrentWeekIndex(today: Date, weeks: Week[]): number {
  const t = today.toISOString().slice(0, 10);
  for (let i = 0; i < weeks.length; i++) {
    if (t >= weeks[i].dateStart && t <= weeks[i].dateEnd) return i;
  }
  if (t < weeks[0].dateStart) return 0;
  return weeks.length - 1;
}

export function findTodaySession(today: Date, week: Week): Day | undefined {
  const t = today.toISOString().slice(0, 10);
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
