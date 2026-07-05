import { ComposedChart, Area, Line, ResponsiveContainer, YAxis, ReferenceLine, Tooltip } from 'recharts';
import type { PacePoint } from '../../lib/logic';
import { GOAL_PACE } from '../../constants/plan';

interface PaceLineChartProps {
  pace: PacePoint[];
  goalPaceMin: number;
}

function fmtPace(min: number): string {
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PaceLineChart({ pace, goalPaceMin }: PaceLineChartProps) {
  return (
    <div className="stride-rise mb-[22px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Avg easy pace</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">min/km</span>
      </div>
      <div className="mb-4 font-mono text-[10.5px] tracking-[0.02em] text-muted">
        Lower = fitter · trending toward MP {GOAL_PACE}
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pace} margin={{ top: 26, right: 4, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="paceAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* reversed: faster pace (smaller number) plots higher, toward the MP line */}
            <YAxis hide domain={['dataMin - 0.2', 'dataMax + 0.2']} reversed />
            <ReferenceLine
              y={goalPaceMin}
              stroke="var(--color-accent)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={(props: { viewBox?: { x?: number; y?: number; width?: number } }) => {
                const { x = 0, y = 0, width = 0 } = props.viewBox ?? {};
                return (
                  <text
                    x={x + width}
                    y={y - 8}
                    textAnchor="end"
                    fill="var(--color-accent)"
                    fontSize={10.5}
                    fontFamily="var(--font-mono)"
                  >
                    MP {GOAL_PACE}
                  </text>
                );
              }}
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
              formatter={(val, name) => [fmtPace(Number(val)), name === 'actual' ? 'Actual' : 'Planned']}
              labelFormatter={() => ''}
            />
            {/* baseValue="dataMax": fill toward the slowest pace, i.e. down/below the line on the reversed axis */}
            <Area
              type="monotone"
              dataKey="planned"
              baseValue="dataMax"
              stroke="var(--color-faint)"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#paceAreaFill)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3.5 flex gap-4 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5 bg-accent" />
          Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-3.5 border-t-2 border-dashed border-faint" />
          Planned
        </span>
      </div>
    </div>
  );
}
