import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { restDayNote, runDayNote, SESSION_TYPE_LABEL } from '../../lib/coachNotes';
import { zoneForPace, estimateDuration } from '../../lib/logic';
import type { Day } from '../../types';

interface SessionCardRestProps {
  variant: 'rest';
  weekMeta: string;
  onComplete: () => void;
  onDetails: () => void;
}

interface SessionCardRunProps {
  variant: 'run';
  weekMeta: string;
  day: Day;
  onStart: () => void;
  onDetails: () => void;
}

type SessionCardProps = SessionCardRestProps | SessionCardRunProps;

function StatBlock({ label, value, unit, isFirst }: { label: string; value: string; unit: string; isFirst?: boolean }) {
  return (
    <div className={`pt-4 ${isFirst ? '' : 'border-l border-hairline pl-1'}`}>
      <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="text-2xl font-extrabold tracking-[-0.01em]">
        {value}
        <span className="ml-0.5 text-xs font-medium text-muted">{unit}</span>
      </div>
    </div>
  );
}

export function SessionCard(props: SessionCardProps) {
  if (props.variant === 'rest') {
    const { weekMeta, onComplete, onDetails } = props;
    return (
      <div className="stride-rise mb-[26px] rounded-[18px] border border-hairline bg-surface p-[22px]">
        <div className="mb-1.5 flex items-center justify-between">
          <Tag tone="accent">Rest</Tag>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">{weekMeta}</span>
        </div>
        <div
          className="my-2 font-display text-[54px] font-extrabold leading-[0.9] tracking-[-0.01em]"
          style={{ fontVariationSettings: "'wdth' 110" }}
        >
          Rest
        </div>
        <div className="mb-[22px] border-l-2 border-accent py-0.5 pl-4">
          <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-accent">Coach</div>
          <p className="max-w-[40ch] text-[15.5px] leading-normal text-[#D3DAE1]">{restDayNote()}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" className="flex-1" onClick={onComplete}>
            Complete
          </Button>
          <Button variant="ghost" className="flex-1" onClick={onDetails}>
            Details
          </Button>
        </div>
      </div>
    );
  }

  const { weekMeta, day, onStart, onDetails } = props;
  const label = SESSION_TYPE_LABEL[day.type];
  const zone = zoneForPace(day.pace);
  const duration = estimateDuration(day);

  return (
    <div className="stride-rise mb-[26px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-1.5 flex items-center justify-between">
        <Tag tone="accent">{label}</Tag>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">{weekMeta}</span>
      </div>
      <div
        className="my-1 font-display text-[52px] font-extrabold leading-[0.88] tracking-[-0.01em]"
        style={{ fontVariationSettings: "'wdth' 108" }}
      >
        {label}
      </div>
      <div className="my-[18px] grid grid-cols-3 gap-0.5 border-t border-hairline">
        <StatBlock label="Distance" value={day.km != null ? String(day.km) : '—'} unit="km" isFirst />
        <StatBlock label="Pace" value={day.pace ?? '—'} unit="/km" />
        <StatBlock label="Est." value={duration ?? '—'} unit="h" />
      </div>
      {zone && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Zone</span>
          <Tag tone="accent">
            {zone.name} {zone.pace}
          </Tag>
        </div>
      )}
      <div className="mb-[22px] border-l-2 border-accent py-0.5 pl-4">
        <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-accent">Coach</div>
        <p className="max-w-[40ch] text-[15.5px] leading-normal text-[#D3DAE1]">{runDayNote(day)}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="primary" className="flex-1" onClick={onStart}>
          Start run
        </Button>
        <Button variant="ghost" className="flex-1" onClick={onDetails}>
          Details
        </Button>
      </div>
    </div>
  );
}
