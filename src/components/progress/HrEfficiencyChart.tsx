import { useState } from 'react';
import { ComposedChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { fmtPaceMin, type ZoneEfficiency } from '../../lib/hrEfficiency';

interface HrEfficiencyChartProps {
  zones: ZoneEfficiency[];
  windowDays: number;
}

export function HrEfficiencyChart({ zones, windowDays }: HrEfficiencyChartProps) {
  const [selected, setSelected] = useState(0);

  if (zones.length === 0) {
    return (
      <div className="stride-rise mb-[22px] rounded-[18px] border border-hairline bg-surface p-[22px]">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Aerobic efficiency</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">bpm</span>
        </div>
        <div className="py-4 font-mono text-xs text-faint">
          Needs two or more runs with heart-rate data in the last {windowDays} days.
        </div>
      </div>
    );
  }

  const active = zones[Math.min(selected, zones.length - 1)];
  // Lower HR at the same pace = fitter, so a negative delta is the good direction.
  const improving = active.hrDelta != null && active.hrDelta < 0;
  const paceDrift =
    active.paceDelta == null || Math.abs(active.paceDelta) < 0.05
      ? null
      : `${active.paceDelta < 0 ? '' : '+'}${fmtPaceMin(Math.abs(active.paceDelta))}${active.paceDelta < 0 ? ' faster' : ' slower'}`;

  return (
    <div className="stride-rise mb-[22px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Aerobic efficiency</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">bpm</span>
      </div>
      <div className="mb-3.5 font-mono text-[10.5px] tracking-[0.02em] text-muted">
        HR at {active.zone.toLowerCase()} pace · lower = fitter · last {windowDays} days
      </div>

      {zones.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {zones.map((z, i) => (
            <button
              key={z.zone}
              onClick={() => setSelected(i)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                i === selected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-hairline text-muted'
              }`}
            >
              {z.zone}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-baseline gap-2.5">
        <span className="font-display text-[32px] font-extrabold leading-none">
          {active.avgHR}
          <span className="ml-1 text-[12px] font-medium text-muted">avg bpm</span>
        </span>
        {active.hrDelta != null && active.hrDelta !== 0 && (
          <span className={`font-mono text-[11px] tracking-[0.06em] ${improving ? 'text-accent' : 'text-muted'}`}>
            {active.hrDelta > 0 ? '+' : ''}
            {active.hrDelta} bpm
          </span>
        )}
      </div>

      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={active.points} margin={{ top: 12, right: 4, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="hrAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* Not reversed: HR is plotted as-is, so a falling line reads as improving. */}
            <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
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
                const p = item?.payload as { paceMinKm?: number } | undefined;
                return [`${val} bpm @ ${p?.paceMinKm ? fmtPaceMin(p.paceMinKm) : '—'}`, ''];
              }}
              labelFormatter={(_l, payload) => {
                const p = payload?.[0]?.payload as { date?: string } | undefined;
                return p?.date ?? '';
              }}
            />
            <Line
              type="monotone"
              dataKey="hr"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3.5 font-mono text-[10px] leading-relaxed tracking-[0.06em] text-muted">
        {active.points.length} runs · avg {fmtPaceMin(active.avgPaceMinKm)}/km
        {paceDrift && ` · pace ${paceDrift}`}
      </div>
    </div>
  );
}
