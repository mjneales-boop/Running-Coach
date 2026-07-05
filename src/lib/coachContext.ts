import { WEEKS, ZONES, RACE_NAME, RACE_DATE, GOAL_TIME, GOAL_PACE, ATHLETE, SEED_READINESS } from '../constants/plan';
import { findCurrentWeek, findTodaySession, daysToRace, currentPhase, weeklyKmDone, readinessHeadline } from './logic';
import type { CompletionEntry, ReadinessEntry, Week } from '../types';

export interface CoachContext {
  race: { name: string; date: string; goalTime: string; goalPace: string };
  week: { num: string; phase: string; daysOut: number; targetKm: number; doneKm: number };
  readiness: {
    score?: number;
    headline: string;
    hrv?: number;
    rhr?: number;
    sleep?: number;
    baselineHRV: number;
    baselineRHR: number;
    baselineSleep: number;
  };
  zones: { name: string; pace: string; hr: string }[];
  today: { type: string; title: string; km?: number; pace?: string; notes?: string } | null;
}

export function buildCoachContext(
  today: Date,
  completion: Record<string, CompletionEntry>,
  readinessEntry: ReadinessEntry,
): CoachContext {
  const week = findCurrentWeek(today, WEEKS);
  const phase = currentPhase(week);
  const todaySession = findTodaySession(today, week);
  const r = readinessEntry.score != null ? readinessEntry : SEED_READINESS;
  const { headline } = readinessHeadline(r.score);

  return {
    race: { name: RACE_NAME, date: RACE_DATE, goalTime: GOAL_TIME, goalPace: GOAL_PACE },
    week: { num: week.num, phase: phase.name, daysOut: daysToRace(today), targetKm: week.targetKm, doneKm: weeklyKmDone(week, completion) },
    readiness: {
      score: r.score,
      headline,
      hrv: r.hrv,
      rhr: r.rhr,
      sleep: r.sleep,
      baselineHRV: ATHLETE.baselineHRV,
      baselineRHR: ATHLETE.baselineRHR,
      baselineSleep: ATHLETE.baselineSleep,
    },
    zones: ZONES.map((z) => ({ name: z.name, pace: z.pace, hr: z.hr })),
    today: todaySession
      ? { type: todaySession.type, title: todaySession.title, km: todaySession.km, pace: todaySession.pace, notes: todaySession.notes }
      : null,
  };
}

function timeOfDayGreeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

function weekStatusLine(week: Week): string {
  if (week.race) return 'race week — trust the taper';
  if (week.peak) return 'your peak week — biggest volume of the block';
  if (week.cutback) return 'a lighter cutback week — good time to recover';
  return 'right on schedule';
}

/** Opening chat bubble, regenerated fresh each time — reflects today's actual plan position, not persisted history. */
export function coachGreeting(today: Date): string {
  const week = findCurrentWeek(today, WEEKS);
  const phase = currentPhase(week);
  const daysOut = daysToRace(today);
  return `${timeOfDayGreeting(today)}. You're ${daysOut} days out, week ${week.num} of ${phase.short.toLowerCase()} — ${weekStatusLine(
    week,
  )}. Ask me about today, your paces, or the week ahead.`;
}
