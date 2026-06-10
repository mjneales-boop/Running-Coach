export type SessionType = 'LONG' | 'WORKOUT' | 'EASY' | 'BIKE' | 'REST' | 'RACE';
export type Phase = 0 | 1 | 2 | 3 | 4;
export type DayAbbr = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Day {
  d: DayAbbr;
  date: string;
  type: SessionType;
  title: string;
  km?: number;
  duration?: number;
  pace?: string;
  strides?: string;
  gym?: string;
  workoutId?: string;
  notes?: string;
}

export interface Week {
  id: string;
  label: string;
  num: string;
  phase: Phase;
  dateStart: string;
  dateEnd: string;
  targetKm: number;
  cutback?: boolean;
  peak?: boolean;
  race?: boolean;
  days: Day[];
}

export interface PhaseInfo {
  num: Phase;
  name: string;
  short: string;
  weeks: string;
  color: string;
}

export interface Zone {
  name: string;
  pace: string;
  hr: string;
  hero?: boolean;
}

export interface CompletionEntry {
  done: boolean;
  notes?: string;
  actualKm?: number;
  actualPace?: string;
  actualHR?: number;
  completedAt?: string;
}

export interface ReadinessEntry {
  score?: number;
  hrv?: number;
  rhr?: number;
  sleep?: number;
}

export type ReadinessTier = 'excellent' | 'good' | 'yellow' | 'compromised' | 'red' | 'none';

export type WeekContentMap = Partial<Record<DayAbbr, DayAbbr>>;
export type SwapStore = Record<string, WeekContentMap>;

export interface SetLog {
  weight?: number;
  reps?: number;
  done?: boolean;
}

export interface WorkoutLog {
  workoutId: string;
  date: string;
  exercises: Record<string, SetLog[]>;
  completedAt?: string;
}
