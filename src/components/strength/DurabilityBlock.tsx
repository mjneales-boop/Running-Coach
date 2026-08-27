import { SecLabel } from '../ui/SecLabel';
import { durabilityNote } from '../../lib/strength';
import type { DurabilityPoint, DurabilitySummary } from '../../lib/strength';

const WEEKS_SHOWN = 9;
const BAR_MAX_PX = 74;

interface DurabilityBlockProps {
  points: DurabilityPoint[];
  summary: DurabilitySummary;
  lowerLeg: { weeks: number; total: number };
}

/**
 * Weekly running volume with a dot per gym session honoured above it.
 *
 * Deliberately two marks side by side rather than a correlation: the eye can
 * see whether lifting and mileage travelled together, and no number here claims
 * one caused the other. With a sample this size, it could not.
 */
export function DurabilityBlock({ points, summary, lowerLeg }: DurabilityBlockProps) {
  const currentIndex = points.findIndex((p) => p.isCurrent);
  const end = currentIndex >= 0 ? currentIndex + 1 : points.findIndex((p) => p.isFuture);
  const sliceEnd = end > 0 ? end : points.length;
  const series = points.slice(Math.max(0, sliceEnd - WEEKS_SHOWN), sliceEnd);

  const maxKm = Math.max(1, ...series.map((p) => p.km));
  const maxDots = Math.max(1, ...series.map((p) => p.gymPlanned));

  return (
    <section className="border-b border-hairline py-7">
      <SecLabel>Durability</SecLabel>

      <div className="flex items-end justify-between gap-1.5" style={{ minHeight: BAR_MAX_PX + 34 }}>
        {series.map((p) => (
          <div key={p.weekId} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className="flex flex-col-reverse items-center gap-[3px]"
              style={{ minHeight: maxDots * 10 }}
              aria-hidden
            >
              {Array.from({ length: p.gymDone }, (_, i) => (
                <span key={i} className="h-[6px] w-[6px] rounded-full bg-accent" />
              ))}
            </span>
            <span
              className="w-full rounded-t-[2px] bg-hairline-strong"
              style={{ height: Math.max(2, (p.km / maxKm) * BAR_MAX_PX) }}
              aria-hidden
            />
            <span className="stride-num font-mono text-[9px] uppercase tracking-[0.04em] text-faint">
              {p.num}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-hairline-soft pt-4">
        <div className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            Weeks with full gym
          </span>
          <span className="stride-num font-display text-[15px] font-bold">
            {summary.weeksWithFullGym}/{summary.weeksAssessed}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            Avg weekly km · lifted
          </span>
          <span className="stride-num font-display text-[15px] font-bold">
            {summary.avgKmWithFullGym}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            Avg weekly km · didn't
          </span>
          <span className="stride-num font-display text-[15px] font-bold text-muted">
            {summary.avgKmWithoutFullGym}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-hairline-soft py-1.5 pt-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            Shin-splint insurance
          </span>
          <span className="stride-num font-display text-[15px] font-bold">
            {lowerLeg.weeks} of {lowerLeg.total} weeks
          </span>
        </div>
      </div>

      {/* Derived from the numbers above, never asserted over them. */}
      <p className="mt-4 font-mono text-[11px] leading-[1.6] text-muted">{durabilityNote(summary)}</p>
    </section>
  );
}
