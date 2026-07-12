import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { usePlanConfig } from '../../hooks/usePlanConfig';
import { getWorkoutPaceProgression } from '../../lib/coaching';
import type { WorkoutPaceCategory } from '../../types';

interface PaceProgressionChartProps {
  currentWeekId: string;
}

const CATEGORY_COLOR: Record<WorkoutPaceCategory, string> = {
  intro: '#73726c',
  subThreshold: '#2a78d6',
  threshold: '#1baf7a',
  marathonPace: '#eb6834',
};

const CATEGORY_LABEL: Record<WorkoutPaceCategory, string> = {
  intro: 'intro',
  subThreshold: 'sub-threshold',
  threshold: 'threshold',
  marathonPace: 'marathon pace',
};

function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PaceProgressionChart({ currentWeekId }: PaceProgressionChartProps) {
  const { weeks } = usePlanConfig();
  const points = getWorkoutPaceProgression(weeks);

  return (
    <div className="stride-rise mb-6 rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Pace progression</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">min/km</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        {(Object.keys(CATEGORY_LABEL) as WorkoutPaceCategory[]).map((cat) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: CATEGORY_COLOR[cat] }} />
            {CATEGORY_LABEL[cat]}
          </span>
        ))}
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} reversed />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-faint)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline-strong)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-ink)',
              }}
              formatter={(val, _name, item) => {
                const category = item?.payload?.category as WorkoutPaceCategory | undefined;
                return [`${fmtPace(Number(val))} /km`, category ? CATEGORY_LABEL[category] : ''];
              }}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="secPerKm"
              stroke="var(--color-faint)"
              strokeWidth={2}
              dot={(dotProps: unknown) => {
                const p = dotProps as { cx?: number; cy?: number; payload?: { weekId: string; category: WorkoutPaceCategory } };
                const isCurrent = p.payload?.weekId === currentWeekId;
                const color = p.payload ? CATEGORY_COLOR[p.payload.category] : 'var(--color-faint)';
                return (
                  <g key={`dot-${p.payload?.weekId ?? Math.random()}`}>
                    {isCurrent && (
                      <circle cx={p.cx} cy={p.cy} r={9} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
                    )}
                    <circle cx={p.cx} cy={p.cy} r={isCurrent ? 5 : 3.5} fill={color} />
                  </g>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
