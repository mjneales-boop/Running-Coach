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
    case 'EASY': {
      const text = day.title + ' ' + (day.notes ?? '');
      entries.push(/\brecovery\b|\bshakeout\b/i.test(text) ? guide.recovery : guide.easy);
      break;
    }
    case 'GAME':
      entries.push(guide.game);
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
      // Classify by the session's NAME, never by pace digits. Pace numbers move
      // whenever the zones are recalibrated (they did — Aug 2026, when sub-T went
      // 5:00–5:15 → 5:25–5:35 and threshold 4:50–5:00 → 5:10–5:20) and digit-based
      // matching then silently reassigns guides. Sub-T is tested before threshold
      // because "sub-threshold" also matches the broader threshold patterns.
      // The bare-T patterns are deliberately case-SENSITIVE: /\bT\b/i matched any
      // stray lowercase "t" in the notes.
      if (/\bsteady\b/i.test(text)) entries.push(guide.steady);
      else if (/\bsub-?\s?t(hreshold)?\b/i.test(text)) entries.push(guide.subThreshold);
      else if (/\bthreshold\b/i.test(text) || /@\s*T\b|\bT\s*\(/.test(text)) entries.push(guide.threshold);
      else if (/\bCV\b|\bvo2\b/i.test(text)) entries.push(guide.vo2);
      else if (/\bMP\b|marathon pace/i.test(text)) entries.push(guide.marathonPace);
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
