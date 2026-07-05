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
  chestback: 'Chest / Back',
  shouldersarms: 'Shoulders / Arms',
  legs: 'Legs',
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

  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : null;

  return (
    <div>
      {/* Muscle group tabs */}
      <div className="mb-6 flex gap-6 border-b border-hairline">
        {WORKOUT_ORDER.map((wid) => (
          <button
            key={wid}
            onClick={() => handleWorkoutChange(wid)}
            className={`-mb-px border-b-2 pb-3 font-display text-[13px] font-bold uppercase tracking-[0.03em] ${
              selectedWorkout === wid ? 'border-accent text-accent' : 'border-transparent text-muted'
            }`}
          >
            {WORKOUT_LABELS[wid]}
          </button>
        ))}
      </div>

      {/* Exercise selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {trackedExercises.map((ex) => {
          const isActive = selectedExercise === ex.id;
          return (
            <button
              key={ex.id}
              onClick={() => setSelectedExercise(ex.id)}
              className={`rounded-full border px-3.5 py-2 font-display text-[12.5px] font-semibold transition-colors ${
                isActive
                  ? 'border-[rgba(0,217,255,0.4)] bg-accent-tint text-accent'
                  : 'border-hairline text-muted'
              }`}
            >
              {ex.name}
            </button>
          );
        })}
      </div>

      {/* Metric toggle + PR */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-xl border border-hairline bg-field p-1">
          {(['topSet', 'est1RM'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-lg px-3 py-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                metric === m ? 'bg-accent text-accent-ink' : 'text-muted'
              }`}
            >
              {m === 'topSet' ? 'Top set' : 'Est. 1RM'}
            </button>
          ))}
        </div>

        {latestValue != null && (
          <div className="text-right">
            <div className="font-display text-2xl font-extrabold text-accent">
              {latestValue}
              <span className="ml-0.5 text-xs font-medium text-muted">kg</span>
            </div>
            {prData && (
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-faint">
                PR {prData.bestSet.weight} kg × {prData.bestSet.reps ?? '?'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-2xl border border-hairline bg-surface px-2.5 pb-1 pt-5">
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-muted)' }}
                axisLine={{ stroke: 'var(--color-hairline)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}kg`}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 10,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-ink)',
                }}
                formatter={(value) => [`${value}kg`, metric === 'topSet' ? 'Top set' : 'Est. 1RM']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-accent)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center font-mono text-[13px] text-faint">
            No data yet — log your first session
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">
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
              <div key={log.date} className="flex items-center gap-4 border-t border-hairline-soft py-3 first:border-t-0">
                <span className="w-14 flex-none font-mono text-[11.5px] text-muted">{dateLabel}</span>
                <span className="flex-1 text-[13.5px] text-[#D3DAE1]">{summary || '—'}</span>
                {log.completedAt && <span className="flex-none text-accent">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
