import type { TopLift } from '../../lib/strength';

interface TopLiftsListProps {
  lifts: TopLift[];
  onOpenInsights: () => void;
}

export function TopLiftsList({ lifts, onOpenInsights }: TopLiftsListProps) {
  const maxWeight = Math.max(...lifts.map((l) => l.weight), 1);

  return (
    <div
      onClick={onOpenInsights}
      className="stride-rise cursor-pointer rounded-[18px] border border-hairline bg-surface p-[22px]"
    >
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">Strength</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Insights →</span>
      </div>
      <div className="mb-2 font-mono text-[10.5px] tracking-[0.02em] text-muted">Top lifts · last 30 days</div>

      {lifts.length === 0 ? (
        <div className="py-4 font-mono text-xs text-faint">No sets logged in the last 30 days.</div>
      ) : (
        lifts.map((lift, i) => {
          const pct = Math.round((lift.weight / maxWeight) * 100);
          const deltaLabel = lift.delta == null ? undefined : lift.delta === 0 ? 'held' : `${lift.delta > 0 ? '+' : ''}${lift.delta} kg`;
          return (
            <div key={lift.exerciseId} className={`flex items-center gap-3.5 py-3.5 ${i > 0 ? 'border-t border-hairline-soft' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">{lift.name}</div>
                <div className="mt-2 h-[5px] overflow-hidden rounded bg-surface-2">
                  <div
                    className={`h-full rounded ${i === 0 ? 'bg-accent' : 'bg-faint'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="flex-none text-right">
                <div className="font-display text-lg font-extrabold">
                  {lift.weight}
                  <span className="text-[11px] font-medium text-muted">kg</span>
                </div>
                {deltaLabel && (
                  <div className={`mt-0.5 font-mono text-[10px] tracking-[0.06em] ${lift.delta ? 'text-accent' : 'text-muted'}`}>
                    {deltaLabel}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
