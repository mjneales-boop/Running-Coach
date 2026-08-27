import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { SecLabel } from '../ui/SecLabel';
import {
  filterExercises,
  loggedExercises,
  prList,
  progressionSeries,
  standingFor,
} from '../../lib/strength';
import type { StrengthIndex } from '../../lib/strength';
import type { WorkoutLog } from '../../types';

type Metric = 'topSet' | 'est1RM';

interface ExerciseProgressionProps {
  strength: Record<string, WorkoutLog>;
  index: StrengthIndex;
  todayStr: string;
}

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ExerciseProgression({ strength, index, todayStr }: ExerciseProgressionProps) {
  const all = loggedExercises(index);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('topSet');

  // Defaults to the most recently logged lift, which is nearly always the one
  // the athlete came here to look at.
  const active = selected ?? all[0]?.exerciseId ?? null;
  const matches = filterExercises(all, query);
  const series = active ? progressionSeries(strength, active, metric) : [];
  const chartData = series.map((pt) => ({ ...pt, label: shortDate(pt.date) }));
  const prs = prList(index, todayStr);

  if (all.length === 0) {
    return (
      <section className="py-7">
        <SecLabel>Progression</SecLabel>
        <p className="font-mono text-[12px] text-faint">No lifts logged yet.</p>
      </section>
    );
  }

  return (
    <section className="py-7">
      <SecLabel>Progression</SecLabel>

      {/* One searchable list, not workout tabs then exercise chips. That pairing
          was two steps to reach a lift the athlete could already name. */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search lifts"
        aria-label="Search lifts"
        className="mb-3 min-h-[44px] w-full rounded-[10px] border border-hairline-strong bg-field px-3.5 font-mono text-[12px] text-ink outline-none placeholder:text-faint"
      />

      {/* pr-2 keeps the session count clear of the scrollbar gutter. */}
      <div className="mb-5 max-h-[172px] overflow-y-auto pr-2">
        {matches.length === 0 && (
          <p className="py-3 font-mono text-[11px] text-faint">No lift matches “{query}”.</p>
        )}
        {matches.map((ex) => (
          <button
            key={ex.exerciseId}
            type="button"
            onClick={() => setSelected(ex.exerciseId)}
            className={`flex min-h-[44px] w-full items-center justify-between gap-3 border-b border-hairline-soft px-1 text-left ${
              active === ex.exerciseId ? 'text-accent' : 'text-ink'
            }`}
          >
            <span className="truncate font-display text-[13.5px] font-semibold">{ex.name}</span>
            <span className="stride-num flex-none font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
              {shortDate(ex.lastDate)} · {ex.sessions}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-1.5 rounded-xl border border-hairline bg-field p-1">
        {(['topSet', 'est1RM'] as Metric[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`min-h-[36px] flex-1 rounded-lg px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-colors ${
              metric === m ? 'bg-accent text-accent-ink' : 'text-muted'
            }`}
          >
            {m === 'topSet' ? 'Top set' : 'Est. 1RM'}
          </button>
        ))}
      </div>

      {series.length > 1 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fill: 'var(--color-faint)' }}
              axisLine={{ stroke: 'var(--color-hairline)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fill: 'var(--color-faint)' }}
              axisLine={false}
              tickLine={false}
              width={36}
              domain={['dataMin - 5', 'dataMax + 5']}
              // Without this the auto ticks land on values like 38.75.
              tickFormatter={(v: number) => String(Math.round(v))}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-hairline)',
                borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-ink)',
              }}
              formatter={(v) => [`${v} kg`, metric === 'topSet' ? 'Top set' : 'Est. 1RM']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2}
              isAnimationActive={false}
              // Only the latest point is marked — the line carries the rest.
              dot={(props) => {
                const last = props.index === chartData.length - 1;
                return last ? (
                  <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill="var(--color-accent)" />
                ) : (
                  <circle key={props.index} cx={props.cx} cy={props.cy} r={0} fill="none" />
                );
              }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[180px] items-center justify-center font-mono text-[12px] text-faint">
          {series.length === 1 ? 'One session so far — no trend yet' : 'No data for this lift'}
        </div>
      )}

      {prs.length > 0 && (
        <div className="mt-7">
          <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            Personal records
          </div>
          {prs.slice(0, 8).map((pr) => (
            <div
              key={pr.exerciseId}
              className="flex items-baseline justify-between gap-3 border-t border-hairline-soft py-2.5"
            >
              <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold">
                {pr.name}
              </span>
              <span className="stride-num flex-none font-mono text-[11.5px] text-[#C4CCD3]">
                {pr.weight} × {pr.reps ?? '—'}
              </span>
              <span className="stride-num w-[74px] flex-none text-right font-mono text-[10px] uppercase tracking-[0.06em] text-faint">
                {standingFor(pr.standingDays)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
