import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import type { WeekVolumePoint } from '../../lib/logic';

interface VolumeBarChartProps {
  volume: WeekVolumePoint[];
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: WeekVolumePoint;
}

/**
 * Each week is drawn as its TARGET — a dashed outline — with the km actually completed
 * filling it from the bottom. Future weeks are empty outlines, the current week fills as
 * the week goes on, so "how close am I to this week's mileage" is readable at a glance
 * instead of every bar looking finished.
 */
function VolumeBar({ x = 0, y = 0, width = 0, height = 0, payload }: BarShapeProps) {
  if (!payload) return null;
  const { km, targetKm, isCurrent } = payload;
  const ratio = targetKm > 0 ? Math.min(1, km / targetKm) : 0;
  const fillH = height * ratio;
  const r = 3;

  return (
    <g>
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={Math.max(0, width - 1)}
        height={Math.max(0, height - 1)}
        rx={r}
        fill="none"
        stroke={isCurrent ? 'var(--color-accent)' : 'var(--color-hairline-strong)'}
        strokeOpacity={isCurrent ? 0.55 : 1}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {fillH > 0 && (
        <rect
          x={x}
          y={y + height - fillH}
          width={width}
          height={fillH}
          rx={Math.min(r, fillH)}
          fill={isCurrent ? 'var(--color-accent)' : 'var(--color-faint)'}
        />
      )}
    </g>
  );
}

export function VolumeBarChart({ volume }: VolumeBarChartProps) {
  return (
    <div className="stride-rise mb-[22px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-5 flex items-baseline justify-between">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Weekly volume</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">km · {volume.length} wk</span>
      </div>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={volume} barCategoryGap={3}>
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline-strong)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-ink)',
              }}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.label ?? ''}
              formatter={(_val, _name, item) => {
                const w = item?.payload as WeekVolumePoint;
                return [w?.isPlanned ? `${w.targetKm} km target` : `${w?.km} / ${w?.targetKm} km`, 'Volume'];
              }}
            />
            <Bar dataKey="targetKm" shape={<VolumeBar />} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
        <span>Wk 1</span>
        <span className="text-accent">Now</span>
        <span>Wk {volume.length}</span>
      </div>
      <div className="mt-3 flex gap-4 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3.5 rounded-[2px] bg-faint" />
          Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3.5 rounded-[2px] border border-dashed border-hairline-strong" />
          Target
        </span>
      </div>
    </div>
  );
}
