import { useMemo } from 'react';
import { WEEKS, PHASES } from '../constants/plan';
import { findCurrentWeek, findTodaySession, daysToRace, currentPhase } from '../lib/logic';
import type { Week, Day, PhaseInfo } from '../types';

interface PlanState {
  currentWeek: Week;
  viewedWeek: Week;
  todaySession: Day | undefined;
  currentPhase: PhaseInfo;
  daysToRace: number;
  currentWeekIndex: number;
}

export function usePlan(today: Date, viewedWeekIndex: number): PlanState {
  return useMemo(() => {
    const cw = findCurrentWeek(today, WEEKS);
    const cwIdx = WEEKS.indexOf(cw);
    const vw = WEEKS[viewedWeekIndex] ?? cw;
    const ts = findTodaySession(today, cw);
    const phase = currentPhase(cw);
    const countdown = daysToRace(today);

    return {
      currentWeek: cw,
      viewedWeek: vw,
      todaySession: ts,
      currentPhase: phase,
      daysToRace: countdown,
      currentWeekIndex: cwIdx,
    };
  }, [today, viewedWeekIndex]);
}

export { WEEKS, PHASES };
