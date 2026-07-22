import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { ExerciseAccordion } from '../components/strength/ExerciseAccordion';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan } from '../hooks/usePlan';
import { useSwaps } from '../hooks/useSwaps';
import { useGymSchedule } from '../hooks/useGymSchedule';
import { useExerciseOverrides } from '../hooks/useExerciseOverrides';
import { useStrength } from '../hooks/useStrength';
import { WORKOUTS } from '../constants/workouts';
import { getSessionExercises, getDefaultExercises } from '../lib/exercises';
import { allTimePR, recentLogsSummary } from '../lib/strength';
import { applySwapsToWeek, applyGymOverrides, nextGymDay } from '../lib/logic';
import type { Day, DayAbbr, SetLog } from '../types';

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
  const { currentWeek: rawCurrentWeek, weeks } = usePlan(today, 0);
  const { swaps } = useSwaps();
  const { gymOverrides, moveGym } = useGymSchedule();
  const { exerciseOverrides, setSessionExercises } = useExerciseOverrides();
  const { strength, logSet, markExerciseDone } = useStrength();
  const [showDayPicker, setShowDayPicker] = useState(false);

  const currentWeek = useMemo(
    () => applyGymOverrides(applySwapsToWeek(rawCurrentWeek, swaps[rawCurrentWeek.id] ?? {}), gymOverrides),
    [rawCurrentWeek, swaps, gymOverrides],
  );
  const focusWeek = useMemo(() => {
    if (!focusDay) return null;
    const raw = weeks.find((w) => w.id === focusDay.weekId);
    if (!raw) return null;
    return applyGymOverrides(applySwapsToWeek(raw, swaps[focusDay.weekId] ?? {}), gymOverrides);
  }, [focusDay, swaps, gymOverrides, weeks]);
  const todayStr = localDateKey(today);
  const gymDay = focusDay
    ? focusWeek?.days.find((d) => d.d === focusDay.dayAbbr)
    : nextGymDay(today, currentWeek);
  const isToday = gymDay?.date === todayStr;
  const date = gymDay?.date ?? todayStr;
  const workoutId = gymDay?.workoutId;
  const workout = workoutId ? WORKOUTS[workoutId] : undefined;

  // Plain computation — the React compiler memoizes; a manual useMemo can't be
  // preserved now that `date` derives from context-provided plan weeks.
  const exercises = workoutId
    ? getSessionExercises(workoutId, exerciseOverrides[date]?.exerciseIds ?? null).filter((ex) => ex.tracked)
    : [];

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

  const handleSwapExercise = (oldId: string, newId: string) => {
    if (!workoutId) return;
    const currentIds = exerciseOverrides[date]?.exerciseIds ?? getDefaultExercises(workoutId).map((ex) => ex.id);
    setSessionExercises(date, workoutId, currentIds.map((id) => (id === oldId ? newId : id)));
  };

  const activeWeek = focusWeek ?? currentWeek;
  const otherDays: Day[] = gymDay ? activeWeek.days.filter((d) => d.d !== gymDay.d) : [];

  const handleMoveDay = (target: Day) => {
    if (!gymDay?.gym || !workoutId) return;
    moveGym(
      gymDay.date,
      target.date,
      gymDay.gym,
      workoutId,
      target.gym && target.workoutId ? { gym: target.gym, workoutId: target.workoutId } : null,
    );
    setShowDayPicker(false);
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

      {otherDays.length > 0 && (
        <div className="stride-rise mb-5">
          <button
            onClick={() => setShowDayPicker((v) => !v)}
            className="rounded-lg border border-dashed border-hairline-strong px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted"
          >
            Move to another day
          </button>
          {showDayPicker && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {otherDays.map((d) => (
                <button
                  key={d.d}
                  onClick={() => handleMoveDay(d)}
                  className="rounded-lg border border-hairline px-3 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.05em] text-muted"
                >
                  {d.d}{d.gym ? ` · ${d.gym}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="stride-rise">
        {exercises.map((exercise) => {
          const sets = log?.exercises[exercise.id] ?? [];
          const pr = allTimePR(strength, exercise.id);
          const recent = recentLogsSummary(strength, exercise.id, todayStr).slice(0, 3);
          const done = log?.exerciseDone?.[exercise.id] ?? false;
          const alternatives = workout.alternatives.filter((alt) => !exercises.some((ex) => ex.id === alt.id));
          return (
            <ExerciseAccordion
              key={exercise.id}
              exercise={exercise}
              sets={sets}
              pr={pr}
              recent={recent}
              done={done}
              open={effectiveOpenId === exercise.id}
              onToggleOpen={() => setOpenId(effectiveOpenId === exercise.id ? '' : exercise.id)}
              onSetChange={(i, field, val) => handleSetChange(exercise.id, i, field, val)}
              onAddSet={() => handleAddSet(exercise.id)}
              onToggleDone={() => markExerciseDone(date, workoutId, exercise.id, !done)}
              alternatives={alternatives}
              onSwap={(newId) => handleSwapExercise(exercise.id, newId)}
            />
          );
        })}
      </div>

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
