import { ComposedChart, Area, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import type { PaceProgression } from '../../lib/logic';

interface PaceLineChartProps {
  pace: PaceProgression;
}

function fmtPace(min: number): string {
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PaceLineChart({ pace }: PaceLineChartProps) {
  const { points, easyLo, easyHi } = pace;
  return (
    <div className="stride-rise mb-[22px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Avg easy pace</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">min/km</span>
      </div>
      <div className="mb-4 font-mono text-[10.5px] tracking-[0.02em] text-muted">
        {/* The band is flat on purpose — easy pace doesn't ramp toward race pace over a block.
            The signal is whether the line sits inside it, not whether it climbs. */}
        Easy zone {fmtPace(easyLo)}–{fmtPace(easyHi)} · stay in the band
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 6, right: 4, bottom: 4, left: 4 }}>
            {/* reversed: faster pace (smaller number) plots higher */}
            <YAxis hide domain={['dataMin - 0.1', 'dataMax + 0.1']} reversed />
            <Tooltip
              contentStyle={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline-strong)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-ink)',
              }}
              formatter={(val, name) => {
                if (name === 'band') return [`${fmtPace(easyLo)}–${fmtPace(easyHi)}`, 'Easy zone'];
                return [fmtPace(Number(val)), 'Actual'];
              }}
              labelFormatter={() => ''}
            />
            {/* Range area: [fast bound, slow bound] paints the Easy zone as a flat target band. */}
            <Area
              dataKey="band"
              stroke="var(--color-faint)"
              strokeWidth={1}
              strokeDasharray="5 4"
              strokeOpacity={0.55}
              fill="var(--color-accent)"
              fillOpacity={0.1}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
              connectNulls
              // Recharts draws the entrance animation with a stroke-dasharray sweep that
              // intermittently never completes, leaving the dots but no line. The band
              // doesn't animate either, so nothing is lost by turning it off.
              isAnimationActive={false}
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
          <span className="inline-block h-2.5 w-3.5 rounded-[2px] border border-dashed border-faint bg-accent/10" />
          Easy zone
        </span>
      </div>
    </div>
  );
}
