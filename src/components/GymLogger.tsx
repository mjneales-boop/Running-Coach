import { useRef, useCallback, useState } from 'react';
import { WORKOUTS } from '../constants/workouts';
import { lastWorkoutLog } from '../lib/strength';
import { getSessionExercises, getAllExercises } from '../lib/exercises';
import type { Day, DayAbbr, CompletionEntry, SetLog, WorkoutLog, SessionExerciseOverrides } from '../types';
import type { Exercise } from '../constants/workouts';

interface GymLoggerProps {
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

const inputBase: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 13,
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '5px 8px',
  width: 70,
  outline: 'none',
  transition: 'border-color 150ms ease',
};

function SetRow({
  exercise,
  setIndex,
  setLog,
  lastSet,
  onUpdate,
}: {
  exercise: Exercise;
  setIndex: number;
  setLog: SetLog | undefined;
  lastSet: SetLog | undefined;
  onUpdate: (setIndex: number, log: SetLog) => void;
}) {
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);

  const lastLabel = lastSet
    ? exercise.unit === 'kg' && lastSet.weight != null
      ? `last: ${lastSet.weight}kg × ${lastSet.reps ?? '?'}`
      : lastSet.reps != null
      ? `last: ${lastSet.reps}`
      : undefined
    : undefined;

  const handleChange = useCallback(() => {
    if (exercise.unit === 'kg') {
      const w = parseFloat(weightRef.current?.value ?? '');
      const r = parseInt(repsRef.current?.value ?? '');
      onUpdate(setIndex, { weight: isNaN(w) ? undefined : w, reps: isNaN(r) ? undefined : r });
    } else if (exercise.unit === 'bodyweight') {
      const r = parseInt(repsRef.current?.value ?? '');
      onUpdate(setIndex, { reps: isNaN(r) ? undefined : r });
    }
  }, [exercise.unit, setIndex, onUpdate]);

  const setNum = (
    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', width: 20, display: 'inline-block', flexShrink: 0 }}>
      {setIndex + 1}
    </span>
  );

  if (exercise.unit === 'kg') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {setNum}
        <input
          ref={weightRef}
          type="number"
          inputMode="decimal"
          step="2.5"
          min="0"
          defaultValue={setLog?.weight ?? ''}
          placeholder={lastLabel?.split(' × ')[0]?.replace('last: ', '') ?? ''}
          style={inputBase}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)'; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; handleChange(); }}
        />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>kg</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>×</span>
        <input
          ref={repsRef}
          type="number"
          inputMode="decimal"
          min="0"
          defaultValue={setLog?.reps ?? ''}
          placeholder="reps"
          style={{ ...inputBase, width: 58 }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)'; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; handleChange(); }}
        />
        {lastLabel && !setLog?.weight && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>{lastLabel}</span>
        )}
        {setLog?.weight != null && (
          <span style={{ color: 'var(--success)', fontSize: 14 }}>✓</span>
        )}
      </div>
    );
  }

  if (exercise.unit === 'bodyweight') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {setNum}
        <input
          ref={repsRef}
          type="number"
          inputMode="decimal"
          min="0"
          defaultValue={setLog?.reps ?? ''}
          placeholder={lastLabel ?? 'reps'}
          style={{ ...inputBase, width: 70 }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)'; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; handleChange(); }}
        />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>reps</span>
        {setLog?.reps != null && (
          <span style={{ color: 'var(--success)', fontSize: 14 }}>✓</span>
        )}
      </div>
    );
  }

  if (exercise.unit === 'time') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {setNum}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={setLog?.done ?? false}
            onChange={(e) => onUpdate(setIndex, { done: e.target.checked })}
            style={{ accentColor: 'var(--success)', width: 16, height: 16 }}
          />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>{exercise.reps}</span>
        </label>
      </div>
    );
  }

  return null;
}

