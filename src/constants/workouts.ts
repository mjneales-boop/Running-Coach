export type ExerciseUnit = 'kg' | 'bodyweight' | 'time' | 'check';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  unit: ExerciseUnit;
  tracked: boolean;
  note?: string;
}

export interface WorkoutBlock {
  name: string;
  exercises: Exercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  blocks: WorkoutBlock[];
}

export const WORKOUTS: Record<string, WorkoutTemplate> = {
  chestback: {
    id: 'chestback',
    name: 'Chest / Back',
    blocks: [
      {
        name: 'Main',
        exercises: [
          { id: 'bb-bench',         name: 'Barbell Bench Press',      sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'bent-row',         name: 'Bent-Over Row',            sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'incline-db-bench', name: 'Incline DB Bench Press',   sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'lat-pulldown',     name: 'Lat Pulldown',             sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'cable-fly',        name: 'Cable Flys',               sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'chest-sup-row',    name: 'Chest-Supported Row',      sets: 4, reps: '8–12', unit: 'kg', tracked: true, note: 'Suggested 6th — isolates back without loading the lower back (good while running). Swap for pull-ups if preferred.' },
        ],
      },
      {
        name: 'Finisher (optional)',
        exercises: [
          { id: 'face-pull', name: 'Face Pulls', sets: 3, reps: '15', unit: 'kg', tracked: false, note: 'Rear delts + shoulder health for pressing. Optional.' },
        ],
      },
    ],
  },

  shouldersarms: {
    id: 'shouldersarms',
    name: 'Shoulders / Arms',
    blocks: [
      {
        name: 'Main',
        exercises: [
          { id: 'db-shoulder-press',    name: 'DB Shoulder Press',           sets: 4, reps: '8–12', unit: 'kg', tracked: true, note: 'Dumbbell by default — swap to barbell/machine if you prefer.' },
          { id: 'cable-lat-raise',      name: 'Cable Lateral Raises',        sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'tricep-bar-pushdown',  name: 'Tricep Bar Pushdown',         sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'bicep-curl',           name: 'Bicep Curls',                 sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'sa-tricep-pushdown',   name: 'Single-Arm Tricep Pushdown',  sets: 4, reps: '8–12', unit: 'kg', tracked: true },
          { id: 'preacher-curl',        name: 'Preacher Curls',              sets: 4, reps: '8–12', unit: 'kg', tracked: true },
        ],
      },
    ],
  },

  legs: {
    id: 'legs',
    name: 'Leg Day',
    blocks: [
      {
        name: 'Mobility Prep',
        exercises: [
          { id: 'runners-lunge', name: "Runner's Lunge w/ Rotation",    sets: 2, reps: '5/side',  unit: 'check', tracked: false, note: 'Pelvis tucked, glutes on, ribs down. Rotate toward front leg.' },
          { id: 'ankle-rockers', name: 'Ankle Rockers (3 directions)',   sets: 1, reps: '8 each',  unit: 'check', tracked: false, note: 'Forward / inside / outside. Heel down, pause at end.' },
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
          { id: 'tib-raise',    name: 'Tibialis Raises',              sets: 3, reps: '15–20', unit: 'kg', tracked: true, note: 'MANDATORY — shin-splint insurance. Bodyweight or light plate; add load as able.' },
          { id: 'calf-raise',   name: 'Calf Raises (slow eccentric)',  sets: 3, reps: '12–15', unit: 'kg', tracked: true, note: 'Recommended addition — 3s lower. Builds lower-leg resilience for running.' },
          { id: 'march-bridge', name: 'Marching Glute Bridge',         sets: 2, reps: '12 total', unit: 'bodyweight', tracked: false, note: 'Optional stability work from your Notion plan. Keep hips level.' },
        ],
      },
      {
        name: 'Abs',
        exercises: [
          { id: 'hang-leg-raise', name: 'Hanging Leg Raise', sets: 3, reps: '10–12',    unit: 'bodyweight', tracked: false },
          { id: 'plank',          name: 'Plank',             sets: 3, reps: '45s',       unit: 'time',       tracked: false },
          { id: 'side-plank',     name: 'Side Plank',        sets: 2, reps: '30s/side',  unit: 'time',       tracked: false },
        ],
      },
      {
        name: 'Cooldown',
        exercises: [
          { id: 'leg-stretch', name: 'Light stretch (hips, glutes, calves)', sets: 1, reps: '5–10 min', unit: 'check', tracked: false },
        ],
      },
    ],
  },
};
