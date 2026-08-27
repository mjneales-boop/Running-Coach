export type ExerciseUnit = 'kg' | 'bodyweight' | 'time' | 'check';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'calves' | 'core';

export const MUSCLE_GROUPS: MuscleGroup[] = ['legs', 'chest', 'back', 'shoulders', 'arms', 'calves', 'core'];

/** Fallback for any exercise that slipped through tagging — never crash, just bucket it. */
export const DEFAULT_MUSCLES: MuscleGroup[] = ['core'];

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  unit: ExerciseUnit;
  tracked: boolean;
  /** Primary muscle first — tonnage is attributed to `muscles[0]` so groups never double-count. */
  muscles?: MuscleGroup[];
  note?: string;
  locked?: boolean;
}

/**
 * Default rest between sets, in seconds, keyed by workout.
 *
 * Owner-set: 90s for upper-body days, 2:30 for legs — heavy compound leg work
 * needs the longer recovery, and a timer that nags after 90s would just get
 * skipped. Per-exercise overrides are a later concern; this is the starting value.
 */
export const REST_DEFAULT_SEC: Record<string, number> = {
  chestback: 90,
  shouldersarms: 90,
  legs: 150,
};

export const REST_FALLBACK_SEC = 90;

export function restDefaultFor(workoutId: string | undefined): number {
  return (workoutId && REST_DEFAULT_SEC[workoutId]) || REST_FALLBACK_SEC;
}

/**
 * Stepper increments.
 *
 * 1.25 kg rather than 2.5: gym equipment does not agree on a single jump —
 * dumbbells tend to move in 2s or 2.5s, cable stacks in 5s with 1.25 add-ons,
 * machines in whatever the manufacturer chose. A small base increment can reach
 * all of them, and long-press repeat covers the distance when the jump is large.
 */
export const WEIGHT_STEP_KG = 1.25;
export const REPS_STEP = 1;
export const TIME_STEP_SEC = 10;

export interface WorkoutBlock {
  name: string;
  exercises: Exercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  blocks: WorkoutBlock[];
  alternatives: Exercise[];
}

