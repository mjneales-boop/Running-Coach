import { fmtPaceMin, type ZoneEfficiency } from '../../lib/hrEfficiency';

interface HrEfficiencyStripProps {
  /** The zone trend to surface — normally the one matching today's session. */
  efficiency: ZoneEfficiency | null;
  windowDays: number;
}

/**
 * One-line aerobic-efficiency read for the Daily screen: what your HR costs at the zone
 * you're running today, and which way it's moving. The full per-zone chart lives on
 * Progress — this is the glanceable version, so it stays silent until there's a trend.
 */
export function HrEfficiencyStrip({ efficiency, windowDays }: HrEfficiencyStripProps) {
  if (!efficiency || efficiency.hrDelta == null) return null;

  const { zone, avgHR, avgPaceMinKm, hrDelta } = efficiency;
  const improving = hrDelta < 0;
  const flat = hrDelta === 0;

  return (
    <div className="stride-rise mb-[22px] rounded-[18px] border border-hairline bg-surface px-[22px] py-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted">
          {zone} efficiency
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{windowDays}d</span>
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[26px] font-extrabold leading-none">
          {avgHR}
          <span className="ml-1 text-[11px] font-medium text-muted">bpm</span>
        </span>
        <span className="font-mono text-[11px] text-muted">@ {fmtPaceMin(avgPaceMinKm)}/km</span>
        {!flat && (
          <span className={`ml-auto font-mono text-[11px] tracking-[0.06em] ${improving ? 'text-accent' : 'text-muted'}`}>
            {hrDelta > 0 ? '+' : ''}
            {hrDelta} bpm
          </span>
        )}
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-[0.04em] text-faint">
        {flat
          ? 'Holding steady at this effort.'
          : improving
            ? 'Same pace, lower heart rate — aerobic base is building.'
            : 'Costing more than it did. Worth watching fatigue.'}
      </div>
    </div>
  );
}
