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
import type { GuideEntry } from './sessionGuides';
import type { CompletionEntry, Day, ReadinessEntry, StravaActivity, Week } from '../types';

interface GuideSummary {
  label: string;
  what: string;
  why: string;
  feel: string;
  execute: string[];
  mistake: string;
}

function guideSummary(day: Day, guide: Record<string, GuideEntry>): GuideSummary[] {
  return guideEntriesForDay(day, guide).map(({ label, what, why, feel, execute, mistake }) => ({
    label,
    what,
    why,
    feel,
    execute,
    mistake,
  }));
}

export interface CoachContext {
  /** Today's date (local), so the coach can anchor "today"/"yesterday"/recency —
   *  the only temporal anchor in general mode, where there's no race countdown. */
  todayDate: string;    // YYYY-MM-DD
  todayWeekday: string; // e.g. 'Monday'
  /** null in general-fitness mode — the athlete is not training for a race. */
  race: { name: string; date: string; goalTime: string; goalPace: string } | null;
  mode: string;
  /** goal pace anchoring the zones (race pace, or a target pace in general mode). */
  goalPace: string;
  week: { num: string; phase: string; daysOut: number | null; targetKm: number; doneKm: number };
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
  /** Actual logged runs from Strava over the last 30 days, most recent first — real
   *  pace/HR/distance, not just the plan. `daysAgo` is relative to `today` (0 = today,
   *  1 = yesterday) so the coach can judge recency. */
  recentRuns: { date: string; daysAgo: number; distanceKm: number; avgPaceMinKm: number; avgHR?: number }[];
  /** The whole plan as a lightweight skeleton (no per-session guide text) so the coach can
   *  locate any day/week by date — today's + near-term sessions still carry full guide detail
   *  in `today`/`upcoming`. */
  fullPlan: {
    weeks: {
      id: string;
      label: string;
      num: string;
      phase: number;
      targetKm: number;
      cutback?: boolean;
      peak?: boolean;
      race?: boolean;
      days: { date: string; weekday: string; type: string; title: string; km?: number; pace?: string }[];
    }[];
  };
  /** Completed km per week for the last few weeks (oldest first) plus this week — use for volume-trend questions ("how has my training been going the last few weeks"). */
  recentWeeks: { label: string; kmDone: number; targetKm: number }[];
  stravaConnected: boolean;
}

function weekdayShort(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole calendar days between a YYYY-MM-DD run date and today (0 = today, 1 = yesterday). */
function daysAgoFrom(today: Date, dateStr: string): number {
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(`${dateStr}T00:00:00`);
  const dd = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((t - dd) / 86_400_000);
}

function upcomingDays(today: Date, weeks: Week[], guide: Record<string, GuideEntry>, count = 10, guideDepth = 4) {
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
      ...(i < guideDepth ? { guide: guideSummary(d, guide) } : {}),
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

  const isRace = plan.isRace;
  return {
    todayDate: localDateStr(today),
    todayWeekday: today.toLocaleDateString('en-US', { weekday: 'long' }),
    race: isRace
      ? { name: race.name, date: race.date, goalTime: race.goalTime, goalPace: race.goalPace }
      : null,
    mode: plan.mode,
    goalPace: race.goalPace,
    week: {
      num: week.num,
      phase: phase.name,
      daysOut: isRace ? daysToRace(today, race) : null,
      targetKm: week.targetKm,
      doneKm: weeklyKmDone(week, completion),
    },
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
          guide: guideSummary(todaySession, plan.sessionGuide),
          readinessAdjustment: readinessAdjustment(r.score),
        }
      : null,
    upcoming: upcomingDays(today, weeks, plan.sessionGuide),
    recentRuns: activities
      .filter((a) => daysAgoFrom(today, a.date) <= 30)
      .map((a) => ({
        date: a.date,
        daysAgo: daysAgoFrom(today, a.date),
        distanceKm: a.distanceKm,
        avgPaceMinKm: a.avgPaceMinKm,
        avgHR: a.avgHR,
      })),
    fullPlan: {
      weeks: weeks
        .filter((w) => w.phase !== 0)
        .map((w) => ({
          id: w.id,
          label: w.label,
          num: w.num,
          phase: w.phase,
          targetKm: w.targetKm,
          ...(w.cutback && { cutback: true }),
          ...(w.peak && { peak: true }),
          ...(w.race && { race: true }),
          days: w.days.map((d) => ({
            date: d.date,
            weekday: weekdayShort(d.date),
            type: d.type,
            title: d.title,
            ...(d.km != null && { km: d.km }),
            ...(d.pace && { pace: d.pace }),
          })),
        })),
    },
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
  if (!plan.isRace) {
    return `${timeOfDayGreeting(today)}. Week ${week.num} of your block, ${phase.short.toLowerCase()} work — ${weekStatusLine(
      week,
    )}. Ask me about today, your paces, or the week ahead.`;
  }
  const daysOut = daysToRace(today, plan.race);
  return `${timeOfDayGreeting(today)}. You're ${daysOut} days out, week ${week.num} of ${phase.short.toLowerCase()} — ${weekStatusLine(
    week,
  )}. Ask me about today, your paces, or the week ahead.`;
}
