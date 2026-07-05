import type { Week } from '../../types';

interface WeekRowProps {
  week: Week;
  focus: string;
  maxKm: number;
  isCurrent: boolean;
}

export function WeekRow({ week, focus, maxKm, isCurrent }: WeekRowProps) {
  const pct = Math.min(100, Math.round((week.targetKm / maxKm) * 100));

  return (
    <div className={`flex items-center gap-3.5 rounded-xl py-3 ${isCurrent ? '-mx-3 bg-accent-tint px-3' : ''}`}>
      <div className="flex w-[46px] flex-none flex-col items-start gap-1">
        <span className={`font-mono text-sm font-bold ${isCurrent ? 'text-accent' : 'text-ink'}`}>
          {String(week.num).padStart(2, '0')}
        </span>
        <span className="font-mono text-[9.5px] tracking-[0.05em] text-faint">{week.targetKm}km</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[13.5px] ${isCurrent ? 'font-bold text-ink' : 'text-muted'}`}>{focus}</div>
        <div className="mt-2.5 h-[5px] overflow-hidden rounded bg-surface-2">
          <div className={`h-full rounded ${isCurrent ? 'bg-accent' : 'bg-faint'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {isCurrent && (
        <span className="flex-none rounded-md bg-accent px-1.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
          Now
        </span>
      )}
    </div>
  );
}
