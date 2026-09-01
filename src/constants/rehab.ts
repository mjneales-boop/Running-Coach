import type { Exercise, WorkoutBlock } from './workouts';

/**
 * Rehab protocols — deliberately NOT part of `WORKOUTS`.
 *
 * A protocol is not a lift: it runs twice a day, carries no load progression,
 * and must never appear in the gym-swap picker (`SessionModal` builds that from
 * `Object.values(WORKOUTS)`) or in tonnage (`strength.ts` walks the same record).
 * Keeping it in its own map is what stops a rehab routine from being swapped in
 * as a leg day, or from turning up as volume on the Progress screen.
 *
 * A `Day` opts in via `rehabId`, which is independent of `workoutId` — the days
 * that carry this protocol also carry a real lift.
 */
export interface RehabProtocol {
  id: string;
  name: string;
  /** Shown under the title: how often the routine runs, not how long it takes. */
  cadence: string;
  /** The single rule that governs every movement in the protocol. */
  rule: string;
  blocks: WorkoutBlock[];
  /** Contraindications. For a contusion these matter more than the exercises. */
  avoid: string[];
  /** Rendered last, quietly. */
  disclaimer: string;
}

const range: Exercise[] = [
  { id: 'quad-sets', name: 'Quad Sets', sets: 1, reps: '10 × 5s hold', unit: 'check', muscles: ['legs'], tracked: false, note: 'Lying flat. Tighten the thigh and press the back of the knee down. Re-establishes the muscle firing without moving the bruise.' },
  { id: 'heel-slides', name: 'Heel Slides', sets: 2, reps: '12', unit: 'bodyweight', muscles: ['legs'], tracked: false, note: 'On your back. Slide the heel toward the backside as far as it goes comfortably, then straighten. This is the range-restoration work.' },
  { id: 'prone-heel-to-butt', name: 'Prone Heel-to-Butt', sets: 3, reps: '30s hold', unit: 'time', muscles: ['legs'], tracked: false, note: 'Face down. Draw the heel in with a strap or hand to the FIRST hint of stretch. Day-to-day progress here is the clearest signal of recovery.' },
  { id: 'standing-quad-stretch', name: 'Standing Quad Stretch', sets: 3, reps: '30s', unit: 'time', muscles: ['legs'], tracked: false, note: 'To onset only. Rectus femoris crosses the hip — pelvis tucked, knee under the hip.' },
];

const load: Exercise[] = [
  { id: 'wall-sit', name: 'Wall Sit', sets: 3, reps: '20–30s', unit: 'time', muscles: ['legs'], tracked: false, note: 'Whatever depth is comfortable. Isometrics reduce pain and hold the quad’s tolerance to tension without lengthening it under load.' },
  { id: 'bw-squat', name: 'Bodyweight Squats', sets: 2, reps: '10', unit: 'bodyweight', muscles: ['legs'], tracked: false, note: 'To the deepest pain-free depth. Depth increases as range returns — do not chase it. Full depth pain-free is Gate B: loaded leg day.' },
  { id: 'glute-bridge', name: 'Glute Bridge', sets: 2, reps: '12', unit: 'bodyweight', muscles: ['legs', 'core'], tracked: false, note: 'Keeps the hip extensors contributing so the quad is not compensating on the run.' },
];

const circulation: Exercise[] = [
  { id: 'easy-walk', name: 'Easy Walk', sets: 1, reps: '10–15 min', unit: 'check', muscles: ['legs'], tracked: false, note: 'Circulation does more for a contusion than anything else on this list.' },
];

export const REHAB_PROTOCOLS: Record<string, RehabProtocol> = {
  quad: {
    id: 'quad',
    name: 'Quad Protocol',
    cadence: 'Twice daily · ~10 min',
    rule: 'Every movement stops at the ONSET of pain, never through it. Range is the goal; load is not.',
    blocks: [
      { name: 'Range', exercises: range },
      { name: 'Load', exercises: load },
      { name: 'Circulation', exercises: circulation },
    ],
    avoid: [
      'No deep massage, foam rolling or trigger-point work on the bruise. Aggressive soft-tissue work on healing contused muscle is the primary driver of calcification within it — the one genuine way to turn a two-week injury into a several-month one.',
      'No heat, sauna or hot baths on the quad for the first week or so.',
      'No stretching into pain. End-range discomfort is information, not an obstacle to push through.',
    ],
    disclaimer: 'Not medical advice. If end-range pain has not resolved by the weekend, or the thigh feels firmer or more swollen than it did on Sat 29 Aug, that warrants a physio rather than another week of this.',
  },
};

export const REHAB_SESSIONS = ['am', 'pm'] as const;
export type RehabSession = (typeof REHAB_SESSIONS)[number];

/** Storage key for the tick log. Unknown keys fall through to `user_blobs`. */
export const REHAB_LOG_KEY = 'rehab-log';

/** date → session → completed exercise ids. */
export type RehabLog = Record<string, Partial<Record<RehabSession, string[]>>>;

export function rehabExercises(protocol: RehabProtocol): Exercise[] {
  return protocol.blocks.flatMap((b) => b.exercises);
}
