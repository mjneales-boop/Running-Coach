import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import type { WeekVolumePoint } from '../../lib/logic';

interface VolumeBarChartProps {
  volume: WeekVolumePoint[];
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
              formatter={(val, _name, item) => [
                `${val} km${(item?.payload as WeekVolumePoint)?.isPlanned ? ' (planned)' : ''}`,
                'Volume',
              ]}
            />
            <Bar dataKey="km" radius={[3, 3, 0, 0]}>
              {volume.map((w) => (
                <Cell key={w.weekId} fill={w.isCurrent ? 'var(--color-accent)' : 'var(--color-faint)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
        <span>Wk 1</span>
        <span className="text-accent">Now</span>
        <span>Wk {volume.length}</span>
      </div>
    </div>
  );
}
