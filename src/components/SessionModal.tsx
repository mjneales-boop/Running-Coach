import { useEffect, useRef, useState } from 'react';
import { Sheet } from './ui/Sheet';
import { Tag } from './ui/Tag';
import { Button } from './ui/Button';
import { StatBlock } from './daily/SessionCard';
import { StrengthLinkCard } from './daily/StrengthLinkCard';
import { PaceProgressionChart } from './progress/PaceProgressionChart';
import { guideEntriesForDay } from '../lib/coaching';
import { estimateDuration, zoneForPace } from '../lib/logic';
import { usePlanConfig } from '../hooks/usePlanConfig';
import { SESSION_TYPE_LABEL } from '../lib/coachNotes';
import { WORKOUTS } from '../constants/workouts';
import type { Week, Day, CompletionEntry, DayAbbr, WeekContentMap, StravaActivity } from '../types';

const GYM_OPTIONS = Object.values(WORKOUTS).map((w) => ({ id: w.id, name: w.name }));

interface SessionModalProps {
  weekId: string;
  dayAbbr: DayAbbr;
  week: Week;
  completion: Record<string, CompletionEntry>;
  onToggleDone: (weekId: string, day: DayAbbr) => Promise<void>;
  onSetNotes: (weekId: string, day: DayAbbr, notes: string) => Promise<void>;
  onClose: () => void;
  swapMap: WeekContentMap;
  onSwapDay: (dayA: DayAbbr, dayB: DayAbbr) => void;
  stravaActivities?: Record<string, StravaActivity>;
  onAddGym: (date: string, gym: string, workoutId: string) => void;
  onRemoveGym: (date: string) => void;
  onNavigateToStrength: (weekId: string, dayAbbr: DayAbbr) => void;
}

