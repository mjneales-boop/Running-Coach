import { WORKOUTS, DEFAULT_MUSCLES, MUSCLE_GROUPS } from '../constants/workouts';
import type { Exercise, MuscleGroup } from '../constants/workouts';
import { getDefaultExercises } from './exercises';
import { weeklyKmDone } from './logic';
import type { CompletionEntry, SetLog, Week, WorkoutLog } from '../types';

// ---------------------------------------------------------------------------
// Exercise catalog
// ---------------------------------------------------------------------------

// WORKOUTS is a static module constant, so the flattened lookup can be built once
// for the lifetime of the module. The old per-call linear scan ran once per
// exercise per render.
let catalogCache: Map<string, Exercise> | null = null;

function catalog(): Map<string, Exercise> {
  if (catalogCache) return catalogCache;
  const map = new Map<string, Exercise>();
  for (const workout of Object.values(WORKOUTS)) {
    for (const block of workout.blocks) {
      for (const ex of block.exercises) map.set(ex.id, ex);
    }
    for (const ex of workout.alternatives) map.set(ex.id, ex);
  }
  catalogCache = map;
  return map;
}

export function lookupExercise(exerciseId: string): Exercise | undefined {
  return catalog().get(exerciseId);
}

function exerciseName(exerciseId: string): string {
  return catalog().get(exerciseId)?.name ?? exerciseId;
}

export function musclesFor(exerciseId: string): MuscleGroup[] {
  const tagged = catalog().get(exerciseId)?.muscles;
  return tagged && tagged.length > 0 ? tagged : DEFAULT_MUSCLES;
}

/** Tonnage is attributed here and only here, so a two-muscle lift never double-counts. */
export function primaryMuscle(exerciseId: string): MuscleGroup {
  return musclesFor(exerciseId)[0];
}

