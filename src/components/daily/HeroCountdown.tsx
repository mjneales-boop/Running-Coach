import { Eyebrow } from '../ui/Eyebrow';
import { usePlanConfig } from '../../hooks/usePlanConfig';
import type { PhaseInfo, Week } from '../../types';

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function formatRaceDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()} ${d.getFullYear()}`;
}

function formatGoalTime(hms: string) {
  const [h, m] = hms.split(':');
  return `${Number(h)}:${m}`;
}

interface HeroCountdownProps {
  daysToRace: number;
  week: Week;
  phase: PhaseInfo;
}

export function HeroCountdown({ daysToRace, week, phase }: HeroCountdownProps) {
  const { race, mode, weeks } = usePlanConfig();

  if (mode === 'general' || !race.date) {
    // No race to count down to — show block progress in the same visual frame.
    const weekIndex = Math.max(0, weeks.findIndex((w) => w.id === week.id)) + 1;
    return (
      <div className="stride-rise mb-[22px] border-b border-hairline pb-6">
        <Eyebrow>Training block</Eyebrow>
        <h1
          className="my-3.5 font-display text-[40px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
          style={{ fontVariationSettings: "'wdth' 122" }}
        >
          General fitness
        </h1>
        <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
          Rolling 4-week blocks · target pace {race.goalPace || '—'}
        </div>
        <div className="mt-6 flex items-end gap-3.5">
          <div
            className="font-display text-[92px] font-black leading-[0.8] tracking-[-0.03em] text-accent"
            style={{ fontVariationSettings: "'wdth' 90", textShadow: '0 0 12px var(--color-accent-glow)' }}
          >
            {weekIndex}
          </div>
          <div className="pb-2.5">
            <span className="block text-[15px] font-bold uppercase tracking-[0.02em]">
              of {weeks.length} weeks
            </span>
            <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              {titleCase(phase.short)} · week {week.num}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const displayName = race.name.replace(/^EDP\s+/i, '');

  return (
    <div className="stride-rise mb-[22px] border-b border-hairline pb-6">
      <Eyebrow>Goal race</Eyebrow>
      <h1
        className="my-3.5 font-display text-[40px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
        style={{ fontVariationSettings: "'wdth' 122" }}
      >
        {displayName}
      </h1>
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
        {formatRaceDate(race.date)} · sub {formatGoalTime(race.goalTime)} · MP {race.goalPace}
      </div>
      <div className="mt-6 flex items-end gap-3.5">
        <div
          className="font-display text-[92px] font-black leading-[0.8] tracking-[-0.03em] text-accent"
          style={{ fontVariationSettings: "'wdth' 90", textShadow: '0 0 12px var(--color-accent-glow)' }}
        >
          {daysToRace}
        </div>
        <div className="pb-2.5">
          <span className="block text-[15px] font-bold uppercase tracking-[0.02em]">Days out</span>
          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            {titleCase(phase.short)} · week {week.num}
          </span>
        </div>
      </div>
    </div>
  );
}