export function GymLogger({
  day,
  weekId,
  strength,
  onLogSet,
  onMarkComplete,
  onToggleDone,
  completion,
  exerciseOverrides,
  onSetSessionExercises,
}: GymLoggerProps) {
  const template = WORKOUTS[day.workoutId!];
  if (!template) return null;

  const overrideIds = exerciseOverrides[day.date]?.workoutId === day.workoutId
    ? exerciseOverrides[day.date].exerciseIds
    : null;
  const activeExercises = getSessionExercises(day.workoutId!, overrideIds);
  const allExercisesById = getAllExercises(day.workoutId!);

  const log = strength[day.date];
  const lastLog = lastWorkoutLog(strength, day.workoutId!, day.date);
  const sessionKey = `${weekId}-${day.d}`;
  const isDone = completion[sessionKey]?.done ?? false;

  const [editMode, setEditMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState<Exercise[]>([]);
  const [swapOpenFor, setSwapOpenFor] = useState<string | null>(null);

  const enterEditMode = () => {
    setDraftOrder([...activeExercises]);
    setSwapOpenFor(null);
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
    setSwapOpenFor(null);
  };

  const handleUpdate = useCallback(
    (exerciseId: string, setIndex: number, setLog: SetLog) => {
      onLogSet(day.date, day.workoutId!, exerciseId, setIndex, setLog);
    },
    [day.date, day.workoutId, onLogSet],
  );

  const handleMarkComplete = useCallback(async () => {
    await onMarkComplete(day.date, day.workoutId!);
    await onToggleDone(weekId, day.d);
  }, [day.date, day.workoutId, weekId, day.d, onMarkComplete, onToggleDone]);

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    fontFamily: 'var(--mono)',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 5,
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg-3)',
    color: active ? '#04222A' : 'var(--text-muted)',
    cursor: 'pointer',
    letterSpacing: '0.03em',
  });

  // Edit mode view
  if (editMode) {
    const draftIds = new Set(draftOrder.map((e) => e.id));

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            // edit session
          </span>
          <button onClick={saveEditMode} style={{ ...btnStyle(true), fontSize: 12, padding: '5px 12px' }}>
            Done
          </button>
        </div>

        {draftOrder.map((exercise, idx) => {
          const isLocked = !!exercise.locked;
          const isSwapOpen = swapOpenFor === exercise.id;
          const swappablePool = [
            ...template.alternatives,
            ...template.blocks.flatMap((b) => b.exercises).filter((e) => !draftIds.has(e.id) || e.id === exercise.id),
          ].filter((a, i, arr) =>
            (a.id !== exercise.id) &&
            !draftIds.has(a.id) &&
            arr.findIndex((x) => x.id === a.id) === i
          );

          return (
            <div
              key={exercise.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-2)',
              }}
            >
              {/* Up/Down */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => moveExercise(idx, -1)}
                  disabled={idx === 0}
                  style={{ ...btnStyle(), padding: '1px 5px', opacity: idx === 0 ? 0.3 : 1 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveExercise(idx, 1)}
                  disabled={idx === draftOrder.length - 1}
                  style={{ ...btnStyle(), padding: '1px 5px', opacity: idx === draftOrder.length - 1 ? 0.3 : 1 }}
                >
                  ↓
                </button>
              </div>

              {/* Name */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {exercise.name}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  {exercise.sets}×{exercise.reps}
                </div>
              </div>

              {/* Swap / Lock */}
              {isLocked ? (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }} title="Mandatory — cannot be swapped">🔒</span>
              ) : (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setSwapOpenFor(isSwapOpen ? null : exercise.id)}
                    style={{ ...btnStyle(isSwapOpen), fontSize: 11 }}
                  >
                    swap
                  </button>
                  {isSwapOpen && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: 4,
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      zIndex: 50,
                      minWidth: 200,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}>
                      {swappablePool.length === 0 ? (
                        <div style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                          no alternatives
                        </div>
                      ) : swappablePool.map((alt) => (
                        <button
                          key={alt.id}
                          onClick={() => swapExercise(idx, alt.id)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '9px 14px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--text)',
                            fontFamily: 'var(--sans)',
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-2)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          {alt.name}
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                            {alt.sets}×{alt.reps}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Normal log view
  const hasOverride = overrideIds !== null;

  return (
    <div>
      {/* Header row with optional Edit button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          // {template.name.toLowerCase()}{hasOverride ? ' · custom' : ''}
        </span>
        <button onClick={enterEditMode} style={btnStyle()}>
          edit session
        </button>
      </div>

      {hasOverride ? (
        // Flat list when override is active
        activeExercises.map((exercise) => {
          const exerciseSets = log?.exercises[exercise.id] ?? [];
          const lastExerciseSets = lastLog?.exercises[exercise.id] ?? [];

          return (
            <div key={exercise.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {exercise.name}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {exercise.sets}×{exercise.reps}
                </span>
              </div>
              {exercise.note && (
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                  {exercise.note}
                </div>
              )}
              {exercise.unit === 'check' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={exerciseSets[0]?.done ?? false}
                    onChange={(e) => handleUpdate(exercise.id, 0, { done: e.target.checked })}
                    style={{ accentColor: 'var(--success)', width: 16, height: 16 }}
                  />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>done</span>
                </label>
              ) : (
                Array.from({ length: exercise.sets }).map((_, si) => (
                  <SetRow
                    key={si}
                    exercise={exercise}
                    setIndex={si}
                    setLog={exerciseSets[si]}
                    lastSet={lastExerciseSets[si]}
                    onUpdate={(idx, sl) => handleUpdate(exercise.id, idx, sl)}
                  />
                ))
              )}
            </div>
          );
        })
      ) : (
        // Default block view
        template.blocks.map((block, bi) => (
          <div key={block.name} style={{ marginBottom: bi < template.blocks.length - 1 ? 24 : 0 }}>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 14,
            }}>
              {block.name}
            </div>

            {block.exercises.map((exercise) => {
              const exerciseSets = log?.exercises[exercise.id] ?? [];
              const lastExerciseSets = lastLog?.exercises[exercise.id] ?? [];

              return (
                <div key={exercise.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {exercise.name}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {exercise.sets}×{exercise.reps}
                    </span>
                  </div>

                  {exercise.note && (
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                      {exercise.note}
                    </div>
                  )}

                  {exercise.unit === 'check' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={exerciseSets[0]?.done ?? false}
                        onChange={(e) => handleUpdate(exercise.id, 0, { done: e.target.checked })}
                        style={{ accentColor: 'var(--success)', width: 16, height: 16 }}
                      />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>done</span>
                    </label>
                  ) : (
                    Array.from({ length: exercise.sets }).map((_, si) => (
                      <SetRow
                        key={si}
                        exercise={exercise}
                        setIndex={si}
                        setLog={exerciseSets[si]}
                        lastSet={lastExerciseSets[si]}
                        onUpdate={(idx, sl) => handleUpdate(exercise.id, idx, sl)}
                      />
                    ))
                  )}
                </div>
              );
            })}

            {bi < template.blocks.length - 1 && (
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 0' }} />
            )}
          </div>
        ))
      )}

      <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 18px' }} />

      {isDone && log?.completedAt && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--success)', marginBottom: 14 }}>
          ✓ Gym completed {new Date(log.completedAt).toLocaleString()}
        </div>
      )}

      <button
        onClick={handleMarkComplete}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderRadius: 8,
          padding: '14px 22px',
          cursor: 'pointer',
          border: `1px solid ${isDone ? 'var(--success)' : 'var(--accent)'}`,
          background: isDone ? 'var(--success)' : 'var(--accent)',
          color: '#04222A',
          transition: 'background 150ms ease, border-color 150ms ease',
          width: '100%',
        }}
      >
        {isDone ? '✓ Gym Done — Undo' : 'Mark Gym Complete'}
      </button>
    </div>
  );
}
