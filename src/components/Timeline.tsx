import { useState } from 'react';
import { SecLabel } from './ui/SecLabel';
import { WEEKS, PHASES, PEAK_KM } from '../constants/plan';
import { weeklyKmDone } from '../lib/logic';
import type { CompletionEntry } from '../types';

interface TimelineProps {
  completion: Record<string, CompletionEntry>;
  currentWeekIndex: number;
  viewedWeekIndex: number;
  onWeekClick: (index: number) => void;
}

interface TooltipState {
  weekIndex: number;
  x: number;
  y: number;
}

const TRACK_H = 202;
const GRID_KM = [20, 40, 60];
const LEFT_GUTTER = 34;

function phaseGroups() {
  const groups: { phase: number; count: number; start: number }[] = [];
  WEEKS.forEach((w, i) => {
    const last = groups[groups.length - 1];
    if (last && last.phase === w.phase) {
      last.count++;
    } else {
      groups.push({ phase: w.phase, count: 1, start: i });
    }
  });
  return groups;
}

export function Timeline({
  completion,
  currentWeekIndex,
  viewedWeekIndex,
  onWeekClick,
}: TimelineProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const groups = phaseGroups();

  return (
    <>
      <SecLabel>18 week timeline</SecLabel>
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '26px 26px 18px',
        }}
      >
        {/* Flags row */}
        <div
          style={{
            display: 'flex',
            gap: 5,
            marginBottom: 8,
            paddingLeft: LEFT_GUTTER,
          }}
        >
          {WEEKS.map((w, i) => {
            const flag =
              i === currentWeekIndex ? 'now' :
              w.peak ? 'peak' :
              w.race ? 'race' : null;
            return (
              <div
                key={w.id}
                style={{ flex: 1, textAlign: 'center', height: 14 }}
              >
                {flag && (
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      color: flag === 'now' || flag === 'race' ? 'var(--accent)' : 'var(--text-dim)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {flag}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bar chart area */}
        <div
          style={{
            display: 'flex',
            gap: 5,
            alignItems: 'flex-end',
            position: 'relative',
            paddingLeft: LEFT_GUTTER,
            height: TRACK_H,
          }}
        >
          {/* Gridlines */}
          {GRID_KM.map((g) => (
            <div
              key={g}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: (g / PEAK_KM) * TRACK_H,
                borderTop: '1px dashed var(--border)',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: -8,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {g}
              </span>
            </div>
          ))}

          {/* Bars */}
          {WEEKS.map((w, i) => {
            const phase = PHASES.find((p) => p.num === w.phase)!;
            const barH = Math.max(4, (w.targetKm / PEAK_KM) * TRACK_H);
            const isNow = i === currentWeekIndex;
            const isViewed = i === viewedWeekIndex;
            const doneKm = weeklyKmDone(w, completion);
            const frac = isNow ? Math.min(1, doneKm / w.targetKm) : 0;
            const showLabel = isNow || w.peak || w.race;

            return (
              <div
                key={w.id}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: TRACK_H,
                  cursor: 'pointer',
                }}
                onClick={() => onWeekClick(i)}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  setTooltip({ weekIndex: i, x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: barH,
                    borderRadius: '3px 3px 0 0',
                    background: phase.color,
                    opacity: isViewed && !isNow ? 0.5 : 0.24,
                    outline: isNow ? '1.5px solid var(--accent)' : isViewed ? '1.5px solid var(--border-hover)' : 'none',
                    transition: 'opacity 150ms ease',
                  }}
                >
                  {/* Completed fill */}
                  {isNow && frac > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: `${frac * 100}%`,
                        background: 'var(--accent)',
                        borderRadius: frac >= 1 ? '3px 3px 0 0' : '0 0 3px 3px',
                        opacity: 1,
                      }}
                    />
                  )}

                  {/* Label above current/peak/race bars */}
                  {showLabel && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -19,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontFamily: 'var(--mono)',
                        fontSize: 11.5,
                        color: isNow ? 'var(--accent)' : 'var(--text-muted)',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {w.targetKm}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--border)',
            margin: '10px 0 0',
            marginLeft: LEFT_GUTTER,
          }}
        />

        {/* Week labels */}
        <div
          style={{
            display: 'flex',
            gap: 5,
            marginTop: 8,
            paddingLeft: LEFT_GUTTER,
          }}
        >
          {WEEKS.map((w, i) => (
            <div key={w.id} style={{ flex: 1, textAlign: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: i === currentWeekIndex ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: i === currentWeekIndex ? 700 : 400,
                  fontVariantNumeric: 'tabular-nums',
                  cursor: 'pointer',
                }}
                onClick={() => onWeekClick(i)}
              >
                {w.num}
              </span>
            </div>
          ))}
        </div>

        {/* Phase band */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginTop: 9,
            paddingLeft: LEFT_GUTTER,
          }}
        >
          {groups.map((g, idx) => {
            const phase = PHASES.find((p) => p.num === g.phase)!;
            return (
              <div key={idx} style={{ flex: g.count }}>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: phase.color,
                    opacity: 0.8,
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--mono)',
                    fontSize: 11.5,
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  {phase.short}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 100,
            whiteSpace: 'nowrap',
          }}
        >
          {(() => {
            const w = WEEKS[tooltip.weekIndex];
            return (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                  {w.label}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {w.dateStart} – {w.dateEnd}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Target: {w.targetKm} km
                </div>
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
