import { RACE_DATE, RACE_LOCATION, GOAL_TIME } from '../../constants/plan';
import { formatDateShort } from '../../lib/logic';

export function RaceDayCard() {
  const dateLabel = formatDateShort(new Date(`${RACE_DATE}T12:00:00`));
  const city = RACE_LOCATION.split('→').pop()?.trim() ?? RACE_LOCATION;
  const goal = GOAL_TIME.split(':').slice(0, 2).join(':');

  return (
    <div className="stride-rise mt-7 flex items-center gap-3.5 rounded-2xl border border-[rgba(0,217,255,0.3)] bg-accent-tint p-5">
      <div className="font-display text-[44px] font-black leading-[0.8] tracking-[-0.03em] text-accent">
        42<span className="text-[15px]">.2</span>
      </div>
      <div>
        <div className="text-base font-extrabold uppercase tracking-[0.01em]">Race day</div>
        <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          {dateLabel} · {city} · sub {goal}
        </div>
      </div>
    </div>
  );
}
