import { Accordion, Chevron } from '../ui/Accordion';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Exercise } from '../../constants/workouts';
import type { SetLog } from '../../types';

interface ExerciseAccordionProps {
  exercise: Exercise;
  sets: SetLog[];
  pr: SetLog | undefined;
  done: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onSetChange: (setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onAddSet: () => void;
  onToggleDone: () => void;
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

export function ExerciseAccordion({
  exercise,
  sets,
  pr,
  done,
  open,
  onToggleOpen,
  onSetChange,
  onAddSet,
  onToggleDone,
}: ExerciseAccordionProps) {
  const rowCount = Math.max(exercise.sets, sets.length);
  const weights = sets.map((s) => s.weight).filter((w): w is number => w != null);
  const topSetValue = weights.length ? Math.max(...weights) : undefined;

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
        {(pr || topSetValue != null) && (
          <div className="mb-3.5 flex items-center gap-4 border-y border-hairline py-3 font-mono text-[11px] uppercase tracking-[0.08em]">
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

        <div className="mb-2 grid grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)] gap-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
        </div>

        {Array.from({ length: rowCount }, (_, i) => sets[i] ?? {}).map((set, i) => (
          <div key={i} className="mb-2 grid grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2.5">
            <span className="font-mono text-[13px] text-muted">{i + 1}</span>
            <Input
              value={set.weight != null ? String(set.weight) : ''}
              onChange={(e) => onSetChange(i, 'weight', e.target.value)}
              unit="KG"
              inputMode="decimal"
              placeholder="0"
            />
            <Input
              value={set.reps != null ? String(set.reps) : ''}
              onChange={(e) => onSetChange(i, 'reps', e.target.value)}
              unit="REPS"
              inputMode="numeric"
              placeholder="0"
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
