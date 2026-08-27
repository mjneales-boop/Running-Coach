import { useState } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { SecLabel } from '../ui/SecLabel';
import { StatRow } from '../progress/StatRow';
import { MUSCLE_GROUPS } from '../../constants/workouts';
import type { MuscleGroup } from '../../constants/workouts';
import { weeklyTonnageSeries } from '../../lib/strength';
import type { WorkoutLog, Week } from '../../types';

/** Weeks of history shown. Enough to read a trend, few enough to stay legible at 375px. */
const WEEKS_SHOWN = 9;

type Filter = MuscleGroup | 'all';

interface TonnageChartProps {
  strength: Record<string, WorkoutLog>;
  weeks: Week[];
  todayStr: string;
}

export function TonnageChart({ strength, weeks, todayStr }: TonnageChartProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const full = weeklyTonnageSeries(strength, weeks, filter === 'all' ? undefined : filter, todayStr);

  // Window on the current week rather than the end of the plan — the back half
  // of an 18-week block is all future weeks with nothing in them.
  const currentIndex = full.findIndex((p) => p.isCurrent);
  const end = currentIndex >= 0 ? currentIndex + 1 : full.findIndex((p) => p.isFuture);
  const sliceEnd = end > 0 ? end : full.length;
  const series = full.slice(Math.max(0, sliceEnd - WEEKS_SHOWN), sliceEnd);

  const settled = series.filter((p) => !p.isCurrent);
  const lastFour = settled.slice(-4);
  const fourWeekAvg = lastFour.length
    ? lastFour.reduce((s, p) => s + p.tonnage, 0) / lastFour.length
    : 0;
  const thisWeek = series.find((p) => p.isCurrent)?.tonnage ?? 0;
  const delta = fourWeekAvg > 0 ? Math.round(((thisWeek - fourWeekAvg) / fourWeekAvg) * 100) : 0;

  const asTonnes = (kg: number) => (kg >= 1000 ? (kg / 1000).toFixed(1) : String(Math.round(kg)));
  const unit = (kg: number) => (kg >= 1000 ? 't' : 'kg');

  const hasData = series.some((p) => p.tonnage > 0);
  const setsWithoutTonnage = series.reduce((n, p) => n + p.sets, 0) > 0 && !hasData;

  return (
    <section className="border-b border-hairline py-7">
      <SecLabel>Tonnage</SecLabel>

      <StatRow
        stats={[
          { label: '4-week avg', value: asTonnes(fourWeekAvg), unit: unit(fourWeekAvg) },
          { label: 'This week', value: asTonnes(thisWeek), unit: unit(thisWeek) },
          { label: 'Δ', value: `${delta > 0 ? '+' : ''}${delta}`, unit: '%', accent: delta > 0 },
        ]}
      />

      {/* The chips are the legend — the bars stay one colour deliberately. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', ...MUSCLE_GROUPS] as Filter[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setFilter(m)}
            className={`min-h-[36px] rounded-full border px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
              filter === m
                ? 'border-[rgba(0,217,255,0.4)] bg-accent-tint text-accent'
                : 'border-hairline text-muted'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={168}>
          <BarChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="26%">
            <XAxis
              dataKey="num"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fill: 'var(--color-faint)' }}
              axisLine={{ stroke: 'var(--color-hairline)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fill: 'var(--color-faint)' }}
              axisLine={false}
              tickLine={false}
              // 42, not 34: "12.0t" was being clipped to "l2.0t" at the top of the axis.
              width={42}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}`)}
            />
            <Bar dataKey="tonnage" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {series.map((p) => (
                <Cell
                  key={p.weekId}
                  fill={p.isCurrent ? 'var(--color-accent)' : 'var(--color-hairline-strong)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[168px] items-center justify-center px-4 text-center font-mono text-[12px] leading-[1.6] text-faint">
          {filter !== 'all'
            ? `No ${filter} sets logged in these weeks`
            : setsWithoutTonnage
              ? 'Sets logged, but none carrying weight yet'
              : 'No sessions logged yet'}
        </div>
      )}

      {/* Stated rather than silently fudged. */}
      <p className="mt-3 font-mono text-[10px] leading-[1.6] text-faint">
        Tonnage is weight × reps on loaded sets. Bodyweight and timed work counts
        toward sets, not tonnage.
      </p>
    </section>
  );
}
