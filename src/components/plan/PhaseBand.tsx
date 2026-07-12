import { WeekRow } from './WeekRow';
import { weekFocus } from '../../lib/logic';
import { usePlanConfig } from '../../hooks/usePlanConfig';
import type { DayAbbr, PhaseInfo, Week } from '../../types';

interface PhaseBandProps {
  phase: PhaseInfo;
  weeks: Week[];
  currentWeekId: string | undefined;
  isCurrentPhase: boolean;
  openWeekId: string | null;
  onToggleWeek: (weekId: string) => void;
  onOpenDay: (weekId: string, dayAbbr: DayAbbr) => void;
}

export function PhaseBand({ phase, weeks, currentWeekId, isCurrentPhase, openWeekId, onToggleWeek, onOpenDay }: PhaseBandProps) {
  const { peakKm } = usePlanConfig();
  return (
    <div className="stride-rise pt-[26px]">
      <div className="flex items-baseline justify-between">
        <span
          className={`font-display text-2xl font-extrabold uppercase leading-none tracking-[-0.01em] ${isCurrentPhase ? 'text-accent' : 'text-ink'}`}
        >
          {phase.short}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Wk {phase.weeks}</span>
      </div>
      {phase.blurb && <div className="mb-3 mt-1.5 font-mono text-[10.5px] tracking-[0.02em] text-muted">{phase.blurb}</div>}
      <div>
        {weeks.map((w) => (
          <WeekRow
            key={w.id}
            week={w}
            focus={weekFocus(w)}
            maxKm={peakKm}
            isCurrent={w.id === currentWeekId}
            open={w.id === openWeekId}
            onToggle={() => onToggleWeek(w.id)}
            onOpenDay={(dayAbbr) => onOpenDay(w.id, dayAbbr)}
          />
        ))}
      </div>
    </div>
  );
}
