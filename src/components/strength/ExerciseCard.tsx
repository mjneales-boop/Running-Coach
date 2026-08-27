import { useState } from 'react';
import { SetRow } from './SetRow';
import { Chevron } from '../ui/Accordion';
import { Check } from '../ui/Check';
import { isCommitted } from '../../lib/strength';
import type { Exercise } from '../../constants/workouts';
import type { SetLog } from '../../types';

interface ExerciseCardProps {
  exercise: Exercise;
  /** Stored sets for this exercise, sparse by set index. */
  sets: SetLog[];
  /** Committed sets from the last session of this exercise — the ghost source. */
  lastSets: SetLog[];
  open: boolean;
  onToggleOpen: () => void;
  onCommitSet: (setIndex: number, set: SetLog) => void;
  onAddSet: () => void;
  alternatives?: Exercise[];
  onSwap?: (newExerciseId: string) => void;
  /** A past or stood-down session is a record, not a form. */
  readOnly?: boolean;
  /** Whether a set would be an all-time best — drives the PR tag and sweep. */
  evaluatePR?: (set: SetLog) => boolean;
}

function CheckBadge() {
  return (
    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-[rgba(0,217,255,0.4)] bg-accent-tint">
      <Check size={14} color="var(--color-accent)" />
    </span>
  );
}

/**
 * One dot per planned set. Filled = committed, outlined = pending. Sets logged
 * beyond the plan get a smaller dot so the planned count stays readable.
 */
function SetPips({ planned, committed, total }: { planned: number; committed: number; total: number }) {
  const dots = Array.from({ length: Math.max(planned, total) }, (_, i) => ({
    extra: i >= planned,
    filled: i < committed,
  }));
  return (
    <span className="flex flex-none items-center gap-[5px]" aria-hidden>
      {dots.map((dot, i) => (
        <span
          key={i}
          className={`rounded-full ${dot.extra ? 'h-[5px] w-[5px]' : 'h-[7px] w-[7px]'} ${
            dot.filled ? 'bg-accent' : 'border border-hairline-strong'
          }`}
        />
      ))}
    </span>
  );
}

/** Top set of the previous session — removes the "what did I do last week" memory tax. */
function lastReference(exercise: Exercise, lastSets: SetLog[]): string | null {
  if (lastSets.length === 0) return null;
  if (exercise.unit === 'check') return null;

  if (exercise.unit === 'kg') {
    const best = lastSets.filter((s) => s.weight != null).sort((a, b) => b.weight! - a.weight!)[0];
    if (!best) return null;
    return `Last  ${best.weight} kg × ${best.reps ?? '—'}`;
  }
  if (exercise.unit === 'bodyweight') {
    const best = lastSets.filter((s) => s.reps != null).sort((a, b) => b.reps! - a.reps!)[0];
    return best ? `Last  ${best.reps} reps` : null;
  }
  const best = lastSets.filter((s) => s.seconds != null).sort((a, b) => b.seconds! - a.seconds!)[0];
  return best ? `Last  ${best.seconds}s` : null;
}

export function ExerciseCard({
  exercise,
  sets,
  lastSets,
  open,
  onToggleOpen,
  onCommitSet,
  onAddSet,
  alternatives = [],
  onSwap,
  readOnly = false,
  evaluatePR,
}: ExerciseCardProps) {
  const [showSwapPicker, setShowSwapPicker] = useState(false);

  const rowCount = Math.max(exercise.sets, sets.length);
  const committedCount = sets.filter(isCommitted).length;
  const complete = committedCount >= exercise.sets && exercise.sets > 0;
  const canSwap = !readOnly && !exercise.locked && alternatives.length > 0 && !!onSwap;
  const reference = lastReference(exercise, lastSets);

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-hairline bg-surface">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-[18px] py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`truncate font-display text-base font-bold ${complete ? 'text-muted' : 'text-ink'}`}
            >
              {exercise.name}
            </span>
            {exercise.locked && (
              <span className="flex-none rounded border border-[rgba(229,103,92,0.4)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-warning">
                Required
              </span>
            )}
          </span>

          <span className="mt-1.5 flex items-baseline gap-2.5">
            <span className="stride-num font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-[#B4BDC5]">
              {exercise.sets} × {exercise.reps}
            </span>
            {reference && (
              <span className="stride-num truncate font-mono text-[11px] uppercase tracking-[0.05em] text-faint">
                {reference}
              </span>
            )}
          </span>
        </span>

        <span className="flex flex-none items-center gap-3">
          <SetPips planned={exercise.sets} committed={committedCount} total={rowCount} />
          {complete ? <CheckBadge /> : <Chevron open={open} />}
        </span>
      </button>

      {open && (
        <div className="px-[18px] pb-[18px]">
          {exercise.note && (
            <p className="mb-3 border-l border-hairline-strong pl-2.5 font-mono text-[11px] leading-[1.5] text-muted">
              {exercise.note}
            </p>
          )}

          {canSwap && (
            <div className="relative mb-3">
              <button
                type="button"
                onClick={() => setShowSwapPicker((v) => !v)}
                className="min-h-[44px] rounded-lg border border-dashed border-hairline-strong px-2.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted"
              >
                Swap exercise
              </button>
              {showSwapPicker && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-10 min-w-[200px] overflow-hidden rounded-xl border border-hairline-strong bg-surface py-1.5 shadow-xl">
                  {alternatives.map((alt) => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => { onSwap!(alt.id); setShowSwapPicker(false); }}
                      className="block min-h-[44px] w-full px-3.5 text-left font-mono text-[12px] text-[#D3DAE1]"
                    >
                      {alt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {exercise.unit !== 'check' && (
            <div
              className={`mb-2 grid gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint ${
                exercise.unit === 'kg'
                  ? 'grid-cols-[18px_1.22fr_1fr_44px]'
                  : 'grid-cols-[18px_minmax(0,1fr)_44px]'
              }`}
            >
              <span>#</span>
              {exercise.unit === 'kg' && <span className="text-center">Weight</span>}
              <span className="text-center">
                {exercise.unit === 'time' ? 'Time' : 'Reps'}
              </span>
              <span />
            </div>
          )}

          {Array.from({ length: rowCount }, (_, i) => (
            <SetRow
              key={i}
              index={i}
              unit={exercise.unit}
              committed={isCommitted(sets[i]) ? sets[i] : undefined}
              ghost={lastSets[i]}
              prescription={exercise.reps}
              readOnly={readOnly}
              evaluatePR={evaluatePR}
              onCommit={(set) => onCommitSet(i, set)}
            />
          ))}

          {exercise.unit !== 'check' && !readOnly && (
            <button
              type="button"
              onClick={onAddSet}
              className="mt-2.5 min-h-[44px] w-full rounded-[11px] border border-dashed border-hairline-strong text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
            >
              + Add set
            </button>
          )}
        </div>
      )}
    </div>
  );
}
