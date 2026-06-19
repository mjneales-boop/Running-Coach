import { formatDateLong } from '../lib/logic';
import { RACE_NAME, GOAL_TIME } from '../constants/plan';

interface HeaderProps {
  today: Date;
  daysToRace: number;
}

export function Header({ today, daysToRace }: HeaderProps) {
  const dateStr = formatDateLong(today);
  const raceLabel = `${RACE_NAME.toLowerCase()} · oct 10 2026 · sub ${GOAL_TIME.slice(0, 4)}`;

  return (
    <header
      className="dashboard-header"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: 22,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-muted)',
            marginBottom: 9,
            letterSpacing: '0.02em',
          }}
        >
          {'// ' + raceLabel}
        </div>
        <div
          className="header-date"
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: '-0.01em',
            lineHeight: 1,
            color: 'var(--text)',
          }}
        >
          {dateStr}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-muted)',
            marginBottom: 4,
            letterSpacing: '0.02em',
          }}
        >
          {'// race in'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <span
            className="header-countdown"
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 900,
              fontSize: 48,
              lineHeight: 0.9,
              color: 'var(--accent)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {daysToRace}
          </span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 13,
              color: 'var(--text-muted)',
            }}
          >
            days
          </span>
        </div>
      </div>
    </header>
  );
}
