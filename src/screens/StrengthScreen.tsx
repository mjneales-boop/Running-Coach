import { useEffect, useMemo, useRef, useState } from 'react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { ExerciseCard } from '../components/strength/ExerciseCard';
import { RestTimer } from '../components/strength/RestTimer';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan } from '../hooks/usePlan';
import { useSwaps } from '../hooks/useSwaps';
import { useGymSchedule } from '../hooks/useGymSchedule';
import { useExerciseOverrides } from '../hooks/useExerciseOverrides';
import { useStrength } from '../hooks/useStrength';
import { useSettings } from '../hooks/useSettings';
import { WORKOUTS, restDefaultFor } from '../constants/workouts';
import type { Exercise } from '../constants/workouts';
import { getSessionExercises, getDefaultExercises } from '../lib/exercises';
import { buildStrengthIndex, isCommitted, lastSessionSets, nextExerciseId } from '../lib/strength';
import { applySwapsToWeek, applyGymOverrides, nextGymDay } from '../lib/logic';
import type { Day, DayAbbr, SetLog } from '../types';

/** Beat between the last set landing and the next exercise opening, so the commit is seen. */
const AUTO_ADVANCE_MS = 400;

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** `NEXT · WED 27 AUG` */
function dayStamp(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')
    .toUpperCase();
}

/**
 * Untracked mobility and cooldown work still belongs in the session — it just
 * has nothing to measure. Rendering it as a tick means the prep actually gets
 * done instead of being filtered out of existence.
 */
function effectiveUnit(exercise: Exercise) {
  return exercise.tracked ? exercise.unit : 'check';
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
  const { strength, commitSet, addSet } = useStrength();
  const { settings } = useSettings();
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
  const isPast = !!gymDay && gymDay.date < todayStr;
  const date = gymDay?.date ?? todayStr;
  const workoutId = gymDay?.workoutId;
  const workout = workoutId ? WORKOUTS[workoutId] : undefined;

  // Every exercise, mobility and cooldown included — no longer filtered to `tracked`.
  const exercises = workoutId
    ? getSessionExercises(workoutId, exerciseOverrides[date]?.exerciseIds ?? null)
    : [];

  const log = strength[date];

  // One pass over the store feeds every ghost prefill on screen. Previously each
  // card re-scanned the whole store on every render.
  const index = useMemo(() => buildStrengthIndex(strength), [strength]);

  // `null` means "no explicit choice" and falls through to the first unfinished
  // exercise; `''` means the athlete deliberately collapsed everything. Deriving
  // this rather than driving it from an effect keeps a partially-logged session
  // open at the right card without a render cascade.
  const [openId, setOpenId] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrolledFor = useRef<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-advance fires 400ms after a commit, by which point `log` from this
  // render is stale. The ref hands the timer the current session instead.
  const logRef = useRef(log);
  useEffect(() => { logRef.current = log; });

  const effectiveOpenId = openId ?? nextExerciseId(exercises, log) ?? exercises[0]?.id ?? null;
  const firstExerciseId = exercises[0]?.id;

  // Scroll a resumed session into view once per date. Skipped when the open card
  // is already the first one, which needs no scrolling.
  useEffect(() => {
    if (scrolledFor.current === date) return;
    scrolledFor.current = date;
    if (!effectiveOpenId || effectiveOpenId === firstExerciseId) return;
    const target = effectiveOpenId;
    requestAnimationFrame(() => {
      cardRefs.current[target]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [date, effectiveOpenId, firstExerciseId]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  // --- rest timer -----------------------------------------------------------

  const [rest, setRest] = useState<{ startedAt: number; durationSec: number } | null>(null);

  // The clock is read inside the updater, which runs outside render — reading it
  // in the component body would be an impure call the compiler rightly rejects.
  const startRest = () => {
    setRest(() => ({ startedAt: Date.now(), durationSec: restDefaultFor(workoutId) }));
  };

  // --- commit ---------------------------------------------------------------

  const handleCommitSet = (exercise: Exercise, setIndex: number, set: SetLog) => {
    if (!workoutId) return;
    commitSet(date, workoutId, exercise.id, setIndex, set);

    // Mobility ticks are not sets — a 90-second timer over a hip stretch is noise.
    if (effectiveUnit(exercise) !== 'check') startRest();

    // Was that the last planned set? Count the others so this decision does not
    // wait on the state update the commit just triggered.
    const others = (log?.exercises[exercise.id] ?? []).filter((s, i) => i !== setIndex && isCommitted(s)).length;
    if (exercise.sets > 0 && others + 1 >= exercise.sets) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        // Forward-only: never bounce back to an exercise deliberately skipped.
        const next = nextExerciseId(exercises, logRef.current, exercise.id);
        setOpenId(next ?? '');
        if (next) {
          requestAnimationFrame(() => {
            cardRefs.current[next]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          });
        }
      }, AUTO_ADVANCE_MS);
    }
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

  const eyebrow = isToday
    ? 'Today · gym'
    : isPast
      ? `${dayStamp(date)} · logged`
      : `Next · ${dayStamp(date)}`;

  return (
    <div className="min-h-screen bg-canvas px-[22px] pb-[132px] pt-1.5">
      <ScreenHeader onAvatarClick={onOpenSettings} />

      <div className="stride-rise mb-[22px] border-b border-hairline pb-[22px]">
        <Eyebrow>{eyebrow}</Eyebrow>
        {/* The tab bar already says Strength — the title's job is to name the session. */}
        <h1
          className="mt-3.5 font-display text-[40px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
          style={{ fontVariationSettings: "'wdth' 118" }}
        >
          {workout.name}
        </h1>
      </div>

      {otherDays.length > 0 && (
        <div className="stride-rise mb-5">
          <button
            onClick={() => setShowDayPicker((v) => !v)}
            className="min-h-[44px] rounded-lg border border-dashed border-hairline-strong px-2.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted"
          >
            Move to another day
          </button>
          {showDayPicker && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {otherDays.map((d) => (
                <button
                  key={d.d}
                  onClick={() => handleMoveDay(d)}
                  className="min-h-[44px] rounded-lg border border-hairline px-3 font-mono text-[11.5px] uppercase tracking-[0.05em] text-muted"
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
          const alternatives = workout.alternatives.filter((alt) => !exercises.some((ex) => ex.id === alt.id));
          return (
            <div key={exercise.id} ref={(el) => { cardRefs.current[exercise.id] = el; }}>
              <ExerciseCard
                exercise={{ ...exercise, unit: effectiveUnit(exercise) }}
                sets={log?.exercises[exercise.id] ?? []}
                lastSets={lastSessionSets(index, exercise.id, date)}
                open={effectiveOpenId === exercise.id}
                onToggleOpen={() => setOpenId(effectiveOpenId === exercise.id ? '' : exercise.id)}
                onCommitSet={(i, set) => handleCommitSet(exercise, i, set)}
                onAddSet={() => addSet(date, workoutId, exercise.id)}
                alternatives={alternatives}
                onSwap={(newId) => handleSwapExercise(exercise.id, newId)}
              />
            </div>
          );
        })}
      </div>

      {rest && (
        <RestTimer
          startedAt={rest.startedAt}
          durationSec={rest.durationSec}
          haptics={settings.hapticRest}
          onExtend={(sec) => setRest((r) => (r ? { ...r, durationSec: r.durationSec + sec } : r))}
          onDismiss={() => setRest(null)}
        />
      )}

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