export function lastWorkoutLog(
  strength: Record<string, WorkoutLog>,
  workoutId: string,
  beforeDate: string,
): WorkoutLog | undefined {
  return Object.values(strength)
    .filter((l) => l.workoutId === workoutId && l.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function topSet(log: WorkoutLog, exerciseId: string): SetLog | undefined {
  const sets = log.exercises[exerciseId] ?? [];
  return sets.filter((s) => s.weight != null).sort((a, b) => (b.weight! - a.weight!))[0];
}

export function est1RM(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

export function allTimePR(strength: Record<string, WorkoutLog>, exerciseId: string): SetLog | undefined {
  let best: SetLog | undefined;
  for (const log of Object.values(strength)) {
    const set = topSet(log, exerciseId);
    if (set?.weight != null && (best?.weight == null || set.weight > best.weight)) {
      best = set;
    }
  }
  return best;
}

export function recentLogsSummary(
  strength: Record<string, WorkoutLog>,
  exerciseId: string,
  beforeDate: string,
  days = 30,
): { date: string; summary: string }[] {
  const cutoff = new Date(`${beforeDate}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return Object.values(strength)
    .filter((log) => log.date < beforeDate && log.date >= cutoffStr)
    .map((log) => {
      const sets = (log.exercises[exerciseId] ?? []).filter((s) => s.weight != null && s.reps != null);
      if (!sets.length) return null;
      return { date: log.date, summary: sets.map((s) => `${s.weight}×${s.reps}`).join(' · ') };
    })
    .filter((x): x is { date: string; summary: string } => x !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface TopLift {
  exerciseId: string;
  name: string;
  weight: number;
  delta?: number;
}

/** Top-weight exercises with a logged set inside the last `days`, ranked by current weight. */
export function topLifts(
  strength: Record<string, WorkoutLog>,
  beforeDate: string,
  days = 30,
  limit = 3,
): TopLift[] {
  const cutoff = new Date(`${beforeDate}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const byExercise = new Map<string, { date: string; weight: number }[]>();
  for (const log of Object.values(strength)) {
    if (log.date > beforeDate) continue;
    for (const exerciseId of Object.keys(log.exercises)) {
      const set = topSet(log, exerciseId);
      if (set?.weight == null) continue;
      const list = byExercise.get(exerciseId) ?? [];
      list.push({ date: log.date, weight: set.weight });
      byExercise.set(exerciseId, list);
    }
  }

  const lifts: TopLift[] = [];
  for (const [exerciseId, entries] of byExercise) {
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const last = entries[entries.length - 1];
    if (last.date < cutoffStr) continue;
    const prev = entries[entries.length - 2];
    lifts.push({
      exerciseId,
      name: exerciseName(exerciseId),
      weight: last.weight,
      // Rounded at source: plate weights are decimals (68.2 - 78 = -9.79999999999999
      // in binary floating point), and every consumer wants the same 0.1 kg precision.
      delta: prev ? Math.round((last.weight - prev.weight) * 10) / 10 : undefined,
    });
  }

  return lifts.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

export function progressionSeries(
  strength: Record<string, WorkoutLog>,
  exerciseId: string,
  metric: 'topSet' | 'est1RM' = 'topSet',
): { date: string; value: number }[] {
  return Object.values(strength)
    .map((log) => {
      const top = topSet(log, exerciseId);
      if (!top?.weight) return null;
      const value = metric === 'est1RM' && top.reps ? est1RM(top.weight, top.reps) : top.weight;
      return { date: log.date, value };
    })
    .filter((x): x is { date: string; value: number } => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ===========================================================================
// Phase 0 — data & metrics layer
//
// Every function below is pure and React-free. Committed-set semantics are
// defined once, in `isCommitted`, and everything else builds on it.
// ===========================================================================

// ---------------------------------------------------------------------------
// Committed sets
// ---------------------------------------------------------------------------

/**
 * A set counts as logged once it carries any real value. `committedAt` is the
 * modern marker; logs written before that field existed only ever have
 * weight/reps/done, and must keep counting.
 */
export function isCommitted(set: SetLog | undefined | null): boolean {
  if (!set) return false;
  return (
    set.committedAt != null ||
    set.weight != null ||
    set.reps != null ||
    set.seconds != null ||
    set.done === true
  );
}

function dateToEpoch(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

/** Commit time of a set, falling back to midnight on the log's date for legacy sets. */
export function committedAtOf(set: SetLog, logDate: string): number {
  return set.committedAt ?? dateToEpoch(logDate);
}

/** Committed sets of one exercise within one log, in set-index order. */
export function committedSets(log: WorkoutLog | undefined, exerciseId: string): SetLog[] {
  return (log?.exercises[exerciseId] ?? []).filter(isCommitted);
}

/** kg × reps for one set. Non-`kg` units contribute zero tonnage by definition. */
export function setTonnage(exerciseId: string, set: SetLog): number {
  if (lookupExercise(exerciseId)?.unit !== 'kg') return 0;
  if (set.weight == null || set.reps == null) return 0;
  return set.weight * set.reps;
}

/** True when `a` is the heavier/harder set. Weight leads, reps break the tie. */
function beats(a: SetLog, b: SetLog | undefined): boolean {
  if (!b) return true;
  const aw = a.weight ?? 0;
  const bw = b.weight ?? 0;
  if (aw !== bw) return aw > bw;
  return (a.reps ?? 0) > (b.reps ?? 0);
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export interface ExerciseSession {
  date: string;
  workoutId: string;
  /** Committed sets only, in set-index order. */
  sets: SetLog[];
  topSet?: SetLog;
  tonnage: number;
}

export interface StrengthIndex {
  /** Every log, ascending by date. */
  logs: WorkoutLog[];
  /** workoutId → that workout's logs, ascending by date. */
  byWorkout: Map<string, WorkoutLog[]>;
  /** exerciseId → one entry per session it appeared in, ascending by date. */
  byExercise: Map<string, ExerciseSession[]>;
  /** exerciseId → all-time best set and the date it was set. */
  prByExercise: Map<string, { set: SetLog; date: string }>;
}

/**
 * One pass over the store, producing every lookup the Strength tab needs.
 * Replaces the old pattern of calling `allTimePR` once per exercise per render,
 * which was O(logs × exercises) on every single render.
 */
export function buildStrengthIndex(strength: Record<string, WorkoutLog>): StrengthIndex {
  const logs = Object.values(strength)
    .filter((l): l is WorkoutLog => !!l && typeof l.date === 'string')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const byWorkout = new Map<string, WorkoutLog[]>();
  const byExercise = new Map<string, ExerciseSession[]>();
  const prByExercise = new Map<string, { set: SetLog; date: string }>();

  for (const log of logs) {
    const wl = byWorkout.get(log.workoutId);
    if (wl) wl.push(log);
    else byWorkout.set(log.workoutId, [log]);

    for (const [exerciseId, rawSets] of Object.entries(log.exercises ?? {})) {
      const sets = (rawSets ?? []).filter(isCommitted);
      if (sets.length === 0) continue;

      let topSet: SetLog | undefined;
      let tonnage = 0;
      for (const set of sets) {
        if (beats(set, topSet)) topSet = set;
        tonnage += setTonnage(exerciseId, set);
      }

      const entry: ExerciseSession = { date: log.date, workoutId: log.workoutId, sets, topSet, tonnage };
      const list = byExercise.get(exerciseId);
      if (list) list.push(entry);
      else byExercise.set(exerciseId, [entry]);

      // `logs` is date-ascending, so the first set to reach a given standard wins
      // the PR — a later session matching it exactly does not steal the date.
      if (topSet && beats(topSet, prByExercise.get(exerciseId)?.set)) {
        prByExercise.set(exerciseId, { set: topSet, date: log.date });
      }
    }
  }

  return { logs, byWorkout, byExercise, prByExercise };
}

/**
 * Committed sets from the most recent session of `exerciseId` strictly before
 * `beforeDate`. This is what ghost prefill renders — pass today's date while
 * logging and today's own sets are correctly excluded.
 */
export function lastSessionSets(index: StrengthIndex, exerciseId: string, beforeDate: string): SetLog[] {
  const history = index.byExercise.get(exerciseId);
  if (!history) return [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].date < beforeDate) return history[i].sets;
  }
  return [];
}

/** The whole previous session entry, when the caller needs its date or tonnage too. */
export function lastExerciseSession(
  index: StrengthIndex,
  exerciseId: string,
  beforeDate: string,
): ExerciseSession | undefined {
  const history = index.byExercise.get(exerciseId);
  if (!history) return undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].date < beforeDate) return history[i];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Session-level
// ---------------------------------------------------------------------------

/** Σ (weight × reps) over committed `kg` sets. Bodyweight/time/check contribute nothing. */
export function sessionTonnage(log: WorkoutLog | undefined): number {
  if (!log) return 0;
  let total = 0;
  for (const [exerciseId, sets] of Object.entries(log.exercises ?? {})) {
    for (const set of sets ?? []) {
      if (isCommitted(set)) total += setTonnage(exerciseId, set);
    }
  }
  return Math.round(total * 10) / 10;
}

/**
 * Sets committed vs sets planned. `exercises` overrides the template list for
 * sessions where the athlete swapped lifts; without it the workout default is used.
 * `committed` can legitimately exceed `planned` when extra sets are added.
 */
export function sessionSetCount(
  log: WorkoutLog | undefined,
  exercises?: Exercise[],
): { committed: number; planned: number } {
  const list = exercises ?? (log ? getDefaultExercises(log.workoutId) : []);
  const planned = list.reduce((sum, ex) => sum + (ex.sets || 0), 0);

  let committed = 0;
  if (log) {
    for (const sets of Object.values(log.exercises ?? {})) {
      for (const set of sets ?? []) if (isCommitted(set)) committed++;
    }
  }
  return { committed, planned };
}

/**
 * Elapsed minutes from first to last commit. Undefined unless at least two sets
 * carry a real `committedAt` — legacy logs all share a midnight timestamp and
 * would otherwise report a fake zero-minute session.
 */
export function sessionDurationMin(log: WorkoutLog | undefined): number | undefined {
  if (!log) return undefined;
  const stamps: number[] = [];
  for (const sets of Object.values(log.exercises ?? {})) {
    for (const set of sets ?? []) {
      if (set?.committedAt != null) stamps.push(set.committedAt);
    }
  }
  if (stamps.length < 2) return undefined;
  const span = Math.max(...stamps) - Math.min(...stamps);
  return Math.max(1, Math.round(span / 60000));
}

/** This session's tonnage against the previous session of the same workout. */
export function compareToLastSession(
  index: StrengthIndex,
  workoutId: string,
  date: string,
): { tonnageDelta: number; pct: number } | null {
  const history = index.byWorkout.get(workoutId);
  if (!history) return null;

  const current = history.find((l) => l.date === date);
  if (!current) return null;

  let previous: WorkoutLog | undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].date < date) { previous = history[i]; break; }
  }
  if (!previous) return null;

  const prevTonnage = sessionTonnage(previous);
  if (prevTonnage <= 0) return null;

  const delta = sessionTonnage(current) - prevTonnage;
  return {
    tonnageDelta: Math.round(delta * 10) / 10,
    pct: Math.round((delta / prevTonnage) * 1000) / 10,
  };
}

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

export type WeekAdherenceStatus = 'complete' | 'partial' | 'skipped' | 'missed' | 'future';

export interface WeekAdherence {
  weekId: string;
  label: string;
  num: string;
  dateStart: string;
  dateEnd: string;
  /** Gym sessions the plan scheduled for this week. */
  planned: number;
  completed: number;
  /** Deliberately stood down for recovery. Counts as honoured, not missed. */
  skipped: number;
  status: WeekAdherenceStatus;
  isCurrent: boolean;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A gym session was logged if it was marked complete or has at least one committed set. */
function sessionWasLogged(log: WorkoutLog | undefined): boolean {
  if (!log) return false;
  if (log.completedAt) return true;
  for (const sets of Object.values(log.exercises ?? {})) {
    for (const set of sets ?? []) if (isCommitted(set)) return true;
  }
  return false;
}

function sessionWasSkipped(log: WorkoutLog | undefined): boolean {
  return !!log?.skippedAt;
}

/**
 * Per-week gym adherence, plan-relative: a week is complete when every gym
 * session the plan scheduled for *that* week was honoured. A cutback week with
 * one gym day is satisfied by one session — never a fixed "3 sessions" bar.
 *
 * The in-flight week is never marked `missed`; it reports `partial` until it ends.
 *
 * The strength store is the only evidence accepted. The run-completion store is
 * deliberately *not* consulted: most gym days are also easy-run days, and ticking
 * that day done means the run happened, not the lifting. Counting it would
 * silently inflate the streak, and an inflated consistency number is worse than
 * a small one.
 */
export function weeklyGymAdherence(
  weeks: Week[],
  strength: Record<string, WorkoutLog>,
  todayStr: string = localToday(),
): WeekAdherence[] {
  return weeks.map((week) => {
    const gymDays = week.days.filter((d) => !!d.gym);
    let completed = 0;
    let skipped = 0;

    for (const day of gymDays) {
      const log = strength[day.date];
      if (sessionWasSkipped(log)) skipped++;
      else if (sessionWasLogged(log)) completed++;
    }

    const isCurrent = week.dateStart <= todayStr && week.dateEnd >= todayStr;
    const planned = gymDays.length;

    let status: WeekAdherenceStatus;
    if (week.dateStart > todayStr) status = 'future';
    else if (planned === 0) status = 'complete'; // vacuously honoured — nothing was asked
    else if (completed + skipped >= planned) status = skipped > 0 ? 'skipped' : 'complete';
    else if (isCurrent) status = 'partial';
    else status = completed > 0 ? 'partial' : 'missed';

    return {
      weekId: week.id,
      label: week.label,
      num: week.num,
      dateStart: week.dateStart,
      dateEnd: week.dateEnd,
      planned,
      completed,
      skipped,
      status,
      isCurrent,
    };
  });
}

/**
 * Consecutive honoured weeks, counting back from the most recent one.
 *
 * A recovery skip does not break the streak — that is the whole point. Future
 * weeks are ignored, and an in-flight week is only ever additive: it extends the
 * streak once complete and is passed over silently until then, so nothing about
 * this number creates pressure to train mid-week.
 */
export function currentStreak(adherence: WeekAdherence[]): number {
  let streak = 0;
  for (let i = adherence.length - 1; i >= 0; i--) {
    const week = adherence[i];
    if (week.status === 'future') continue;
    if (week.status === 'complete' || week.status === 'skipped') { streak++; continue; }
    if (week.isCurrent) continue; // still running — cannot be judged yet
    break;
  }
  return streak;
}

export interface ConsistencySummary {
  streak: number;
  sessionsDone: number;
  sessionsPlanned: number;
  /** Percent of scheduled gym sessions honoured, over settled weeks only. */
  pctOfPlanned: number;
}

/** The three hero numbers of the CONSISTENCY block. Skips count as honoured. */
export function consistencySummary(adherence: WeekAdherence[]): ConsistencySummary {
  let done = 0;
  let planned = 0;
  for (const week of adherence) {
    if (week.status === 'future') continue;
    done += week.completed + week.skipped;
    planned += week.planned;
  }
  return {
    streak: currentStreak(adherence),
    sessionsDone: done,
    sessionsPlanned: planned,
    pctOfPlanned: planned > 0 ? Math.round((done / planned) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// Volume
// ---------------------------------------------------------------------------

function emptyMuscleTotals(): Record<MuscleGroup, number> {
  const totals = {} as Record<MuscleGroup, number>;
  for (const group of MUSCLE_GROUPS) totals[group] = 0;
  return totals;
}

/**
 * Tonnage per muscle group over an inclusive date range. Each lift's tonnage
 * lands entirely on its primary muscle, so the groups sum to session tonnage
 * rather than inflating it.
 */
export function tonnageByMuscleGroup(
  strength: Record<string, WorkoutLog>,
  from: string,
  to: string,
): Record<MuscleGroup, number> {
  const totals = emptyMuscleTotals();
  for (const log of Object.values(strength)) {
    if (!log || log.date < from || log.date > to) continue;
    for (const [exerciseId, sets] of Object.entries(log.exercises ?? {})) {
      const group = primaryMuscle(exerciseId);
      for (const set of sets ?? []) {
        if (isCommitted(set)) totals[group] += setTonnage(exerciseId, set);
      }
    }
  }
  for (const group of MUSCLE_GROUPS) totals[group] = Math.round(totals[group] * 10) / 10;
  return totals;
}

export interface TonnagePoint {
  weekId: string;
  label: string;
  num: string;
  dateStart: string;
  /** Kilograms lifted. The chart divides by 1000 for the tonne readout. */
  tonnage: number;
  /**
   * Committed sets in the week — includes bodyweight/time/check sets, which
   * carry no tonnage. Surfaced so the UI can footnote the difference rather
   * than silently fudging it.
   */
  sets: number;
  isCurrent: boolean;
  isFuture: boolean;
}

/** Weekly tonnage bucketed by plan week, optionally narrowed to one muscle group. */
export function weeklyTonnageSeries(
  strength: Record<string, WorkoutLog>,
  weeks: Week[],
  muscle?: MuscleGroup,
  todayStr: string = localToday(),
): TonnagePoint[] {
  const logs = Object.values(strength).filter((l): l is WorkoutLog => !!l?.date);

  return weeks.map((week) => {
    let tonnage = 0;
    let sets = 0;

    for (const log of logs) {
      if (log.date < week.dateStart || log.date > week.dateEnd) continue;
      for (const [exerciseId, setList] of Object.entries(log.exercises ?? {})) {
        if (muscle && primaryMuscle(exerciseId) !== muscle) continue;
        for (const set of setList ?? []) {
          if (!isCommitted(set)) continue;
          sets++;
          tonnage += setTonnage(exerciseId, set);
        }
      }
    }

    return {
      weekId: week.id,
      label: week.label,
      num: week.num,
      dateStart: week.dateStart,
      tonnage: Math.round(tonnage * 10) / 10,
      sets,
      isCurrent: week.dateStart <= todayStr && week.dateEnd >= todayStr,
      isFuture: week.dateStart > todayStr,
    };
  });
}

// ---------------------------------------------------------------------------
// Durability — gym ↔ run linkage
//
// Deliberately correlation-free. These functions report what happened; they do
// not model causation, and no consumer of them may claim lifting caused a
// running improvement. The sample size does not support it.
// ---------------------------------------------------------------------------

export interface DurabilityPoint {
  weekId: string;
  label: string;
  num: string;
  /** Kilometres actually run. */
  km: number;
  gymPlanned: number;
  gymDone: number;
  /** Every scheduled gym session honoured (completed or stood down for recovery). */
  fullGym: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

export function strengthVsVolume(
  weeks: Week[],
  strength: Record<string, WorkoutLog>,
  completion: Record<string, CompletionEntry>,
  todayStr: string = localToday(),
): DurabilityPoint[] {
  const adherence = weeklyGymAdherence(weeks, strength, todayStr);

  return weeks.map((week, i) => {
    const a = adherence[i];
    const isFuture = a.status === 'future';
    return {
      weekId: week.id,
      label: week.label,
      num: week.num,
      km: isFuture ? 0 : weeklyKmDone(week, completion),
      gymPlanned: a.planned,
      gymDone: a.completed + a.skipped,
      fullGym: a.planned > 0 && a.completed + a.skipped >= a.planned,
      isCurrent: a.isCurrent,
      isFuture,
    };
  });
}

export interface DurabilitySummary {
  weeksWithFullGym: number;
  /** Settled weeks that actually scheduled gym work. */
  weeksAssessed: number;
  avgKmWithFullGym: number;
  avgKmWithoutFullGym: number;
}

/** The two honest stats under the durability chart. No coefficient, no causal claim. */
export function durabilitySummary(points: DurabilityPoint[]): DurabilitySummary {
  const settled = points.filter((p) => !p.isFuture && !p.isCurrent && p.gymPlanned > 0);
  const withGym = settled.filter((p) => p.fullGym);
  const withoutGym = settled.filter((p) => !p.fullGym);
  const avg = (list: DurabilityPoint[]) =>
    list.length ? Math.round(list.reduce((s, p) => s + p.km, 0) / list.length) : 0;

  return {
    weeksWithFullGym: withGym.length,
    weeksAssessed: settled.length,
    avgKmWithFullGym: avg(withGym),
    avgKmWithoutFullGym: avg(withoutGym),
  };
}

/**
 * Weeks containing at least one committed lower-leg set — the calf and tibialis
 * work that is the most directly running-relevant lifting in the plan.
 */
export function lowerLegInsurance(
  weeks: Week[],
  strength: Record<string, WorkoutLog>,
  todayStr: string = localToday(),
): { weeks: number; total: number } {
  const logs = Object.values(strength).filter((l): l is WorkoutLog => !!l?.date);
  const settled = weeks.filter((w) => w.dateStart <= todayStr);

  let covered = 0;
  for (const week of settled) {
    const hit = logs.some(
      (log) =>
        log.date >= week.dateStart &&
        log.date <= week.dateEnd &&
        Object.entries(log.exercises ?? {}).some(
          ([exerciseId, sets]) =>
            primaryMuscle(exerciseId) === 'calves' && (sets ?? []).some(isCommitted),
        ),
    );
    if (hit) covered++;
  }
  return { weeks: covered, total: settled.length };
}

// ---------------------------------------------------------------------------
// Set-level feedback
// ---------------------------------------------------------------------------

export type SetDeltaKind = 'up' | 'matched' | 'down' | 'first';

export interface SetDelta {
  kind: SetDeltaKind;
  /** Kilograms against the same set index last session. Undefined when there is no comparison. */
  weightDelta?: number;
  repsDelta?: number;
  /** Seconds, for `time` exercises. */
  secondsDelta?: number;
  /** Ready-to-render chip text. */
  label: string;
}

/**
 * Compares a just-committed set to the same set index last session.
 *
 * A lighter set is `down`, never an error state — deloads are training, and the
 * UI must render `down` in muted ink, never red. See the brief's §13.
 */
export function setDelta(current: SetLog, previous: SetLog | undefined): SetDelta {
  if (!previous || !isCommitted(previous)) {
    return { kind: 'first', label: 'FIRST TIME' };
  }

  const weightDelta =
    current.weight != null && previous.weight != null
      ? Math.round((current.weight - previous.weight) * 10) / 10
      : undefined;
  const repsDelta =
    current.reps != null && previous.reps != null ? current.reps - previous.reps : undefined;

  // Weight leads the chip; reps only speak when the weight is unchanged or absent
  // (bodyweight work, where reps are the only axis there is).
  const primary = weightDelta != null && weightDelta !== 0 ? weightDelta : undefined;

  if (primary != null) {
    return {
      kind: primary > 0 ? 'up' : 'down',
      weightDelta,
      repsDelta,
      label: `${primary > 0 ? '+' : '−'}${Math.abs(primary)} KG`,
    };
  }

  if (repsDelta != null && repsDelta !== 0) {
    return {
      kind: repsDelta > 0 ? 'up' : 'down',
      weightDelta,
      repsDelta,
      label: `${repsDelta > 0 ? '+' : '−'}${Math.abs(repsDelta)} REP${Math.abs(repsDelta) === 1 ? '' : 'S'}`,
    };
  }

  const secondsDelta =
    current.seconds != null && previous.seconds != null ? current.seconds - previous.seconds : undefined;
  if (secondsDelta != null && secondsDelta !== 0) {
    return {
      kind: secondsDelta > 0 ? 'up' : 'down',
      secondsDelta,
      label: `${secondsDelta > 0 ? '+' : '−'}${Math.abs(secondsDelta)}S`,
    };
  }

  return { kind: 'matched', weightDelta, repsDelta, secondsDelta, label: '= MATCHED' };
}

/**
 * Whether a set is an all-time best for the exercise.
 *
 * Pass `onDate` while logging — the set is then compared only against strictly
 * earlier sessions, so a set already written into the index does not disqualify
 * itself and two PRs in one session both register. Omitting `onDate` compares
 * against the whole index, which is what a read-only history view wants.
 */
export function isPR(
  index: StrengthIndex,
  exerciseId: string,
  set: SetLog,
  onDate?: string,
): boolean {
  if (!isCommitted(set) || (set.weight == null && set.reps == null)) return false;

  if (onDate == null) {
    const pr = index.prByExercise.get(exerciseId);
    return !pr || !beats(pr.set, set);
  }

  const history = index.byExercise.get(exerciseId) ?? [];
  for (const session of history) {
    if (session.date >= onDate) continue;
    if (session.topSet && !beats(set, session.topSet)) return false;
  }
  return true;
}

/** All-time best set per exercise, read straight off the index. */
export function prFromIndex(
  index: StrengthIndex,
  exerciseId: string,
): { set: SetLog; date: string } | undefined {
  return index.prByExercise.get(exerciseId);
}
