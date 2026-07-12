import { SEED_READINESS } from '../constants/plan';
import type { PlanConfig } from '../hooks/usePlanConfig';
import {
  findCurrentWeek,
  findCurrentWeekIndex,
  findTodaySession,
  daysToRace,
  currentPhase,
  weeklyKmDone,
  readinessHeadline,
  readinessAdjustment,
  buildProgressStats,
} from './logic';
import { guideEntriesForDay } from './coaching';
import type { CompletionEntry, Day, ReadinessEntry, StravaActivity, Week } from '../types';

interface GuideSummary {
  label: string;
  what: string;
  why: string;
  feel: string;
  execute: string[];
  mistake: string;
}

function guideSummary(day: Day): GuideSummary[] {
  return guideEntriesForDay(day).map(({ label, what, why, feel, execute, mistake }) => ({
    label,
    what,
    why,
    feel,
    execute,
    mistake,
  }));
}

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
  today:
    | {
        type: string;
        title: string;
        km?: number;
        pace?: string;
        notes?: string;
        /** What/why/feel/execution-steps/common-mistake for today's session type — use this for detailed breakdown questions. */
        guide?: GuideSummary[];
        /** How today's session should be adjusted given current readiness. */
        readinessAdjustment?: string;
      }
    | null;
  /** Today plus the next ~9 days of the plan, spanning into next week if needed — lets the coach answer "what's tomorrow / this weekend / next week" questions. Only the near-term entries (first ~4) carry full `guide` detail, to bound context size. */
  upcoming: { date: string; weekday: string; type: string; title: string; km?: number; pace?: string; guide?: GuideSummary[] }[];
  /** Actual logged runs from Strava, most recent first — real pace/HR/distance, not just the plan. */
  recentRuns: { date: string; distanceKm: number; avgPaceMinKm: number; avgHR?: number }[];
  /** Completed km per week for the last few weeks (oldest first) plus this week — use for volume-trend questions ("how has my training been going the last few weeks"). */
  recentWeeks: { label: string; kmDone: number; targetKm: number }[];
  stravaConnected: boolean;
}

function weekdayShort(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function upcomingDays(today: Date, weeks: Week[], count = 10, guideDepth = 4) {
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return weeks.flatMap((w) => w.days)
    .filter((d) => d.date >= t)
    .slice(0, count)
    .map((d, i) => ({
      date: d.date,
      weekday: weekdayShort(d.date),
      type: d.type,
      title: d.title,
      km: d.km,
      pace: d.pace,
      ...(i < guideDepth ? { guide: guideSummary(d) } : {}),
    }));
}

export function buildCoachContext(
  today: Date,
  completion: Record<string, CompletionEntry>,
  readinessEntry: ReadinessEntry,
  stravaActivities: Record<string, StravaActivity> = {},
  plan: PlanConfig,
): CoachContext {
  const { weeks, zones, phases, peakKm, race, athlete } = plan;
  const week = findCurrentWeek(today, weeks);
  const weekIndex = findCurrentWeekIndex(today, weeks);
  const phase = currentPhase(week, phases);
  const todaySession = findTodaySession(today, week);
  const r = readinessEntry.score != null ? readinessEntry : SEED_READINESS;
  const { headline } = readinessHeadline(r.score);
  const activities = Object.values(stravaActivities).sort((a, b) => b.date.localeCompare(a.date));
  const progress = buildProgressStats(weeks, completion, weekIndex, peakKm);
  const recentWeeks = progress.volume
    .filter((v) => !v.isPlanned)
    .slice(-4)
    .map((v) => ({ label: v.label, kmDone: v.km, targetKm: weeks.find((w) => w.id === v.weekId)!.targetKm }));

  return {
    race: { name: race.name, date: race.date, goalTime: race.goalTime, goalPace: race.goalPace },
    week: { num: week.num, phase: phase.name, daysOut: daysToRace(today, race), targetKm: week.targetKm, doneKm: weeklyKmDone(week, completion) },
    readiness: {
      score: r.score,
      headline,
      hrv: r.hrv,
      rhr: r.rhr,
      sleep: r.sleep,
      baselineHRV: athlete.baselineHRV,
      baselineRHR: athlete.baselineRHR,
      baselineSleep: athlete.baselineSleep,
    },
    zones: zones.map((z) => ({ name: z.name, pace: z.pace, hr: z.hr })),
    today: todaySession
      ? {
          type: todaySession.type,
          title: todaySession.title,
          km: todaySession.km,
          pace: todaySession.pace,
          notes: todaySession.notes,
          guide: guideSummary(todaySession),
          readinessAdjustment: readinessAdjustment(r.score),
        }
      : null,
    upcoming: upcomingDays(today, weeks),
    recentRuns: activities.slice(0, 10).map((a) => ({
      date: a.date,
      distanceKm: a.distanceKm,
      avgPaceMinKm: a.avgPaceMinKm,
      avgHR: a.avgHR,
    })),
    recentWeeks,
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
export function coachGreeting(today: Date, plan: PlanConfig): string {
  const week = findCurrentWeek(today, plan.weeks);
  const phase = currentPhase(week, plan.phases);
  const daysOut = daysToRace(today, plan.race);
  return `${timeOfDayGreeting(today)}. You're ${daysOut} days out, week ${week.num} of ${phase.short.toLowerCase()} — ${weekStatusLine(
    week,
  )}. Ask me about today, your paces, or the week ahead.`;
}
