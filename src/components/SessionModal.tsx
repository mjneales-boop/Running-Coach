import { useEffect, useRef } from 'react';
import { Pill } from './ui/Pill';
import { isHardSession } from '../lib/logic';
import type { Week, Day, CompletionEntry, DayAbbr } from '../types';

interface SessionModalProps {
  weekId: string;
  dayAbbr: DayAbbr;
  week: Week;
  completion: Record<string, CompletionEntry>;
  onToggleDone: (weekId: string, day: DayAbbr) => Promise<void>;
  onSetNotes: (weekId: string, day: DayAbbr, notes: string) => Promise<void>;
  onClose: () => void;
}

export function SessionModal({
  weekId,
  dayAbbr,
  week,
  completion,
  onToggleDone,
  onSetNotes,
  onClose,
}: SessionModalProps) {
  const day: Day | undefined = week.days.find((d) => d.d === dayAbbr);
  const sessionKey = `${weekId}-${dayAbbr}`;
  const entry = completion[sessionKey] ?? { done: false };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = entry.notes ?? '';
    }
  }, [entry.notes]);

  if (!day) return null;

  const hard = isHardSession(day.type);
  const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 14,
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    padding: '12px 14px',
    resize: 'vertical',
    minHeight: 80,
    width: '100%',
    outline: 'none',
    transition: 'border-color 150ms ease',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: `1px solid ${hard ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12,
          width: '100%',
          maxWidth: 560,
          padding: 28,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: hard ? '0 0 40px rgba(0,217,255,0.06)' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Pill type={day.type} />
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 13,
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
              }}
            >
              {dateLabel.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: 'var(--text)',
            marginBottom: 20,
          }}
        >
          {day.title}
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 18,
          }}
        >
          {day.km != null && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Distance</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{day.km} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>km</span></div>
            </div>
          )}
          {day.duration != null && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Duration</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{day.duration} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>min</span></div>
            </div>
          )}
          {day.pace && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Pace</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{day.pace} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/km</span></div>
            </div>
          )}
          {day.strides && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Strides</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{day.strides}</div>
            </div>
          )}
          {day.gym && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Gym</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{day.gym}</div>
            </div>
          )}
        </div>

        {/* Coach note */}
        {day.notes && (
          <div
            style={{
              background: 'var(--bg-3)',
              borderLeft: `2px solid ${hard ? 'var(--accent)' : 'var(--border-hover)'}`,
              borderRadius: '0 8px 8px 0',
              padding: '12px 16px',
              marginBottom: 18,
            }}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>// coach</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)' }}>{day.notes}</div>
          </div>
        )}

        {/* Notes textarea */}
        <div style={{ marginBottom: 18 }}>
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
            Your Notes
          </div>
          <textarea
            ref={textareaRef}
            placeholder="How did it go? HR, effort, notes..."
            style={{
              ...inputStyle,
              lineHeight: 1.6,
            }}
            onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-hover)'; }}
            onBlur={(e) => {
              (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)';
              onSetNotes(weekId, dayAbbr, (e.target as HTMLTextAreaElement).value);
            }}
          />
        </div>

        {/* If done, show completedAt */}
        {entry.done && entry.completedAt && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--success)', marginBottom: 16 }}>
            ✓ Completed {new Date(entry.completedAt).toLocaleString()}
          </div>
        )}

        {/* Mark complete button */}
        <button
          onClick={() => onToggleDone(weekId, dayAbbr)}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: 8,
            padding: '14px 22px',
            cursor: 'pointer',
            border: `1px solid ${entry.done ? 'var(--success)' : 'var(--accent)'}`,
            background: entry.done ? 'var(--success)' : 'var(--accent)',
            color: '#04222A',
            transition: 'background 150ms ease, border-color 150ms ease',
            width: '100%',
          }}
        >
          {entry.done ? '✓ Completed — Undo' : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
}
