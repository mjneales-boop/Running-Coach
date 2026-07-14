import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchActivePlan, fetchProfile } from '../lib/db';
import { buildSessionGuide, type GuideEntry } from '../lib/sessionGuides';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import type { PhaseInfo, Week, Zone } from '../types';

export interface RaceConfig {
  name: string;
  date: string;       // YYYY-MM-DD
  time: string;       // 'HH:MM' start time
  location: string;   // 'Start → Finish'
  goalTime: string;
  goalPace: string;
}

export interface AthleteConfig {
  name: string;
  age: number | null;
  sex: string | null;
  weightKg: number | null;
  heightCm: number | null;
  experience: string | null;
  weeklyKmTypical: number | null;
  daysPerWeek: number | null;
  recentRaceTimes: { distance: string; time: string }[];
  maxHR: number;
  baselineHRV: number;
  baselineRHR: number;
  baselineSleep: number;
}

/** True only when this is a race plan AND the race date is a real, parseable
 *  date. Everything that decides "race chrome vs. general chrome" keys off this
 *  — never off `mode` alone — so a general plan can never render a countdown,
 *  RACE DAY card, or "Invalid Date" even if a stale `mode` string or an empty
 *  race field slips through. */
export function isValidRaceDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const t = new Date(`${dateStr}T00:00:00`).getTime();
  return Number.isFinite(t);
}

export interface PlanConfig {
  mode: string;       // 'race' | 'general'
  /** Derived: mode === 'race' AND a valid race date exists. Use this, not `mode`. */
  isRace: boolean;
  weeks: Week[];
  zones: Zone[];
  phases: PhaseInfo[];
  peakKm: number;
  race: RaceConfig;
  athlete: AthleteConfig;
  injuryHistory: string;
  /** Session guides templated with this athlete's zones/goal/injury notes. */
  sessionGuide: Record<string, GuideEntry>;
  isAdmin: boolean;
}

const PlanContext = createContext<PlanConfig | null>(null);

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="font-display text-sm font-black uppercase tracking-[0.22em] text-faint">
        Stride
      </div>
    </div>
  );
}


export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ plan: PlanConfig | null; loading: boolean }>({
    plan: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchActivePlan(), fetchProfile()])
      .then(([plan, profile]) => {
        if (cancelled) return;
        if (!plan || !profile) {
          setState({ plan: null, loading: false });
          return;
        }
        const race = {
          name: profile.race_name ?? '',
          date: profile.race_date ?? '',
          time: profile.race_time ?? '08:00',
          location: profile.race_location ?? '',
          goalTime: profile.goal_time ?? '',
          goalPace: profile.goal_pace ?? '',
        };
        setState({
          loading: false,
          plan: {
            mode: plan.mode,
            isRace: plan.mode === 'race' && isValidRaceDate(race.date),
            weeks: plan.weeks,
            zones: plan.zones,
            phases: plan.phases,
            peakKm: Math.max(...plan.weeks.map((w) => w.targetKm)),
            race,
            athlete: {
              name: profile.display_name ?? '',
              age: profile.age ?? null,
              sex: profile.sex ?? null,
              weightKg: profile.weight_kg ?? null,
              heightCm: profile.height_cm ?? null,
              experience: profile.experience ?? null,
              weeklyKmTypical: profile.weekly_km_current ?? null,
              daysPerWeek: profile.days_per_week ?? null,
              recentRaceTimes: profile.recent_race_times ?? [],
              maxHR: Number(profile.max_hr ?? 0),
              baselineHRV: Number(profile.baseline_hrv ?? 0),
              baselineRHR: Number(profile.baseline_rhr ?? 0),
              baselineSleep: Number(profile.baseline_sleep ?? 0),
            },
            injuryHistory: profile.injury_history ?? '',
            sessionGuide: buildSessionGuide({
              zones: plan.zones,
              goalPace: race.goalPace || undefined,
              goalTime: race.goalTime || undefined,
              raceStart: race.time || undefined,
              injuryHistory: profile.injury_history ?? undefined,
            }),
            isAdmin: profile.is_admin,
          },
        });
      })
      .catch(() => {
        if (!cancelled) setState({ plan: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) return <Splash />;
  if (!state.plan) return <OnboardingScreen />;
  return <PlanContext.Provider value={state.plan}>{children}</PlanContext.Provider>;
}

export function usePlanConfig(): PlanConfig {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlanConfig must be used within PlanProvider');
  return ctx;
}

/** Non-throwing variant for chrome that may render outside PlanProvider (e.g. the ?uikit demo). */
export function usePlanConfigOptional(): PlanConfig | null {
  return useContext(PlanContext);
}
