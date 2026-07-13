import { z } from 'zod';

// Validates the LLM-generated plan before anything touches the database.
// Shapes mirror src/types (Week / Day / Zone / PhaseInfo) — keep in sync.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PACE_RE = /^\d+:\d{2}$/;

/** Zone names the UI depends on (charts look up 'Easy'/'Steady' by name). */
export const CANONICAL_ZONES = [
  'Recovery',
  'Easy',
  'Steady',
  'Marathon (MP)',
  'Sub-T',
  'Threshold',
  'VO2 / CV',
] as const;

const daySchema = z.object({
  d: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  date: z.string().regex(DATE_RE),
  type: z.enum(['LONG', 'WORKOUT', 'EASY', 'BIKE', 'REST', 'RACE']),
  title: z.string().min(1),
  km: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
  pace: z.string().optional(),
  strides: z.string().optional(),
  gym: z.string().optional(),
  workoutId: z.enum(['chestback', 'shouldersarms', 'legs']).optional(),
  notes: z.string().optional(),
  chartPace: z
    .object({
      category: z.enum(['intro', 'subThreshold', 'threshold', 'marathonPace']),
      secPerKm: z.number().positive(),
    })
    .optional(),
});

const weekSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  num: z.string().min(1),
  phase: z.number().int().min(0).max(4),
  dateStart: z.string().regex(DATE_RE),
  dateEnd: z.string().regex(DATE_RE),
  targetKm: z.number().positive(),
  cutback: z.boolean().optional(),
  peak: z.boolean().optional(),
  race: z.boolean().optional(),
  days: z.array(daySchema).length(7),
});

const zoneSchema = z.object({
  name: z.string().min(1),
  pace: z.string().min(1),
  hr: z.string().min(1),
  hero: z.boolean().optional(),
});

const phaseSchema = z.object({
  num: z.number().int().min(0).max(4),
  name: z.string().min(1),
  short: z.string().min(1),
  weeks: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  blurb: z.string().optional(),
});

export const generatedPlanSchema = z
  .object({
    weeks: z.array(weekSchema).min(2).max(22),
    zones: z.array(zoneSchema).length(CANONICAL_ZONES.length),
    phases: z.array(phaseSchema).min(1).max(5),
    goalPace: z.string().regex(PACE_RE),
    suggestedGoalTime: z.string().optional(),
    planNotes: z.string().optional(),
  })
  .superRefine((plan, ctx) => {
    const zoneNames = plan.zones.map((zone) => zone.name);
    for (const name of CANONICAL_ZONES) {
      if (!zoneNames.includes(name)) {
        ctx.addIssue({ code: 'custom', path: ['zones'], message: `missing required zone "${name}"` });
      }
    }

    const ids = new Set<string>();
    plan.weeks.forEach((week, i) => {
      if (ids.has(week.id)) {
        ctx.addIssue({ code: 'custom', path: ['weeks', i, 'id'], message: `duplicate week id "${week.id}"` });
      }
      ids.add(week.id);

      week.days.forEach((day, j) => {
        if (day.date < week.dateStart || day.date > week.dateEnd) {
          ctx.addIssue({
            code: 'custom',
            path: ['weeks', i, 'days', j, 'date'],
            message: `day date ${day.date} outside week range ${week.dateStart}–${week.dateEnd}`,
          });
        }
      });

      const phaseNums = new Set(plan.phases.map((p) => p.num));
      if (!phaseNums.has(week.phase)) {
        ctx.addIssue({
          code: 'custom',
          path: ['weeks', i, 'phase'],
          message: `week phase ${week.phase} has no matching entry in phases`,
        });
      }
    });
  });

export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;
