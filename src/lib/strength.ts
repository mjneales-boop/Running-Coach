import { WORKOUTS } from '../constants/workouts';
import type { SetLog, WorkoutLog } from '../types';

function exerciseName(exerciseId: string): string {
  for (const workout of Object.values(WORKOUTS)) {
    for (const block of workout.blocks) {
      const found = block.exercises.find((e) => e.id === exerciseId);
      if (found) return found.name;
    }
    const alt = workout.alternatives.find((e) => e.id === exerciseId);
    if (alt) return alt.name;
  }
  return exerciseId;
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
      delta: prev ? last.weight - prev.weight : undefined,
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
