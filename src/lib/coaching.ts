import { SESSION_GUIDE } from '../constants/coaching';
import type { GuideEntry } from '../constants/coaching';
import type { Day, Week } from '../types';

export function guideEntriesForDay(day: Day): GuideEntry[] {
  const entries: GuideEntry[] = [];

  switch (day.type) {
    case 'LONG': {
      const text = day.title + ' ' + (day.notes ?? '');
      if (/fasted/i.test(text)) entries.push(SESSION_GUIDE.fasted);
      else if (/5:41|MP/.test(day.pace ?? '') || /MP/.test(day.title)) entries.push(SESSION_GUIDE.longMP);
      else entries.push(SESSION_GUIDE.long);
      break;
    }
    case 'EASY':
      entries.push(SESSION_GUIDE.easy);
      break;
    case 'BIKE':
      entries.push(SESSION_GUIDE.bike);
      break;
    case 'REST':
      entries.push(SESSION_GUIDE.rest);
      break;
    case 'RACE':
      entries.push(SESSION_GUIDE.race);
      break;
    case 'WORKOUT': {
      const text = day.title + ' ' + (day.notes ?? '');
      if (/steady/i.test(text)) entries.push(SESSION_GUIDE.steady);
      else if (/4:55|threshold|\bT\b/i.test(text)) entries.push(SESSION_GUIDE.threshold);
      else if (/5:10|sub-?t/i.test(text)) entries.push(SESSION_GUIDE.subThreshold);
      else if (/CV|4:2[5-9]|4:3[0-5]/i.test(text)) entries.push(SESSION_GUIDE.vo2);
      else entries.push(SESSION_GUIDE.subThreshold);
      break;
    }
  }

  if (day.strides) entries.push(SESSION_GUIDE.strides);
  if (/hill sprint/i.test(day.title + ' ' + (day.notes ?? ''))) entries.push(SESSION_GUIDE.hillSprints);

  return entries;
}

export interface WorkoutPacePoint {
  weekId: string;
  weekNum: string;
  label: string;
  category: NonNullable<Day['chartPace']>['category'];
  secPerKm: number;
}

export function getWorkoutPaceProgression(weeks: Week[]): WorkoutPacePoint[] {
  return weeks
    .map((week) => ({ week, day: week.days.find((d) => d.chartPace) }))
    .filter((x): x is { week: Week; day: Day & { chartPace: NonNullable<Day['chartPace']> } } => !!x.day)
    .map(({ week, day }) => ({
      weekId: week.id,
      weekNum: week.num,
      label: `W${week.num}`,
      category: day.chartPace.category,
      secPerKm: day.chartPace.secPerKm,
    }));
}
