import { useState, useCallback } from 'react';
import { WORKOUTS } from '../constants/workouts';
import { lastWorkoutLog } from '../lib/strength';
import type { Day, DayAbbr, CompletionEntry, SetLog, WorkoutLog } from '../types';

interface MobileGymLogProps {
  day: Day;
  weekId: string;
  strength: Record<string, WorkoutLog>;
  onLogSet: (date: string, workoutId: string, exerciseId: string, setIndex: number, setLog: SetLog) => Promise<void>;
  onMarkComplete: (date: string, workoutId: string) => Promise<void>;
  onToggleDone: (weekId: string, day: DayAbbr) => Promise<void>;
  completion: Record<string, CompletionEntry>;
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
}: MobileGymLogProps) {
  const template = WORKOUTS[day.workoutId ?? ''];

  if (!template) {
    return (
      <div style={{ padding: 24, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
        no gym session today
      </div>
    );
  }

  const allExercises = template.blocks.flatMap((b) => b.exercises);
  const lastLog = lastWorkoutLog(strength, day.workoutId!, day.date);
  const currentLog = strength[day.date];
  const sessionKey = `${weekId}-${day.d}`;
  const isDone = completion[sessionKey]?.done ?? false;

  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [kg, setKg] = useState<number>(() => lastLog?.exercises[allExercises[0]?.id]?.[0]?.weight ?? 0);
  const [reps, setReps] = useState<number>(() => lastLog?.exercises[allExercises[0]?.id]?.[0]?.reps ?? 0);
  const [logging, setLogging] = useState(false);

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
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            marginBottom: 4,
          }}
        >
          // {template.name.toLowerCase()} · {blockName.toLowerCase()}
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
