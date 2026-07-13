import type { GuideEntry } from './sessionGuides';
import type { Day, Week } from '../types';

export function guideEntriesForDay(day: Day, guide: Record<string, GuideEntry>): GuideEntry[] {
  const entries: GuideEntry[] = [];

  switch (day.type) {
    case 'LONG': {
      const text = day.title + ' ' + (day.notes ?? '');
      if (/fasted/i.test(text)) entries.push(guide.fasted);
      else if (/5:41|MP/.test(day.pace ?? '') || /MP/.test(day.title)) entries.push(guide.longMP);
      else entries.push(guide.long);
      break;
    }
    case 'EASY':
      entries.push(guide.easy);
      break;
    case 'BIKE':
      entries.push(guide.bike);
      break;
    case 'REST':
      entries.push(guide.rest);
      break;
    case 'RACE':
      entries.push(guide.race);
      break;
    case 'WORKOUT': {
      const text = day.title + ' ' + (day.notes ?? '');
      // Sub-T is checked before threshold: "sub-threshold"/"Sub-T" titles also
      // match the broader threshold patterns ("threshold", \bT\b).
      if (/steady/i.test(text)) entries.push(guide.steady);
      else if (/5:10|sub-?t/i.test(text)) entries.push(guide.subThreshold);
      else if (/4:55|threshold|\bT\b/i.test(text)) entries.push(guide.threshold);
      else if (/CV|vo2|4:2[5-9]|4:3[0-5]/i.test(text)) entries.push(guide.vo2);
      else entries.push(guide.subThreshold);
      break;
    }
  }

  if (day.strides) entries.push(guide.strides);
  if (/hill sprint/i.test(day.title + ' ' + (day.notes ?? ''))) entries.push(guide.hillSprints);

  return entries.filter(Boolean);
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
