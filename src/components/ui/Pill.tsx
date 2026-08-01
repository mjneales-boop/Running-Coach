import type { SessionType } from '../../types';
import { isHardSession } from '../../lib/logic';

interface PillProps {
  type: SessionType;
  size?: 'sm' | 'lg';
}

export function Pill({ type, size }: PillProps) {
  const isHard = isHardSession(type);
  const isRest = type === 'REST';
  // A match counts as hard for load, but paints amber so a fixture is
  // distinguishable from a workout at a glance in the week list.
  const tone = type === 'GAME' ? 'var(--warn)' : isHard ? 'var(--accent)' : null;

  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 13 : 11.5;
  const padding = size === 'sm' ? '4px 8px 3px' : size === 'lg' ? '7px 13px 6px' : '5px 10px 4px';
  const letterSpacing = size === 'sm' ? '0.1em' : '0.12em';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--mono)',
        fontWeight: 600,
        fontSize,
        textTransform: 'uppercase',
        letterSpacing,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        padding,
        borderRadius: 5,
        border: `1px solid ${tone ?? 'var(--border-hover)'}`,
        color: tone ?? 'var(--text-muted)',
        opacity: isRest ? 0.65 : 1,
      }}
    >
      {type}
    </span>
  );
}
