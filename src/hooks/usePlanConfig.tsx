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
  maxHR: number;
  baselineHRV: number;
  baselineRHR: number;
  baselineSleep: number;
}

export interface PlanConfig {
  mode: string;       // 'race' | 'general'
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
            weeks: plan.weeks,
            zones: plan.zones,
            phases: plan.phases,
            peakKm: Math.max(...plan.weeks.map((w) => w.targetKm)),
            race,
            athlete: {
              name: profile.display_name ?? '',
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
