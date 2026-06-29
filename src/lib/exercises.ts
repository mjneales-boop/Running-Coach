import { WORKOUTS } from '../constants/workouts';
import type { Exercise } from '../constants/workouts';

/** All exercises for a workout (defaults + alternatives) keyed by id. */
export function getAllExercises(workoutId: string): Record<string, Exercise> {
  const template = WORKOUTS[workoutId];
  if (!template) return {};
  const all: Record<string, Exercise> = {};
  for (const block of template.blocks) {
    for (const ex of block.exercises) {
      all[ex.id] = ex;
    }
  }
  for (const ex of template.alternatives) {
    all[ex.id] = ex;
  }
  return all;
}

/** Default flat exercise list for a workout (blocks flattened, no override). */
export function getDefaultExercises(workoutId: string): Exercise[] {
  const template = WORKOUTS[workoutId];
  if (!template) return [];
  return template.blocks.flatMap((b) => b.exercises);
}

/**
 * Returns the ordered Exercise[] for a session.
 * Uses overrideIds when provided, otherwise returns the template default flat list.
 */
export function getSessionExercises(workoutId: string, overrideIds: string[] | null): Exercise[] {
  if (!overrideIds) return getDefaultExercises(workoutId);
  const all = getAllExercises(workoutId);
  return overrideIds.map((id) => all[id]).filter((ex): ex is Exercise => !!ex);
}
