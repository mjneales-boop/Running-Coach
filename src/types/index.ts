export type SessionType = 'LONG' | 'WORKOUT' | 'EASY' | 'BIKE' | 'REST' | 'RACE';
export type Phase = 0 | 1 | 2 | 3 | 4;
export type DayAbbr = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WorkoutPaceCategory = 'intro' | 'subThreshold' | 'threshold' | 'marathonPace';

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
  chartPace?: { category: WorkoutPaceCategory; secPerKm: number };
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
  blurb?: string;
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

export type GymOverrideEntry = { gym: string | null; workoutId: string | null };
export type GymOverrides = Record<string, GymOverrideEntry>;

export interface SetLog {
  weight?: number;
  reps?: number;
  done?: boolean;
}

export interface WorkoutLog {
  workoutId: string;
  date: string;
  exercises: Record<string, SetLog[]>;
  exerciseDone?: Record<string, boolean>;
  completedAt?: string;
}

export interface SessionExerciseConfig {
  workoutId: string;
  exerciseIds: string[];
}
export type SessionExerciseOverrides = Record<string, SessionExerciseConfig>;

export interface StravaActivity {
  id: string;
  name: string;
  date: string;         // YYYY-MM-DD (from start_date_local)
  sportType: string;
  distanceKm: number;
  movingTimeSec: number;
  avgPaceMinKm: number; // decimal minutes per km
  avgHR?: number;
}

export interface StravaSplit {
  split: number;         // 1-indexed
  distanceM: number;     // ~1000, final split may be a partial distance
  avgPaceMinKm: number;  // decimal minutes per km
  avgHR?: number;
  elevationDiffM?: number;
}

export interface StravaRunDetail {
  id: string;
  name: string;
  date: string;          // YYYY-MM-DD
  distanceKm: number;
  avgPaceMinKm: number;
  avgHR?: number;
  maxHR?: number;
  elevationGainM: number;
  polyline?: string;      // decimated (summary) encoded polyline — thumbnail
  fullPolyline?: string;  // full-resolution encoded polyline — expanded map
  splits: StravaSplit[];
}

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}
