import type { SessionType } from '../../types';

interface PillProps {
  type: SessionType;
  size?: 'sm' | 'lg';
}

const HARD = new Set<SessionType>(['LONG', 'WORKOUT', 'RACE']);

export function Pill({ type, size }: PillProps) {
  const isHard = HARD.has(type);
  const isRest = type === 'REST';

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
        border: `1px solid ${isHard ? 'var(--accent)' : 'var(--border-hover)'}`,
        color: isHard ? 'var(--accent)' : 'var(--text-muted)',
        opacity: isRest ? 0.65 : 1,
      }}
    >
      {type}
    </span>
  );
}
