import { useState, useCallback } from 'react';
import { WORKOUTS } from '../constants/workouts';
import { lastWorkoutLog } from '../lib/strength';
import { getSessionExercises, getAllExercises } from '../lib/exercises';
import type { Day, DayAbbr, CompletionEntry, SetLog, WorkoutLog, SessionExerciseOverrides } from '../types';
import type { Exercise } from '../constants/workouts';

interface MobileGymLogProps {
  day: Day;
  weekId: string;
  strength: Record<string, WorkoutLog>;
  onLogSet: (date: string, workoutId: string, exerciseId: string, setIndex: number, setLog: SetLog) => Promise<void>;
  onMarkComplete: (date: string, workoutId: string) => Promise<void>;
  onToggleDone: (weekId: string, day: DayAbbr) => Promise<void>;
  completion: Record<string, CompletionEntry>;
  exerciseOverrides: SessionExerciseOverrides;
  onSetSessionExercises: (date: string, workoutId: string, exerciseIds: string[]) => void;
}

function Stepper({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => onChange(Math.max(0, Math.round((value - step) * 10) / 10))}
          style={{
            width: 52,
            height: 52,
            borderRadius: '12px 0 0 12px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: 22,
            fontWeight: 300,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value || ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          style={{
            width: 72,
            height: 52,
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderLeft: 'none',
            borderRight: 'none',
            color: 'var(--text)',
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 26,
            textAlign: 'center',
            outline: 'none',
          }}
        />
        <button
          onClick={() => onChange(Math.round((value + step) * 10) / 10)}
          style={{
            width: 52,
            height: 52,
            borderRadius: '0 12px 12px 0',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: 22,
            fontWeight: 300,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function MobileGymLog({
  day,
  weekId,
  strength,
  onLogSet,
  onMarkComplete,
  onToggleDone,
  completion,
  exerciseOverrides,
  onSetSessionExercises,
}: MobileGymLogProps) {
  const template = WORKOUTS[day.workoutId ?? ''];

  if (!template) {
    return (
      <div style={{ padding: 24, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
        no gym session today
      </div>
    );
  }

  const overrideIds = exerciseOverrides[day.date]?.workoutId === day.workoutId
    ? exerciseOverrides[day.date].exerciseIds
    : null;
  const allExercises = getSessionExercises(day.workoutId!, overrideIds);
  const allExercisesById = getAllExercises(day.workoutId!);

  const lastLog = lastWorkoutLog(strength, day.workoutId!, day.date);
  const currentLog = strength[day.date];
  const sessionKey = `${weekId}-${day.d}`;
  const isDone = completion[sessionKey]?.done ?? false;

  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [kg, setKg] = useState<number>(() => lastLog?.exercises[allExercises[0]?.id]?.[0]?.weight ?? 0);
  const [reps, setReps] = useState<number>(() => lastLog?.exercises[allExercises[0]?.id]?.[0]?.reps ?? 0);
  const [logging, setLogging] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState<Exercise[]>([]);

  const exercise = allExercises[exIdx];
  const totalSets = exercise?.sets ?? 1;
  const isLastSet = setIdx >= totalSets - 1;
  const isLastExercise = exIdx >= allExercises.length - 1;

  const advanceTo = useCallback(
    (nextEx: number, nextSet: number) => {
      const ex = allExercises[nextEx];
      if (!ex) return;
      const lastSet = lastLog?.exercises[ex.id]?.[nextSet];
      setKg(lastSet?.weight ?? 0);
      setReps(lastSet?.reps ?? 0);
      setExIdx(nextEx);
      setSetIdx(nextSet);
    },
    [allExercises, lastLog],
  );

  const handleLog = useCallback(async () => {
    if (!exercise || logging) return;
    setLogging(true);
    try {
      const isCheckable = exercise.unit === 'check' || exercise.unit === 'time';
      const setLog: SetLog = isCheckable
        ? { done: true }
        : exercise.unit === 'bodyweight'
        ? { reps: reps || undefined }
        : { weight: kg || undefined, reps: reps || undefined };

      await onLogSet(day.date, day.workoutId!, exercise.id, setIdx, setLog);

      if (isLastSet && isLastExercise) {
        await onMarkComplete(day.date, day.workoutId!);
        await onToggleDone(weekId, day.d);
      } else if (isLastSet) {
        advanceTo(exIdx + 1, 0);
      } else {
        advanceTo(exIdx, setIdx + 1);
      }
    } finally {
      setLogging(false);
    }
  }, [exercise, logging, kg, reps, setIdx, isLastSet, isLastExercise, exIdx, day, weekId, onLogSet, onMarkComplete, onToggleDone, advanceTo]);

  const enterEditMode = () => {
    setDraftOrder([...allExercises]);
    setEditMode(true);
  };

  const saveEditMode = () => {
    onSetSessionExercises(day.date, day.workoutId!, draftOrder.map((e) => e.id));
    setEditMode(false);
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const next = [...draftOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDraftOrder(next);
  };

  const swapExercise = (idx: number, newId: string) => {
    const newEx = allExercisesById[newId];
    if (!newEx) return;
    const next = [...draftOrder];
    next[idx] = newEx;
    setDraftOrder(next);
  };

  if (isDone) {
    return (
      <div
        className="app-shell safe-top"
        style={{ padding: '48px 24px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 24,
            color: 'var(--text)',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          {template.name} done
        </div>
        {currentLog?.completedAt && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            {new Date(currentLog.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  if (editMode) {
    const draftIds = new Set(draftOrder.map((e) => e.id));

    return (
      <div
        className="app-shell safe-top"
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            // edit session
          </div>
          <button
            onClick={() => setEditMode(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            cancel
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {draftOrder.map((ex, idx) => {
            const isLocked = !!ex.locked;
            const swappablePool = [
              ...template.alternatives,
              ...template.blocks.flatMap((b) => b.exercises),
            ].filter((a, i, arr) =>
              a.id !== ex.id &&
              !draftIds.has(a.id) &&
              arr.findIndex((x) => x.id === a.id) === i
            );

            return (
              <div
                key={ex.id}
                style={{
                  marginBottom: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Up/Down */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                      onClick={() => moveExercise(idx, -1)}
                      disabled={idx === 0}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-3)',
                        color: 'var(--text)',
                        fontSize: 16,
                        cursor: idx === 0 ? 'default' : 'pointer',
                        opacity: idx === 0 ? 0.3 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveExercise(idx, 1)}
                      disabled={idx === draftOrder.length - 1}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-3)',
                        color: 'var(--text)',
                        fontSize: 16,
                        cursor: idx === draftOrder.length - 1 ? 'default' : 'pointer',
                        opacity: idx === draftOrder.length - 1 ? 0.3 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ↓
                    </button>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                      {ex.name}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {ex.sets}×{ex.reps}
                    </div>
                  </div>

                  {/* Lock or swap select */}
                  {isLocked ? (
                    <span style={{ fontSize: 18 }} title="Mandatory — cannot be swapped">🔒</span>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) swapExercise(idx, e.target.value); }}
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: 'var(--text-muted)',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        maxWidth: 90,
                      }}
                    >
                      <option value="">swap…</option>
                      {swappablePool.map((alt) => (
                        <option key={alt.id} value={alt.id}>{alt.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="safe-bottom" style={{ paddingTop: 16 }}>
          <button
            onClick={saveEditMode}
            style={{
              width: '100%',
              minHeight: 52,
              borderRadius: 12,
              background: '#00D9FF',
              color: '#0B0D0F',
              border: 'none',
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Save &amp; start workout
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) return null;

  const blockName = template.blocks.find((b) => b.exercises.some((e) => e.id === exercise.id))?.name ?? '';
  const isCheckable = exercise.unit === 'check' || exercise.unit === 'time';

  return (
    <div
      className="app-shell safe-top"
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            // {template.name.toLowerCase()}{overrideIds ? ' · custom' : ''}{blockName ? ` · ${blockName.toLowerCase()}` : ''}
          </div>
          <button
            onClick={enterEditMode}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              cursor: 'pointer',
              padding: '3px 8px',
              letterSpacing: '0.03em',
            }}
          >
            edit
          </button>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          exercise {exIdx + 1} of {allExercises.length} · set {setIdx + 1} of {totalSets}
        </div>
      </div>

      {/* Exercise name */}
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontWeight: 900,
          fontSize: 30,
          lineHeight: 1.1,
          color: 'var(--text)',
          marginBottom: 6,
          letterSpacing: '-0.02em',
        }}
      >
        {exercise.name}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', marginBottom: exercise.note ? 10 : 36 }}>
        {exercise.sets}×{exercise.reps}
      </div>
      {exercise.note && (
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 32,
            padding: '10px 14px',
            background: 'var(--bg-2)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          {exercise.note}
        </div>
      )}

      {/* Input area */}
      <div style={{ flex: 1 }}>
        {isCheckable ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            {exercise.reps} — tap Log set to mark done
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            {exercise.unit === 'kg' && (
              <Stepper label="kg" value={kg} step={2.5} onChange={setKg} />
            )}
            <Stepper label="reps" value={reps} step={1} onChange={setReps} />
          </div>
        )}
      </div>

      {/* Sticky log button */}
      <div className="safe-bottom" style={{ paddingTop: 16, marginTop: 24 }}>
        <button
          onClick={handleLog}
          disabled={logging}
          style={{
            width: '100%',
            minHeight: 52,
            borderRadius: 12,
            background: logging ? 'var(--bg-2)' : '#00D9FF',
            color: logging ? 'var(--text-muted)' : '#0B0D0F',
            border: 'none',
            fontFamily: 'var(--sans)',
            fontWeight: 700,
            fontSize: 16,
            cursor: logging ? 'default' : 'pointer',
            transition: 'background 150ms',
          }}
        >
          {logging
            ? '…'
            : isLastSet && isLastExercise
            ? 'Finish workout ✓'
            : isLastSet
            ? 'Log set · next exercise →'
            : 'Log set →'}
        </button>
      </div>
    </div>
  );
}
