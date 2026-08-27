import type { CompletionEntry, Day, DayAbbr, SetLog, Week, WorkoutLog } from '../../types';

/** A committed set. `committedAt` defaults to a stable epoch so durations are deterministic. */
export function set(weight?: number, reps?: number, committedAt?: number): SetLog {
  return { weight, reps, committedAt };
}

export function log(
  date: string,
  workoutId: string,
  exercises: Record<string, SetLog[]>,
  extra: Partial<WorkoutLog> = {},
): WorkoutLog {
  return { date, workoutId, exercises, ...extra };
}

export function store(...logs: WorkoutLog[]): Record<string, WorkoutLog> {
  return Object.fromEntries(logs.map((l) => [l.date, l]));
}

const DAY_ORDER: DayAbbr[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * A plan week starting on `mondayDate`. `gymDays` lists the day abbreviations
 * that carry a gym session; `km` is spread evenly over the non-gym days.
 */
export function week(
  id: string,
  mondayDate: string,
  gymDays: DayAbbr[],
  opts: { km?: number; workoutId?: string } = {},
): Week {
  const days: Day[] = DAY_ORDER.map((d, i) => {
    const isGym = gymDays.includes(d);
    return {
      d,
      date: addDays(mondayDate, i),
      type: isGym ? 'EASY' : 'EASY',
      title: isGym ? 'Easy + gym' : 'Easy',
      km: opts.km ?? 10,
      ...(isGym ? { gym: opts.workoutId ?? 'chestback', workoutId: opts.workoutId ?? 'chestback' } : {}),
    } as Day;
  });

  return {
    id,
    label: `Week ${id}`,
    num: id,
    phase: 1,
    dateStart: mondayDate,
    dateEnd: addDays(mondayDate, 6),
    targetKm: (opts.km ?? 10) * 7,
    days,
  };
}

/** Marks every day of the given weeks complete, so km counts toward volume. */
export function completeAll(weeks: Week[]): Record<string, CompletionEntry> {
  const map: Record<string, CompletionEntry> = {};
  for (const w of weeks) {
    for (const d of w.days) map[`${w.id}-${d.d}`] = { done: true };
  }
  return map;
}
