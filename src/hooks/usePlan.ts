import { useMemo } from 'react';
import { usePlanConfig } from './usePlanConfig';
import { findCurrentWeek, findTodaySession, daysToRace, currentPhase } from '../lib/logic';
import type { Week, Day, PhaseInfo } from '../types';

interface PlanState {
  currentWeek: Week;
  viewedWeek: Week;
  todaySession: Day | undefined;
  currentPhase: PhaseInfo;
  daysToRace: number;
  currentWeekIndex: number;
  weeks: Week[];
  phases: PhaseInfo[];
}

export function usePlan(today: Date, viewedWeekIndex: number): PlanState {
  const plan = usePlanConfig();
  return useMemo(() => {
    const { weeks, phases, race } = plan;
    const cw = findCurrentWeek(today, weeks);
    const cwIdx = weeks.indexOf(cw);
    const vw = weeks[viewedWeekIndex] ?? cw;
    const ts = findTodaySession(today, cw);
    const phase = currentPhase(cw, phases);
    const countdown = daysToRace(today, race);

    return {
      currentWeek: cw,
      viewedWeek: vw,
      todaySession: ts,
      currentPhase: phase,
      daysToRace: countdown,
      currentWeekIndex: cwIdx,
      weeks,
      phases,
    };
  }, [today, viewedWeekIndex, plan]);
}
