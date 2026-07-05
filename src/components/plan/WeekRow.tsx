import { Chevron } from '../ui/Accordion';
import { Pill } from '../ui/Pill';
import type { DayAbbr, Week } from '../../types';

interface WeekRowProps {
  week: Week;
  focus: string;
  maxKm: number;
  isCurrent: boolean;
  open: boolean;
  onToggle: () => void;
  onOpenDay: (dayAbbr: DayAbbr) => void;
}

export function WeekRow({ week, focus, maxKm, isCurrent, open, onToggle, onOpenDay }: WeekRowProps) {
  const pct = Math.min(100, Math.round((week.targetKm / maxKm) * 100));

  return (
    <div className={`rounded-xl ${isCurrent ? '-mx-3 bg-accent-tint px-3' : ''}`}>
      <div onClick={onToggle} className="flex cursor-pointer items-center gap-3.5 py-3">
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
        <Chevron open={open} />
      </div>
      {open && (
        <div className="flex flex-col gap-1 pb-3 pl-[58px]">
          {week.days.map((d) => (
            <div
              key={d.d}
              onClick={() => onOpenDay(d.d)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg py-2 pr-1"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-8 flex-none font-mono text-[10.5px] uppercase tracking-[0.06em] text-faint">
                  {d.d}
                </span>
                <Pill type={d.type} size="sm" />
                <span className="truncate text-[13px] text-muted">{d.title}</span>
              </div>
              {d.km != null && (
                <span className="flex-none font-mono text-[11px] text-faint">{d.km} km</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
