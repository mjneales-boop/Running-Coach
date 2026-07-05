import { WEEKS, ZONES, RACE_NAME, RACE_DATE, GOAL_TIME, GOAL_PACE, ATHLETE, SEED_READINESS } from '../constants/plan';
import { findCurrentWeek, findTodaySession, daysToRace, currentPhase, weeklyKmDone, readinessHeadline } from './logic';
import type { CompletionEntry, ReadinessEntry, StravaActivity, Week } from '../types';

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
  /** Today plus the next ~9 days of the plan, spanning into next week if needed — lets the coach answer "what's tomorrow / this weekend / next week" questions. */
  upcoming: { date: string; weekday: string; type: string; title: string; km?: number; pace?: string }[];
  /** Actual logged runs from Strava, most recent first — real pace/HR/distance, not just the plan. */
  recentRuns: { date: string; distanceKm: number; avgPaceMinKm: number; avgHR?: number }[];
  stravaConnected: boolean;
}

function weekdayShort(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function upcomingDays(today: Date, count = 10) {
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return WEEKS.flatMap((w) => w.days)
    .filter((d) => d.date >= t)
    .slice(0, count)
    .map((d) => ({ date: d.date, weekday: weekdayShort(d.date), type: d.type, title: d.title, km: d.km, pace: d.pace }));
}

export function buildCoachContext(
  today: Date,
  completion: Record<string, CompletionEntry>,
  readinessEntry: ReadinessEntry,
  stravaActivities: Record<string, StravaActivity> = {},
): CoachContext {
  const week = findCurrentWeek(today, WEEKS);
  const phase = currentPhase(week);
  const todaySession = findTodaySession(today, week);
  const r = readinessEntry.score != null ? readinessEntry : SEED_READINESS;
  const { headline } = readinessHeadline(r.score);
  const activities = Object.values(stravaActivities).sort((a, b) => b.date.localeCompare(a.date));

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
    upcoming: upcomingDays(today),
    recentRuns: activities.slice(0, 10).map((a) => ({
      date: a.date,
      distanceKm: a.distanceKm,
      avgPaceMinKm: a.avgPaceMinKm,
      avgHR: a.avgHR,
    })),
    stravaConnected: activities.length > 0,
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
