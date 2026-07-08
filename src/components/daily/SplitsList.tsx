import { useState } from 'react';
import { formatPaceMinKm } from '../../lib/format';
import type { StravaSplit } from '../../types';

const VISIBLE_CAP = 8;

interface SplitsListProps {
  splits: StravaSplit[];
}

export function SplitsList({ splits }: SplitsListProps) {
  const [showAll, setShowAll] = useState(false);

  if (splits.length === 0) return null;

  const paces = splits.map((s) => s.avgPaceMinKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const paceRange = slowest - fastest || 1;

  const visible = showAll ? splits : splits.slice(0, VISIBLE_CAP);
  const hiddenCount = splits.length - visible.length;

  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Splits</div>
      <div className="flex flex-col gap-1.5">
        {visible.map((s) => {
          // Faster splits render a longer bar; scale within this run's own pace range.
          const barPct = 20 + (80 * (slowest - s.avgPaceMinKm)) / paceRange;
          const partial = s.distanceM < 950;
          return (
            <div key={s.split} className="flex items-center gap-3">
              <span className="w-5 font-mono text-[11px] text-faint">{s.split}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent-tint">
                <div className="h-full rounded-full bg-accent" style={{ width: `${barPct}%` }} />
              </div>
              <span className="w-[52px] text-right font-mono text-[12px] text-ink">
                {formatPaceMinKm(s.avgPaceMinKm)}
                {partial && <span className="text-faint">*</span>}
              </span>
              <span className="w-[56px] text-right font-mono text-[11px] text-muted">
                {s.avgHR != null ? `${s.avgHR} bpm` : '—'}
              </span>
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted"
        >
          Show all {splits.length} splits
        </button>
      )}
    </div>
  );
}
