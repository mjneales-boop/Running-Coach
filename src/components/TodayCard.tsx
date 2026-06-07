import { Pill } from './ui/Pill';
import { isHardSession } from '../lib/logic';
import type { Week, Day, CompletionEntry, DayAbbr } from '../types';

interface TodayCardProps {
  week: Week;
  day: Day | undefined;
  completion: Record<string, CompletionEntry>;
  onToggleDone: (weekId: string, day: DayAbbr) => Promise<void>;
  onOpenModal: () => void;
}

interface StatBlockProps {
  label: string;
  value: string;
  unit?: string;
}

function StatBlock({ label, value, unit }: StatBlockProps) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 5,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontWeight: 600,
            fontSize: 21,
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function buildStats(day: Day) {
  const stats: { label: string; value: string; unit?: string }[] = [];

  if (day.km != null) {
    stats.push({ label: 'Distance', value: String(day.km), unit: 'km' });
  }
  if (day.duration != null) {
    stats.push({ label: 'Duration', value: String(day.duration), unit: 'min' });
  }
  if (day.pace) {
    stats.push({ label: 'Pace', value: day.pace, unit: '/km' });
  }

  const effort =
    day.type === 'LONG' ? 'Z2 easy' :
    day.type === 'WORKOUT' ? 'Z4–5 quality' :
    day.type === 'RACE' ? 'Race effort' :
    day.type === 'BIKE' ? 'Z2 easy' :
    day.type === 'EASY' ? 'Z2 easy' : 'Rest';
  stats.push({ label: 'Effort', value: effort });

  if (day.strides) {
    stats.push({ label: 'Extras', value: day.strides });
  } else if (day.gym) {
    stats.push({ label: 'Gym', value: day.gym });
  }

  return stats;
}

export function TodayCard({ week, day, completion, onToggleDone, onOpenModal }: TodayCardProps) {
  if (!day) {
    return (
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 28,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 40,
            color: 'var(--text-muted)',
          }}
        >
          Rest Day
        </div>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 16.5, color: 'var(--text-dim)', marginTop: 16 }}>
          No session scheduled for today in this week.
        </p>
      </div>
    );
  }

  const hard = isHardSession(day.type);
  const sessionKey = `${week.id}-${day.d}`;
  const isDone = completion[sessionKey]?.done ?? false;

  const dayOfWeek = new Date(day.date + 'T12:00:00')
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();

  const stats = buildStats(day);

  const coachNote = day.notes ?? (
    hard
      ? 'Execute as planned. Stay at the conservative end of the pace range until the final km.'
      : 'Keep it easy and conversational throughout. This is aerobic conditioning, not a test.'
  );

  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: `1px solid ${hard ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: 28,
        boxShadow: hard ? '0 0 40px rgba(0,217,255,0.06)' : 'none',
        transition: 'border-color 150ms ease',
      }}
    >
      {/* Row 1: pill + day name */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Pill type={day.type} />
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14.5,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {dayOfWeek}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontWeight: 900,
          fontSize: 40,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          marginBottom: 24,
          textWrap: 'balance',
          color: 'var(--text)',
        }}
      >
        {day.title}
      </div>

      {/* Stats row with dividers */}
      <div
        style={{
          display: 'flex',
          gap: 28,
          marginBottom: 22,
          flexWrap: 'wrap',
        }}
      >
        {stats.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 28 }}>
            {i > 0 && <div style={{ width: 1, background: 'var(--border)' }} />}
            <StatBlock label={s.label} value={s.value} unit={s.unit} />
          </div>
        ))}
      </div>

      {/* Coach note */}
      <div
        style={{
          background: 'var(--bg-3)',
          borderLeft: `2px solid ${hard ? 'var(--accent)' : 'var(--border-hover)'}`,
          borderRadius: '0 8px 8px 0',
          padding: '15px 18px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 9,
            letterSpacing: '0.02em',
          }}
        >
          {'// coach'}
        </div>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 16.5,
            lineHeight: 1.62,
            color: 'var(--text-dim)',
          }}
        >
          {coachNote}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => onToggleDone(week.id, day.d)}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: 8,
            padding: '14px 22px',
            cursor: 'pointer',
            border: `1px solid ${isDone ? 'var(--success)' : 'var(--accent)'}`,
            background: isDone ? 'var(--success)' : 'var(--accent)',
            color: '#04222A',
            transition: 'background 150ms ease, border-color 150ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          {isDone ? '✓ Complete' : 'Mark Complete'}
        </button>
        <button
          onClick={onOpenModal}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: 8,
            padding: '14px 22px',
            cursor: 'pointer',
            border: '1px solid var(--border-hover)',
            background: 'transparent',
            color: 'var(--text-dim)',
            transition: 'border-color 150ms ease, color 150ms ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
          }}
        >
          Details + Notes
        </button>
      </div>
    </div>
  );
}
