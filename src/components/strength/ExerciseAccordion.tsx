import { useEffect, useRef, useState } from 'react';
import { Accordion, Chevron } from '../ui/Accordion';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatDateShort } from '../../lib/logic';
import type { Exercise } from '../../constants/workouts';
import type { SetLog } from '../../types';

interface ExerciseAccordionProps {
  exercise: Exercise;
  sets: SetLog[];
  pr: SetLog | undefined;
  recent?: { date: string; summary: string }[];
  done: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onSetChange: (setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onAddSet: () => void;
  onToggleDone: () => void;
  alternatives?: Exercise[];
  onSwap?: (newExerciseId: string) => void;
}

function CheckBadge() {
  return (
    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-[rgba(0,217,255,0.4)] bg-accent-tint">
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={3}>
        <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Local text buffer decoupled from the parsed numeric value: without this, every
// keystroke round-trips through Number(raw) -> String(num), which silently drops
// an in-progress trailing decimal point (e.g. "62." collapses back to "62") before
// the user can finish typing "62.5". Only resyncs from props while unfocused, so a
// background sync landing mid-edit can't clobber what's being typed either.
function SetField({
  value,
  onChange,
  unit,
  inputMode,
}: {
  value: number | undefined;
  onChange: (raw: string) => void;
  unit: string;
  inputMode: 'decimal' | 'numeric';
}) {
  const [text, setText] = useState(value != null ? String(value) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setText(value != null ? String(value) : '');
  }, [value]);

  return (
    <Input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value);
      }}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; }}
      unit={unit}
      inputMode={inputMode}
      placeholder="0"
    />
  );
}

export function ExerciseAccordion({
  exercise,
  sets,
  pr,
  recent = [],
  done,
  open,
  onToggleOpen,
  onSetChange,
  onAddSet,
  onToggleDone,
  alternatives = [],
  onSwap,
}: ExerciseAccordionProps) {
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const rowCount = Math.max(exercise.sets, sets.length);
  const weights = sets.map((s) => s.weight).filter((w): w is number => w != null);
  const topSetValue = weights.length ? Math.max(...weights) : undefined;
  const canSwap = !exercise.locked && alternatives.length > 0 && !!onSwap;

  return (
    <div className="mb-3">
      <Accordion
        open={open}
        onToggle={onToggleOpen}
        header={
          <>
            <div className="min-w-0">
              <div className="text-base font-bold">{exercise.name}</div>
              <div className="mt-1.5 font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-[#B4BDC5]">
                {exercise.sets} × {exercise.reps} · {exercise.sets} sets
              </div>
            </div>
            {done ? <CheckBadge /> : <Chevron open={open} />}
          </>
        }
      >
        {(pr || topSetValue != null || recent.length > 0) && (
          <div className="mb-3.5 border-y border-hairline">
            {(pr || topSetValue != null) && (
              <div className="flex items-center gap-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em]">
                {pr && (
                  <span className="text-faint">
                    PR <span className="text-ink">{pr.weight} kg × {pr.reps}</span>
                  </span>
                )}
                {topSetValue != null && (
                  <span className="text-faint">
                    Top set <span className="text-accent">{topSetValue} kg</span>
                  </span>
                )}
              </div>
            )}
            {recent.length > 0 && (
              <div className="border-t border-hairline-soft py-2.5">
                <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">Recent</div>
                {recent.map((entry) => (
                  <div key={entry.date} className="flex items-center justify-between py-1.5">
                    <span className="font-mono text-[11px] tracking-[0.06em] text-muted">
                      {formatDateShort(new Date(`${entry.date}T12:00:00`))}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.04em] text-[#C4CCD3]">{entry.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canSwap && (
          <div className="relative mb-3">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSwapPicker((v) => !v); }}
              className="rounded-lg border border-dashed border-hairline-strong px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted"
            >
              Swap exercise
            </button>
            {showSwapPicker && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-10 min-w-[200px] overflow-hidden rounded-xl border border-hairline-strong bg-surface py-1.5 shadow-xl">
                {alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwap!(alt.id);
                      setShowSwapPicker(false);
                    }}
                    className="block w-full px-3.5 py-2.5 text-left font-mono text-[12px] text-[#D3DAE1]"
                  >
                    {alt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-2 grid grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)] gap-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
        </div>

        {Array.from({ length: rowCount }, (_, i) => sets[i] ?? {}).map((set, i) => (
          <div key={i} className="mb-2 grid grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2.5">
            <span className="font-mono text-[13px] text-muted">{i + 1}</span>
            <SetField
              value={set.weight}
              onChange={(raw) => onSetChange(i, 'weight', raw)}
              unit="KG"
              inputMode="decimal"
            />
            <SetField
              value={set.reps}
              onChange={(raw) => onSetChange(i, 'reps', raw)}
              unit="REPS"
              inputMode="numeric"
            />
          </div>
        ))}

        <div className="mt-3.5 flex gap-2.5">
          <button
            onClick={onAddSet}
            className="flex-1 rounded-[11px] border border-dashed border-hairline-strong py-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
          >
            + Add set
          </button>
          <Button variant={done ? 'primary' : 'ghost'} className="flex-1" onClick={onToggleDone}>
            {done ? 'Completed' : 'Mark done'}
          </Button>
        </div>
      </Accordion>
    </div>
  );
}