export function SessionModal({
  weekId,
  dayAbbr,
  week,
  completion,
  onToggleDone,
  onSetNotes,
  onClose,
  swapMap,
  onSwapDay,
  stravaActivities,
  onAddGym,
  onRemoveGym,
  onNavigateToStrength,
}: SessionModalProps) {
  const { zones } = usePlanConfig();
  const day: Day | undefined = week.days.find((d) => d.d === dayAbbr);
  const sessionKey = `${weekId}-${dayAbbr}`;
  const entry = completion[sessionKey] ?? { done: false };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasCardio = day ? ['LONG', 'WORKOUT', 'EASY', 'BIKE'].includes(day.type) : false;
  const hasGym = !!day?.workoutId;
  const [showAddGymPicker, setShowAddGymPicker] = useState(false);

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

  const label = SESSION_TYPE_LABEL[day.type];
  const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const guides = guideEntriesForDay(day);
  const zone = zoneForPace(day.pace, zones);
  const duration = estimateDuration(day);

  return (
    <Sheet
      onClose={onClose}
      headerLeft={
        <div className="flex items-center gap-3">
          <Tag tone="accent">{label}</Tag>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{dateLabel}</span>
        </div>
      }
    >
      <>
          <h1
            className="mb-4 font-display text-[42px] font-extrabold uppercase leading-[0.92] tracking-[-0.01em]"
            style={{ fontVariationSettings: "'wdth' 110" }}
          >
            {label}
          </h1>

          {guides[0] && (
            <p className="mb-6 max-w-[38ch] text-[17px] font-semibold leading-snug text-ink">{guides[0].oneLiner}</p>
          )}

          {hasCardio && (
            <div className="mb-6 grid grid-cols-3 gap-0.5 border-t border-hairline">
              <StatBlock label="Distance" value={day.km != null ? String(day.km) : '—'} unit="km" isFirst />
              <StatBlock label="Pace" value={day.pace ?? '—'} unit="/km" />
              <StatBlock label="Est." value={duration ?? '—'} unit="h" />
            </div>
          )}

          {zone && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Zone</span>
              <Tag tone="accent">
                {zone.name} {zone.pace}
              </Tag>
            </div>
          )}

          {stravaActivities?.[day.date] && (() => {
            const act = stravaActivities[day.date];
            const totalSec = Math.round(act.avgPaceMinKm * 60);
            const pace = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
            return (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-[rgba(252,76,2,0.25)] bg-[rgba(252,76,2,0.06)] px-3.5 py-2.5">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#FC4C02]">
                  via strava
                </span>
                <span className="font-mono text-[12.5px] text-muted">
                  {act.distanceKm} km · {pace} /km
                  {act.avgHR != null && <> · {act.avgHR} bpm</>}
                </span>
              </div>
            );
          })()}

          {day.notes && (
            <div className="mb-6 border-l-2 border-accent py-0.5 pl-4">
              <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-accent">Coach</div>
              <p className="max-w-[42ch] text-[15px] leading-normal text-[#D3DAE1]">{day.notes}</p>
            </div>
          )}

          {day.type === 'WORKOUT' && <PaceProgressionChart currentWeekId={weekId} />}

          {guides.length > 0 && (
            <div className="mb-6 flex flex-col gap-6">
              {guides.map((g, gi) => (
                <div key={g.key} className={gi > 0 ? 'border-t border-hairline pt-6' : ''}>
                  {(['what', 'why', 'how it should feel'] as const).map((h) => {
                    const body = h === 'what' ? g.what : h === 'why' ? g.why : g.feel;
                    return (
                      <div key={h} className="mb-4">
                        <div className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">{h}</div>
                        <p className="text-[15px] leading-normal text-[#D3DAE1]">{body}</p>
                      </div>
                    );
                  })}
                  <div className="mb-4">
                    <div className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">Execute</div>
                    <ul className="flex flex-col gap-1.5">
                      {g.execute.map((cue, i) => (
                        <li key={i} className="flex gap-2 text-[15px] leading-normal text-[#D3DAE1]">
                          <span className="mt-[9px] h-1 w-1 flex-none rounded-full bg-accent" />
                          {cue}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-warning">Avoid</div>
                    <p className="text-[15px] italic leading-normal text-[#D3DAE1]">{g.mistake}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-6">
            <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">
              Your notes
            </div>
            <textarea
              ref={textareaRef}
              placeholder="How did it go? HR, effort, notes..."
              className="min-h-[80px] w-full resize-y rounded-xl border border-hairline bg-field p-3.5 text-sm leading-normal text-ink outline-none transition-colors focus:border-hairline-strong"
              onBlur={(e) => onSetNotes(weekId, dayAbbr, e.target.value)}
            />
          </div>

          <div className="mb-6 border-t border-hairline pt-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">Reschedule</span>
              {swapMap[dayAbbr] && (
                <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-warning">
                  ↕ moved here from {swapMap[dayAbbr]!.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {week.days
                .filter((d) => d.d !== dayAbbr)
                .map((d) => {
                  const isSwapPartner = swapMap[dayAbbr] === d.d;
                  return (
                    <button
                      key={d.d}
                      onClick={() => onSwapDay(dayAbbr, d.d)}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.05em] transition-colors ${
                        isSwapPartner
                          ? 'border-[rgba(0,217,255,0.4)] bg-accent-tint text-accent'
                          : 'border-hairline text-muted'
                      }`}
                    >
                      {d.d} · {d.type.toLowerCase()}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="mb-6 border-t border-hairline pt-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">Gym</span>
              {hasGym ? (
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[11.5px] text-accent">{day.gym}</span>
                  <button
                    onClick={() => onRemoveGym(day.date)}
                    className="rounded-lg border border-hairline px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowAddGymPicker((v) => !v)}
                    className="rounded-lg border border-dashed border-hairline-strong px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted"
                  >
                    + Add gym session
                  </button>
                  {showAddGymPicker && (
                    <div className="absolute right-0 top-[calc(100%+6px)] z-10 min-w-[170px] overflow-hidden rounded-xl border border-hairline-strong bg-surface py-1.5 shadow-xl">
                      {GYM_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            onAddGym(day.date, opt.name, opt.id);
                            setShowAddGymPicker(false);
                          }}
                          className="block w-full px-3.5 py-2.5 text-left font-mono text-[12px] text-[#D3DAE1]"
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {hasGym && (
            <div className="mb-6">
              <StrengthLinkCard
                gymName={day.gym ?? 'Strength'}
                dayLabel={dateLabel}
                onClick={() => onNavigateToStrength(weekId, dayAbbr)}
              />
            </div>
          )}

          {entry.done && entry.completedAt && (
            <div className="mb-4 font-mono text-xs text-success">
              ✓ Completed {new Date(entry.completedAt).toLocaleString()}
            </div>
          )}

          <Button variant={entry.done ? 'success' : 'primary'} className="w-full" onClick={() => onToggleDone(weekId, dayAbbr)}>
            {entry.done ? '✓ Completed — tap to undo' : 'Mark complete'}
          </Button>
        </>
    </Sheet>
  );
}
