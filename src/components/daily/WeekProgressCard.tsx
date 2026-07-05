interface WeekProgressCardProps {
  kmDone: number;
  kmTarget: number;
  nextDayLabel: string;
  nextTitle: string;
  nextKm?: number;
}

export function WeekProgressCard({ kmDone, kmTarget, nextDayLabel, nextTitle, nextKm }: WeekProgressCardProps) {
  const pct = kmTarget > 0 ? Math.min(100, Math.round((kmDone / kmTarget) * 100)) : 0;

  return (
    <div className="stride-rise mb-[26px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-3.5 flex items-baseline gap-2">
        <span className="text-[34px] font-extrabold tracking-[-0.02em]">{kmDone}</span>
        <span className="font-mono text-sm tracking-[0.05em] text-muted">/ {kmTarget} km done</span>
      </div>
      <div className="h-2 overflow-hidden rounded-md bg-surface-2">
        <div
          className="h-full rounded-md bg-accent"
          style={{ width: `${pct}%`, boxShadow: '0 0 7px var(--color-accent-glow)' }}
        />
      </div>
      <div className="mt-[18px] flex items-center justify-between gap-3 border-t border-hairline pt-4">
        <span className="flex-none font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          Next · {nextDayLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[15px] font-bold">
          {nextTitle}
          {nextKm != null && <span className="text-accent"> · {nextKm} km</span>}
        </span>
      </div>
    </div>
  );
}
