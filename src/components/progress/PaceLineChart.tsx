import { ComposedChart, Area, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { PaceProgression, PacePoint } from '../../lib/logic';

interface PaceLineChartProps {
  pace: PaceProgression;
}

function fmtPace(min: number): string {
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

const TOOLTIP_STYLE = {
  background: 'var(--color-canvas)',
  border: '1px solid var(--color-hairline-strong)',
  borderRadius: 8,
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--color-ink)',
} as const;

/**
 * Week tick. Recharts centres every label on its data point, which pushes half of the
 * first and last labels outside the SVG, where they get clipped — so those two anchor
 * inward instead.
 */
function WeekTick({ x, y, index, visibleTicksCount, payload }: {
  x?: number; y?: number; index?: number; visibleTicksCount?: number;
  payload?: { value?: string };
}) {
  const isFirst = index === 0;
  const isLast = visibleTicksCount != null && index === visibleTicksCount - 1;
  return (
    <text
      x={x}
      y={(y ?? 0) + 10}
      textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
      fontFamily="var(--font-mono)"
      fontSize={9}
      letterSpacing="0.08em"
      fill="var(--color-faint)"
    >
      W{payload?.value}
    </text>
  );
}

/** Both tracks share these so their plot areas are the same width and weeks line up. */
const CHART_MARGIN = { top: 6, right: 6, bottom: 0, left: 6 } as const;

/**
 * Latest week with data, against the mean of the three before it. A bare week-on-week
 * diff is mostly noise on a metric this jittery.
 */
function trend(points: PacePoint[], pick: (p: PacePoint) => number | undefined) {
  const vals = points.map(pick).filter((v): v is number => v != null);
  if (vals.length < 2) return null;
  const latest = vals[vals.length - 1];
  const prior = vals.slice(Math.max(0, vals.length - 4), vals.length - 1);
  if (!prior.length) return null;
  return { latest, delta: latest - prior.reduce((a, b) => a + b, 0) / prior.length };
}

function Stat({ label, value, unit, delta, color }: {
  label: string; value: string; unit: string; delta?: string; color?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
        <span
          className="font-display text-[25px] font-extrabold leading-none tracking-[-0.01em]"
          // An em-dash placeholder in a bright accent reads as a UI element, not a
          // missing value — dim it back to the muted scale.
          style={{ color: value === '—' ? 'var(--color-faint)' : color ?? 'var(--color-ink)' }}
        >
          {value}
        </span>
        <span className="font-mono text-[10px] text-faint">{unit}</span>
        {delta && <span className="font-mono text-[10px] text-muted">{delta}</span>}
      </div>
    </div>
  );
}

export function PaceLineChart({ pace }: PaceLineChartProps) {
  const { points, easyLo, easyHi, approximate, window: win } = pace;

  const paceTrend = trend(points, (p) => p.actual);
  const hrTrend = trend(points, (p) => p.hr);
  const hasHr = points.some((p) => p.hr != null);
  const latestWeek = [...points].reverse().find((p) => p.actual != null);

  const paceDelta = paceTrend && Math.abs(paceTrend.delta) >= 1 / 60
    ? `${paceTrend.delta > 0 ? '+' : '−'}${Math.abs(Math.round(paceTrend.delta * 60))}s`
    : undefined;
  const hrDelta = hrTrend && Math.abs(hrTrend.delta) >= 1
    ? `${hrTrend.delta > 0 ? '+' : '−'}${Math.abs(Math.round(hrTrend.delta))}`
    : undefined;

  // Enough ticks to orient without crowding a phone, always including the last week —
  // that's the one the headline numbers describe, so it has to be findable on the axis.
  const weekTicks = (() => {
    const step = Math.max(1, Math.ceil(points.length / 6));
    const idx: number[] = [];
    for (let i = 0; i < points.length; i += step) idx.push(i);
    const last = points.length - 1;
    if (idx.length && idx[idx.length - 1] !== last) {
      // Swap rather than append when the final tick would sit on top of its neighbour.
      if (last - idx[idx.length - 1] < step) idx[idx.length - 1] = last;
      else idx.push(last);
    }
    return idx.map((i) => points[i].label);
  })();
  const tipLabel = (_: unknown, payload: readonly { payload?: PacePoint }[] | undefined) => {
    const p = payload?.[0]?.payload;
    return p ? `Week ${p.label} · ${p.easyKm} km easy` : '';
  };

  return (
    <div className="stride-rise mb-[22px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Easy running</span>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">by week</span>
      </div>
      <div className="mb-5 font-mono text-[10.5px] leading-relaxed tracking-[0.02em] text-muted">
        Every km you ran between {fmtPace(win.fast)} and {fmtPace(win.slow)}, including the
        easy parts of long runs and workouts.
        {approximate && ' Still syncing splits.'}
      </div>

      {/* The headline read: the latest week's easy pace and the heart rate that bought it.
          Same pace at a lower HR is the definition of getting fitter. */}
      {latestWeek && (
        <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-accent">
          Week {latestWeek.label}
        </div>
      )}
      <div className="mb-5 flex items-end justify-between gap-4">
        <Stat
          label="Avg pace"
          value={paceTrend ? fmtPace(paceTrend.latest) : '—'}
          unit="/km"
          delta={paceDelta}
          color="var(--color-accent)"
        />
        {hasHr && (
          <Stat
            label="Avg HR"
            value={hrTrend ? String(Math.round(hrTrend.latest)) : '—'}
            unit="bpm"
            delta={hrDelta}
            color="var(--color-hr)"
          />
        )}
        {latestWeek && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">Easy km</div>
            <div className="mt-1 whitespace-nowrap font-mono text-[13px] text-ink">
              {latestWeek.easyKm}<span className="text-faint"> km</span>
            </div>
          </div>
        )}
      </div>

      {/* Pace and HR get their own tracks rather than sharing one plot: they have no
          common scale, and overlaying them put the HR line inside the easy-pace band,
          where crossing the band edge looked meaningful but meant nothing. Identical
          margins and point counts keep the two x-scales in step; only the lower track
          draws the shared week axis. */}
      <div className="h-[118px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={CHART_MARGIN}>
            {/* Hidden, but required: without it this track gets a different x scale from
                the heart-rate track below and the weeks stop lining up. */}
            <XAxis dataKey="label" hide />
            {/* reversed: faster pace (smaller number) plots higher */}
            <YAxis hide domain={['dataMin - 0.08', 'dataMax + 0.08']} reversed />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val, name) =>
                name === 'band'
                  ? [`${fmtPace(easyLo)}–${fmtPace(easyHi)}`, 'Easy zone']
                  : [`${fmtPace(Number(val))} /km`, 'Avg pace']
              }
              labelFormatter={tipLabel}
            />
            <Area
              dataKey="band"
              stroke="var(--color-faint)"
              strokeWidth={1}
              strokeDasharray="5 4"
              strokeOpacity={0.4}
              fill="var(--color-accent)"
              fillOpacity={0.07}
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
              // Recharts' entrance animation is a stroke-dasharray sweep that
              // intermittently never completes, leaving dots with no line.
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {hasHr && (
        <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
          Heart rate · bpm
        </div>
      )}
      {/* The week axis lives on whichever track is last, so it reads as one shared scale. */}
      <div className={hasHr ? 'h-[76px]' : 'h-[24px]'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={CHART_MARGIN}>
            <XAxis
              dataKey="label"
              ticks={weekTicks}
              interval={0}
              tick={<WeekTick />}
              tickLine={false}
              axisLine={false}
              height={20}
            />
            <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
            {hasHr && (
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val) => [`${Math.round(Number(val))} bpm`, 'Avg HR']}
                labelFormatter={tipLabel}
              />
            )}
            <Area
              type="monotone"
              dataKey="hr"
              stroke="var(--color-hr)"
              strokeWidth={2}
              fill="var(--color-hr)"
              fillOpacity={0.12}
              dot={{ r: 2.5, fill: 'var(--color-hr)', strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5 bg-accent" />
          Pace
        </span>
        {hasHr && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3.5" style={{ background: 'var(--color-hr)' }} />
            Heart rate
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3.5 rounded-[2px] border border-dashed border-faint bg-accent/10" />
          Easy zone
        </span>
      </div>
    </div>
  );
}
