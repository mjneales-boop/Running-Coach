import type { Day, SessionType } from '../types';

export function restDayNote(): string {
  return "Nothing on the plan today — that's the work. This week only banks if you let it absorb. Legs up, eat well, sleep early.";
}

export function runDayNote(day: Day): string {
  switch (day.type) {
    case 'LONG':
      return 'Keep it honest and easy for the bulk of this one. If you feel strong late, let the pace drift down slightly — this is aerobic volume, not a workout.';
    case 'WORKOUT':
      return "Warm up fully before the fast stuff. Hit the paces, not the watch — if it's not clicking today, ease off and bank the aerobic work instead.";
    case 'EASY':
      return 'Conversational the whole way. This is recovery-adjacent — resist the urge to push it.';
    case 'BIKE':
      return 'Easy spin, heart rate low. Cross-training day — legs stay fresh for tomorrow.';
    case 'RACE':
      return "Today's the day. Trust the training, hold the plan, and enjoy every kilometre.";
    default:
      return 'Stick to the plan and listen to how the body responds.';
  }
}

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  LONG: 'Long run',
  WORKOUT: 'Workout',
  EASY: 'Easy run',
  BIKE: 'Bike',
  REST: 'Rest',
  RACE: 'Race day',
};
