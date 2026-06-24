import { Pill } from './ui/Pill';
import { Check } from './ui/Check';
import { SecLabel } from './ui/SecLabel';
import { weeklyKmDone, formatDateShort } from '../lib/logic';
import type { Week, CompletionEntry, DayAbbr } from '../types';

interface WeekStripProps {
  week: Week;
  today: Date;
  completion: Record<string, CompletionEntry>;
  onDayClick: (weekId: string, dayAbbr: DayAbbr) => void;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

const DAY_LABELS: Record<DayAbbr, string> = {
  mon: 'MON', tue: 'TUE', wed: 'WED',
  thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN',
};

function ghostBtnStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    fontFamily: 'var(--mono)',
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, color 150ms ease',
    ...extra,
  };
}

export function WeekStrip({
  week,
  today,
  completion,
  onDayClick,
  onPrev,
  onToday,
  onNext,
}: WeekStripProps) {
  const todayStr = today.toISOString().slice(0, 10);
  const doneKm = Math.round(weeklyKmDone(week, completion));

  const navButtons = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {(['<', 'today', '>'] as const).map((label) => (
        <button
          key={label}
          onClick={label === '<' ? onPrev : label === '>' ? onNext : onToday}
          style={ghostBtnStyle()}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <SecLabel className="week-header" action={navButtons}>
        {`this week · ${week.label} · target ${week.targetKm}km · done ${doneKm}km`}
      </SecLabel>

      <div className="week-strip-scroll">
      <div
        className="week-strip-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 10,
        }}
      >
        {week.days.map((d) => {
          const isToday = d.date === todayStr;
          const isDone = completion[`${week.id}-${d.d}`]?.done ?? false;
          const isRest = d.type === 'REST';

          const metric =
            d.km != null ? `${d.km} km` :
            d.duration != null ? `${d.duration} min` :
            '—';

          const dateLabel = formatDateShort(new Date(d.date + 'T12:00:00'));

          return (
            <div
              key={d.d}
              onClick={() => onDayClick(week.id, d.d)}
              style={{
                background: isToday ? 'var(--bg-3)' : 'var(--bg-2)',
                border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12,
                minHeight: 150,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                transition: 'border-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isToday)
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isToday)
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: isToday ? 'var(--accent)' : 'var(--text-dim)',
                    }}
                  >
                    {DAY_LABELS[d.d]}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 11.5,
                      color: 'var(--text-muted)',
                      marginTop: 3,
                    }}
                  >
                    {dateLabel}
                  </div>
                </div>
                {isDone && <Check />}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  alignItems: 'flex-start',
                }}
              >
                <Pill type={d.type} size="sm" />
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: isRest ? 'var(--text-muted)' : 'var(--text-dim)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {metric}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
}
