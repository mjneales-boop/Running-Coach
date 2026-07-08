import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { ExerciseAccordion } from '../components/strength/ExerciseAccordion';
import { RecentHistoryList } from '../components/strength/RecentHistoryList';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan, WEEKS } from '../hooks/usePlan';
import { useSwaps } from '../hooks/useSwaps';
import { useGymSchedule } from '../hooks/useGymSchedule';
import { useExerciseOverrides } from '../hooks/useExerciseOverrides';
import { useStrength } from '../hooks/useStrength';
import { WORKOUTS } from '../constants/workouts';
import { getSessionExercises } from '../lib/exercises';
import { allTimePR, recentLogsSummary } from '../lib/strength';
import { applySwapsToWeek, applyGymOverrides, nextGymDay } from '../lib/logic';
import type { DayAbbr, SetLog } from '../types';

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface StrengthScreenProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onOpenSettings: () => void;
  focusDay?: { weekId: string; dayAbbr: DayAbbr } | null;
}

export function StrengthScreen({ activeTab, onTabChange, onOpenSettings, focusDay }: StrengthScreenProps) {
  const today = useCurrentDate();
  const { currentWeek: rawCurrentWeek } = usePlan(today, 0);
  const { swaps } = useSwaps();
  const { gymOverrides } = useGymSchedule();
  const { exerciseOverrides } = useExerciseOverrides();
  const { strength, logSet, markExerciseDone } = useStrength();

  const currentWeek = useMemo(
    () => applyGymOverrides(applySwapsToWeek(rawCurrentWeek, swaps[rawCurrentWeek.id] ?? {}), gymOverrides),
    [rawCurrentWeek, swaps, gymOverrides],
  );
  const focusWeek = useMemo(() => {
    if (!focusDay) return null;
    const raw = WEEKS.find((w) => w.id === focusDay.weekId);
    if (!raw) return null;
    return applyGymOverrides(applySwapsToWeek(raw, swaps[focusDay.weekId] ?? {}), gymOverrides);
  }, [focusDay, swaps, gymOverrides]);
  const todayStr = localDateKey(today);
  const gymDay = focusDay
    ? focusWeek?.days.find((d) => d.d === focusDay.dayAbbr)
    : nextGymDay(today, currentWeek);
  const isToday = gymDay?.date === todayStr;
  const date = gymDay?.date ?? todayStr;
  const workoutId = gymDay?.workoutId;
  const workout = workoutId ? WORKOUTS[workoutId] : undefined;

  const exercises = useMemo(
    () =>
      workoutId
        ? getSessionExercises(workoutId, exerciseOverrides[date]?.exerciseIds ?? null).filter((ex) => ex.tracked)
        : [],
    [workoutId, exerciseOverrides, date],
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const effectiveOpenId = openId ?? exercises[0]?.id ?? null;

  const log = strength[date];

  const handleSetChange = (exerciseId: string, index: number, field: 'weight' | 'reps', raw: string) => {
    if (!workoutId) return;
    const current = (log?.exercises[exerciseId] ?? [])[index] ?? {};
    const num = raw === '' ? undefined : Number(raw);
    const updated: SetLog = { ...current, [field]: raw === '' || Number.isNaN(num) ? undefined : num };
    logSet(date, workoutId, exerciseId, index, updated);
  };

  const handleAddSet = (exerciseId: string) => {
    if (!workoutId) return;
    const count = (log?.exercises[exerciseId] ?? []).length;
    logSet(date, workoutId, exerciseId, count, {});
  };

  if (!workout || !workoutId) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas px-[22px] pb-[132px] pt-1.5">
        <ScreenHeader onAvatarClick={onOpenSettings} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <div className="font-display text-2xl font-extrabold uppercase">No gym session</div>
          <div className="font-mono text-xs uppercase tracking-[0.14em] text-faint">Nothing scheduled this week</div>
        </div>
        <TabBar active={activeTab} onChange={onTabChange} />
      </div>
    );
  }

  const primaryExercise = exercises[0];

  return (
    <div className="min-h-screen bg-canvas px-[22px] pb-[132px] pt-1.5">
      <ScreenHeader onAvatarClick={onOpenSettings} />

      <div className="stride-rise mb-[22px] border-b border-hairline pb-[22px]">
        <Eyebrow>{isToday ? 'Today · gym' : 'Next · gym'}</Eyebrow>
        <h1
          className="mt-3.5 font-display text-[40px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
          style={{ fontVariationSettings: "'wdth' 118" }}
        >
          Strength
        </h1>
      </div>

      <div className="stride-rise mb-4 flex items-baseline justify-between">
        <Eyebrow>{workout.name}</Eyebrow>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          {exercises.length} lifts · ~{Math.round(exercises.length * 8)} min
        </span>
      </div>

      <div className="stride-rise">
        {exercises.map((exercise) => {
          const sets = log?.exercises[exercise.id] ?? [];
          const pr = allTimePR(strength, exercise.id);
          const done = log?.exerciseDone?.[exercise.id] ?? false;
          return (
            <ExerciseAccordion
              key={exercise.id}
              exercise={exercise}
              sets={sets}
              pr={pr}
              done={done}
              open={effectiveOpenId === exercise.id}
              onToggleOpen={() => setOpenId(effectiveOpenId === exercise.id ? '' : exercise.id)}
              onSetChange={(i, field, val) => handleSetChange(exercise.id, i, field, val)}
              onAddSet={() => handleAddSet(exercise.id)}
              onToggleDone={() => markExerciseDone(date, workoutId, exercise.id, !done)}
            />
          );
        })}
      </div>

      {primaryExercise && (
        <>
          <div className="stride-rise mb-1 mt-[26px] flex items-baseline justify-between">
            <Eyebrow>Recent</Eyebrow>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{primaryExercise.name}</span>
          </div>
          <RecentHistoryList entries={recentLogsSummary(strength, primaryExercise.id, todayStr)} />
        </>
      )}

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
