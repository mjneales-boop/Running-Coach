import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { WORKOUTS } from '../constants/workouts';
import { progressionSeries, est1RM } from '../lib/strength';
import type { WorkoutLog } from '../types';

const WORKOUT_ORDER = ['chestback', 'shouldersarms', 'legs'] as const;
const WORKOUT_LABELS: Record<string, string> = {
  chestback: 'chest / back',
  shouldersarms: 'shoulders / arms',
  legs: 'legs',
};

interface StrengthViewProps {
  strength: Record<string, WorkoutLog>;
}

export function StrengthView({ strength }: StrengthViewProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<string>('chestback');
  const [selectedExercise, setSelectedExercise] = useState<string>(() => {
    const template = WORKOUTS['chestback'];
    return [...template.blocks.flatMap((b) => b.exercises), ...template.alternatives].find((e) => e.tracked)?.id ?? '';
  });
  const [metric, setMetric] = useState<'topSet' | 'est1RM'>('topSet');

  const trackedExercises = useMemo(() => {
    const template = WORKOUTS[selectedWorkout];
    if (!template) return [];
    return [
      ...template.blocks.flatMap((b) => b.exercises),
      ...template.alternatives,
    ].filter((e) => e.tracked);
  }, [selectedWorkout]);

  const handleWorkoutChange = (workoutId: string) => {
    setSelectedWorkout(workoutId);
    const template = WORKOUTS[workoutId];
    const first = [
      ...template.blocks.flatMap((b) => b.exercises),
      ...template.alternatives,
    ].find((e) => e.tracked);
    setSelectedExercise(first?.id ?? '');
  };

  const series = useMemo(
    () => progressionSeries(strength, selectedExercise, metric),
    [strength, selectedExercise, metric],
  );

  const chartData = useMemo(
    () => series.map((pt) => ({ ...pt, date: pt.date.slice(5) })),
    [series],
  );

  const prData = useMemo(() => {
    if (series.length === 0) return null;
    let bestWeight = 0;
    let best1RM = 0;
    let bestSet: { weight: number; reps?: number } | null = null;
    for (const log of Object.values(strength)) {
      const sets = log.exercises[selectedExercise] ?? [];
      for (const s of sets) {
        if (!s.weight) continue;
        if (s.weight > bestWeight) {
          bestWeight = s.weight;
          bestSet = { weight: s.weight, reps: s.reps };
        }
        if (s.weight && s.reps) {
          const e = est1RM(s.weight, s.reps);
          if (e > best1RM) best1RM = e;
        }
      }
    }
    return bestSet ? { bestSet, best1RM } : null;
  }, [strength, selectedExercise, series]);

  const recentSessions = useMemo(() => {
    return Object.values(strength)
      .filter((l) => l.workoutId === selectedWorkout && l.exercises[selectedExercise]?.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [strength, selectedWorkout, selectedExercise]);

  const selectedExerciseName = useMemo(() => {
    const template = WORKOUTS[selectedWorkout];
    return template?.blocks.flatMap((b) => b.exercises).find((e) => e.id === selectedExercise)?.name ?? '';
  }, [selectedWorkout, selectedExercise]);

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: 'var(--text-muted)',
          textTransform: 'lowercase',
          marginBottom: 24,
        }}
      >
        // strength progression
      </div>

      {/* Workout group tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {WORKOUT_ORDER.map((wid) => (
          <button
            key={wid}
            onClick={() => handleWorkoutChange(wid)}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: selectedWorkout === wid ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: selectedWorkout === wid ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              letterSpacing: '0.04em',
              transition: 'color 150ms, border-color 150ms',
            }}
          >
            {WORKOUT_LABELS[wid]}
          </button>
        ))}
      </div>

      {/* Exercise selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {trackedExercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setSelectedExercise(ex.id)}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              padding: '5px 12px',
              borderRadius: 20,
              border: `1px solid ${selectedExercise === ex.id ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedExercise === ex.id ? 'rgba(0,217,255,0.08)' : 'var(--bg-3)',
              color: selectedExercise === ex.id ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'border-color 150ms, color 150ms, background 150ms',
            }}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* Metric toggle + PR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['topSet', 'est1RM'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                border: `1px solid ${metric === m ? 'var(--accent)' : 'var(--border)'}`,
                background: metric === m ? 'rgba(0,217,255,0.08)' : 'transparent',
                color: metric === m ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'border-color 150ms, color 150ms',
              }}
            >
              {m === 'topSet' ? 'top set' : 'est. 1rm'}
            </button>
          ))}
        </div>

        {prData && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
              pr
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
              {prData.bestSet.weight}kg × {prData.bestSet.reps ?? '?'}
              {prData.best1RM > 0 && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · est. 1RM {prData.best1RM}kg</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 16px 12px',
          marginBottom: 24,
        }}
      >
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}kg`}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--text)',
                }}
                formatter={(value) => [`${value}kg`, metric === 'topSet' ? 'Top set' : 'Est. 1RM']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00D9FF"
                strokeWidth={2}
                dot={{ fill: '#00D9FF', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            no data yet — log your first session
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 12,
          }}>
            Recent — {selectedExerciseName}
          </div>
          {recentSessions.map((log) => {
            const sets = log.exercises[selectedExercise] ?? [];
            const summary = sets
              .filter((s) => s.weight != null || s.reps != null)
              .map((s) => s.weight != null ? `${s.weight}×${s.reps ?? '?'}` : `${s.reps}`)
              .join(', ');
            const dateLabel = new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div
                key={log.date}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', minWidth: 56 }}>
                  {dateLabel}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                  {summary || '—'}
                </span>
                {log.completedAt && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--success)', marginLeft: 'auto' }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
