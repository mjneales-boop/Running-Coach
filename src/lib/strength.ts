import type { SetLog, WorkoutLog } from '../types';

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
