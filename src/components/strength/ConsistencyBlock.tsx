import { SecLabel } from '../ui/SecLabel';
import type { ConsistencySummary, WeekAdherence } from '../../lib/strength';

interface ConsistencyBlockProps {
  adherence: WeekAdherence[];
  summary: ConsistencySummary;
}

/**
 * One dot per gym session the plan scheduled that week.
 *
 * Filled = done. Hollow ring = stood down for recovery, which is honoured, not
 * missed — it must never render as a gap. Faint outline = missed. Dashed = not
 * yet reached.
 */
function WeekDots({ week }: { week: WeekAdherence }) {
  if (week.planned === 0) {
    return <span className="h-[7px] w-[7px] rounded-full border border-dashed border-hairline" aria-hidden />;
  }

  const dots = Array.from({ length: week.planned }, (_, i) => {
    if (week.status === 'future') return 'future';
    if (i < week.completed) return 'done';
    if (i < week.completed + week.skipped) return 'skipped';
    return 'missed';
  });

  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {dots.map((kind, i) => (
        <span
          key={i}
          className={`h-[7px] w-[7px] rounded-full ${
            kind === 'done'
              ? 'bg-accent'
              : kind === 'skipped'
                ? 'border border-[rgba(0,217,255,0.45)]'
                : kind === 'missed'
                  ? 'border border-hairline'
                  : 'border border-dashed border-hairline'
          }`}
        />
      ))}
    </span>
  );
}

export function ConsistencyBlock({ adherence, summary }: ConsistencyBlockProps) {
  return (
    <section className="border-b border-hairline pb-7">
      <SecLabel>Consistency</SecLabel>

      <div className="mt-4 grid grid-cols-3 gap-0.5">
        <div className="pr-1">
          <div
            className="stride-num font-display text-[52px] font-black leading-none tracking-[-0.03em] text-accent"
            style={{ textShadow: '0 0 10px var(--color-accent-glow)' }}
          >
            {summary.streak}
          </div>
          <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Week streak
          </div>
        </div>

        <div className="border-l border-hairline pl-3">
          <div className="stride-num font-display text-[26px] font-extrabold leading-none">
            {summary.sessionsDone}/{summary.sessionsPlanned}
          </div>
          <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Sessions done
          </div>
        </div>

        <div className="border-l border-hairline pl-3">
          <div className="stride-num font-display text-[26px] font-extrabold leading-none">
            {summary.pctOfPlanned}%
          </div>
          <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Of planned
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-3.5 gap-y-3">
        {adherence.map((week) => (
          <span key={week.weekId} className="flex flex-col items-center gap-1.5">
            <WeekDots week={week} />
            <span
              className={`stride-num font-mono text-[9px] uppercase tracking-[0.06em] ${
                week.isCurrent ? 'text-muted' : 'text-faint'
              }`}
            >
              {week.num}
            </span>
          </span>
        ))}
      </div>

      {summary.streak > 0 && (
        <p className="mt-5 font-mono text-[11px] leading-[1.6] text-muted">
          A week counts when every gym session the plan scheduled for it was honoured.
          Standing one down for recovery counts as honoured.
        </p>
      )}
    </section>
  );
}