export const WORKOUTS: Record<string, WorkoutTemplate> = {
  chestback: {
    id: 'chestback',
    name: 'Chest / Back',
    blocks: [
      {
        name: 'Main',
        exercises: [
          { id: 'incline-smith-machine', name: 'Incline Smith Machine',   sets: 4, reps: '8–12', unit: 'kg', muscles: ['chest'], tracked: true },
          { id: 'db-bench',             name: 'DB Bench Press',           sets: 4, reps: '8–12', unit: 'kg', muscles: ['chest'], tracked: true },
          { id: 'pec-deck',             name: 'Pec-Deck',                 sets: 4, reps: '8–12', unit: 'kg', muscles: ['chest'], tracked: true },
          { id: 'lat-pulldown',         name: 'Lat Pulldown',             sets: 4, reps: '8–12', unit: 'kg', muscles: ['back'], tracked: true },
          { id: 'seated-cable-row',     name: 'Seated Cable Row',         sets: 4, reps: '8–12', unit: 'kg', muscles: ['back'], tracked: true },
          { id: 'chest-sup-row',        name: 'Chest-Supported Row',      sets: 4, reps: '8–12', unit: 'kg', muscles: ['back'], tracked: true },
        ],
      },
      {
        name: 'Abs',
        exercises: [
          { id: 'cable-crunch', name: 'Cable Crunches', sets: 3, reps: '12–15', unit: 'kg', muscles: ['core'], tracked: true },
        ],
      },
    ],
    alternatives: [
      { id: 'bb-bench',          name: 'Barbell Bench Press',       sets: 4, reps: '8–12', unit: 'kg', muscles: ['chest'],        tracked: true },
      { id: 'bent-row',          name: 'Bent-Over Row',             sets: 4, reps: '8–12', unit: 'kg', muscles: ['back'],        tracked: true },
      { id: 'incline-db-bench',  name: 'Incline DB Bench Press',    sets: 4, reps: '8–12', unit: 'kg', muscles: ['chest'],        tracked: true },
      { id: 'cable-fly',         name: 'Cable Flys',                sets: 4, reps: '8–12', unit: 'kg', muscles: ['chest'],        tracked: true },
      { id: 'dumbbell-row',      name: 'Dumbbell Row',              sets: 4, reps: '8–12', unit: 'kg', muscles: ['back'],        tracked: true },
      { id: 'pullups',           name: 'Pull-ups / Chin-ups',       sets: 3, reps: '6–10', unit: 'bodyweight', muscles: ['back'], tracked: true },
      { id: 'machine-chest-press', name: 'Machine Chest Press',     sets: 4, reps: '8–12', unit: 'kg', muscles: ['chest'],        tracked: true },
      { id: 'face-pull',         name: 'Face Pulls',                sets: 3, reps: '15',   unit: 'kg', muscles: ['back', 'shoulders'],        tracked: false },
    ],
  },

  shouldersarms: {
    id: 'shouldersarms',
    name: 'Shoulders / Arms',
    blocks: [
      {
        name: 'Main',
        exercises: [
          { id: 'db-shoulder-press',   name: 'DB Shoulder Press',          sets: 4, reps: '8–12', unit: 'kg', muscles: ['shoulders'], tracked: true },
          { id: 'db-lat-raise',        name: 'DB Lateral Raises',          sets: 4, reps: '8–12', unit: 'kg', muscles: ['shoulders'], tracked: true },
          { id: 'tricep-bar-pushdown', name: 'Tricep Bar Pushdown',        sets: 4, reps: '8–12', unit: 'kg', muscles: ['arms'], tracked: true },
          { id: 'bicep-curl',          name: 'Bicep Curls',                sets: 4, reps: '8–12', unit: 'kg', muscles: ['arms'], tracked: true },
          { id: 'sa-tricep-pushdown',  name: 'Single-Arm Tricep Pushdown', sets: 4, reps: '8–12', unit: 'kg', muscles: ['arms'], tracked: true },
          { id: 'preacher-curl',       name: 'Preacher Curls',             sets: 4, reps: '8–12', unit: 'kg', muscles: ['arms'], tracked: true },
        ],
      },
      {
        name: 'Abs',
        exercises: [
          { id: 'cable-crunch', name: 'Cable Crunches', sets: 3, reps: '12–15', unit: 'kg', muscles: ['core'], tracked: true },
        ],
      },
    ],
    alternatives: [
      { id: 'cable-lat-raise',       name: 'Cable Lateral Raises',       sets: 4, reps: '8–12', unit: 'kg', muscles: ['shoulders'], tracked: true },
      { id: 'cable-bar-bicep-curls', name: 'Cable Bar Bicep Curls',      sets: 4, reps: '8–12', unit: 'kg', muscles: ['arms'], tracked: true },
      { id: 'overhead-tricep-ext',   name: 'Overhead Tricep Extension',  sets: 4, reps: '8–12', unit: 'kg', muscles: ['arms'], tracked: true },
    ],
  },

  legs: {
    id: 'legs',
    name: 'Leg Day',
    blocks: [
      {
        name: 'Warm-up',
        exercises: [
          { id: 'adductor-machine', name: 'Adductor Machine', sets: 2, reps: '12–15', unit: 'kg', muscles: ['legs'], tracked: true, note: 'Light. Controlled squeeze, prep the inner thighs.' },
          { id: 'abductor-machine', name: 'Abductor Machine', sets: 2, reps: '12–15', unit: 'kg', muscles: ['legs'], tracked: true, note: 'Light. Controlled, fire up the glutes/hips.' },
        ],
      },
      {
        name: 'Mobility Prep',
        exercises: [
          { id: 'runners-lunge', name: "Runner's Lunge w/ Rotation",  sets: 2, reps: '5/side', unit: 'check', muscles: ['legs'], tracked: false, note: 'Pelvis tucked, glutes on, ribs down. Rotate toward front leg.' },
          { id: 'ankle-rockers', name: 'Ankle Rockers (3 directions)', sets: 1, reps: '8 each', unit: 'check', muscles: ['calves'], tracked: false, note: 'Forward / inside / outside. Heel down, pause at end.' },
        ],
      },
      {
        name: 'Strength',
        exercises: [
          { id: 'squat',     name: 'Squat',                        sets: 4, reps: '≤6',       unit: 'kg', muscles: ['legs'], tracked: true, note: 'Heavy, low rep. Full depth, brace hard, controlled descent.' },
          { id: 'sl-rdl',    name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '6–8/leg',  unit: 'kg', muscles: ['legs'], tracked: true, note: 'Opposite-hand load, hips square, slow control.' },
          { id: 'bulgarian', name: 'Bulgarian Split Squat',        sets: 3, reps: '6–8/leg',  unit: 'kg', muscles: ['legs'], tracked: true, note: 'Slow descent + pause, upright torso, glutes active.' },
          { id: 'hip-thrust', name: 'Hip Thrust',                  sets: 3, reps: '6–8',      unit: 'kg', muscles: ['legs'], tracked: true, note: 'Full lockout, ribs down, pause at top.' },
        ],
      },
      {
        name: 'Lower Leg & Stability',
        exercises: [
          { id: 'calf-raise',   name: 'Calf Raises (slow eccentric)', sets: 3, reps: '8',       unit: 'kg', muscles: ['calves'],         tracked: true,  note: '3s lower. Builds lower-leg resilience for running.' },
          { id: 'march-bridge', name: 'Marching Glute Bridge',        sets: 2, reps: '12 total', unit: 'bodyweight', muscles: ['legs', 'core'], tracked: false, note: 'Keep hips level.' },
        ],
      },
      {
        name: 'Abs',
        exercises: [
          { id: 'cable-crunch',     name: 'Cable Crunches',    sets: 3, reps: '12–15', unit: 'kg', muscles: ['core'],         tracked: true },
        ],
      },
      {
        name: 'Cooldown',
        exercises: [
          { id: 'leg-stretch', name: 'Light stretch (hips, glutes, calves)', sets: 1, reps: '5–10 min', unit: 'check', muscles: ['legs'], tracked: false },
        ],
      },
    ],
    alternatives: [
      { id: 'goblet-squat',   name: 'Goblet Squat',          sets: 3, reps: '8–12',     unit: 'kg', muscles: ['legs'], tracked: true },
      { id: 'leg-press',      name: 'Leg Press',             sets: 3, reps: '10–15',    unit: 'kg', muscles: ['legs'], tracked: true },
      { id: 'barbell-squat',  name: 'Barbell Squat',         sets: 4, reps: '6–10',     unit: 'kg', muscles: ['legs'], tracked: true },
      { id: 'db-rdl',         name: 'DB Romanian Deadlift',  sets: 3, reps: '8–12/leg', unit: 'kg', muscles: ['legs'], tracked: true },
    ],
  },
};
