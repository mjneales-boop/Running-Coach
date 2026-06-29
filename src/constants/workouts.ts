export type ExerciseUnit = 'kg' | 'bodyweight' | 'time' | 'check';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  unit: ExerciseUnit;
  tracked: boolean;
  note?: string;
  locked?: boolean;
}

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
          { id: 'incline-smith-machine', name: 'Incline Smith Machine',   sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'db-bench',             name: 'DB Bench Press',           sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'pec-deck',             name: 'Pec-Deck',                 sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'lat-pulldown',         name: 'Lat Pulldown',             sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'seated-cable-row',     name: 'Seated Cable Row',         sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'chest-sup-row',        name: 'Chest-Supported Row',      sets: 4, reps: '8–12', unit: 'kg', tracked: true },
        ],
      },
      {
        name: 'Abs',
        exercises: [
          { id: 'cable-crunch', name: 'Cable Crunches', sets: 3, reps: '12–15', unit: 'kg', tracked: true },
        ],
      },
    ],
    alternatives: [
      { id: 'bb-bench',          name: 'Barbell Bench Press',       sets: 4, reps: '8–12', unit: 'kg',        tracked: true },
      { id: 'bent-row',          name: 'Bent-Over Row',             sets: 4, reps: '8–12', unit: 'kg',        tracked: true },
      { id: 'incline-db-bench',  name: 'Incline DB Bench Press',    sets: 4, reps: '8–12', unit: 'kg',        tracked: true },
      { id: 'cable-fly',         name: 'Cable Flys',                sets: 4, reps: '8–12', unit: 'kg',        tracked: true },
      { id: 'dumbbell-row',      name: 'Dumbbell Row',              sets: 4, reps: '8–12', unit: 'kg',        tracked: true },
      { id: 'pullups',           name: 'Pull-ups / Chin-ups',       sets: 3, reps: '6–10', unit: 'bodyweight', tracked: true },
      { id: 'machine-chest-press', name: 'Machine Chest Press',     sets: 4, reps: '8–12', unit: 'kg',        tracked: true },
      { id: 'face-pull',         name: 'Face Pulls',                sets: 3, reps: '15',   unit: 'kg',        tracked: false },
    ],
  },

  shouldersarms: {
    id: 'shouldersarms',
    name: 'Shoulders / Arms',
    blocks: [
      {
        name: 'Main',
        exercises: [
          { id: 'db-shoulder-press',   name: 'DB Shoulder Press',          sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'cable-lat-raise',     name: 'Cable Lateral Raises',       sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'tricep-bar-pushdown', name: 'Tricep Bar Pushdown',        sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'bicep-curl',          name: 'Bicep Curls',                sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'sa-tricep-pushdown',  name: 'Single-Arm Tricep Pushdown', sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'preacher-curl',       name: 'Preacher Curls',             sets: 4, reps: '8–12', unit: 'kg', tracked: true },
        ],
      },
      {
        name: 'Abs',
        exercises: [
          { id: 'cable-crunch', name: 'Cable Crunches', sets: 3, reps: '12–15', unit: 'kg', tracked: true },
        ],
      },
    ],
    alternatives: [
      { id: 'cable-bar-bicep-curls', name: 'Cable Bar Bicep Curls',      sets: 4, reps: '8–12', unit: 'kg', tracked: true },
      { id: 'overhead-tricep-ext',   name: 'Overhead Tricep Extension',  sets: 4, reps: '8–12', unit: 'kg', tracked: true },
    ],
  },

  legs: {
    id: 'legs',
    name: 'Leg Day',
    blocks: [
      {
        name: 'Mobility Prep',
        exercises: [
          { id: 'runners-lunge', name: "Runner's Lunge w/ Rotation",  sets: 2, reps: '5/side', unit: 'check', tracked: false, note: 'Pelvis tucked, glutes on, ribs down. Rotate toward front leg.' },
          { id: 'ankle-rockers', name: 'Ankle Rockers (3 directions)', sets: 1, reps: '8 each', unit: 'check', tracked: false, note: 'Forward / inside / outside. Heel down, pause at end.' },
        ],
      },
      {
        name: 'Strength',
        exercises: [
          { id: 'sl-rdl',    name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '6–10/leg', unit: 'kg', tracked: true, note: 'Opposite-hand load, hips square, slow control.' },
          { id: 'bulgarian', name: 'Bulgarian Split Squat',        sets: 3, reps: '6–10/leg', unit: 'kg', tracked: true, note: 'Slow descent + pause, upright torso, glutes active.' },
          { id: 'hip-thrust', name: 'Hip Thrust',                  sets: 3, reps: '8–12',     unit: 'kg', tracked: true, note: 'Full lockout, ribs down, pause at top.' },
        ],
      },
      {
        name: 'Lower Leg & Stability',
        exercises: [
          { id: 'tib-raise',    name: 'Tibialis Raises',             sets: 3, reps: '15–20',   unit: 'kg',         tracked: true,  locked: true, note: 'MANDATORY — shin-splint insurance. Bodyweight or light plate; add load as able.' },
          { id: 'calf-raise',   name: 'Calf Raises (slow eccentric)', sets: 3, reps: '12–15',   unit: 'kg',         tracked: true,  note: '3s lower. Builds lower-leg resilience for running.' },
          { id: 'march-bridge', name: 'Marching Glute Bridge',        sets: 2, reps: '12 total', unit: 'bodyweight', tracked: false, note: 'Keep hips level.' },
        ],
      },
      {
        name: 'Abs',
        exercises: [
          { id: 'cable-crunch',     name: 'Cable Crunches',    sets: 3, reps: '12–15', unit: 'kg',         tracked: true },
          { id: 'seated-leg-raise', name: 'Seated Leg Raises', sets: 3, reps: '15–20', unit: 'bodyweight', tracked: true },
        ],
      },
      {
        name: 'Cooldown',
        exercises: [
          { id: 'leg-stretch', name: 'Light stretch (hips, glutes, calves)', sets: 1, reps: '5–10 min', unit: 'check', tracked: false },
        ],
      },
    ],
    alternatives: [
      { id: 'goblet-squat',   name: 'Goblet Squat',          sets: 3, reps: '8–12',     unit: 'kg', tracked: true },
      { id: 'leg-press',      name: 'Leg Press',             sets: 3, reps: '10–15',    unit: 'kg', tracked: true },
      { id: 'barbell-squat',  name: 'Barbell Squat',         sets: 4, reps: '6–10',     unit: 'kg', tracked: true },
      { id: 'db-rdl',         name: 'DB Romanian Deadlift',  sets: 3, reps: '8–12/leg', unit: 'kg', tracked: true },
    ],
  },
};
