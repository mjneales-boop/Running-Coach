import { useEffect, useRef, useState } from 'react';
import { Stepper } from '../ui/Stepper';
import { Check } from '../ui/Check';
import { REPS_STEP, TIME_STEP_SEC, WEIGHT_STEP_KG } from '../../constants/workouts';
import { prescribedReps, setDelta } from '../../lib/strength';
import type { SetDelta } from '../../lib/strength';
import type { ExerciseUnit } from '../../constants/workouts';
import type { SetLog } from '../../types';

/** A dirty row commits itself after this long without a change, so a distracted athlete never loses data. */
const IDLE_COMMIT_MS = 2500;

/** The delta chip retires after this long. The value it described stays put. */
const CHIP_VISIBLE_MS = 4000;

interface SetRowProps {
  /** Zero-based; displayed as index + 1. */
  index: number;
  unit: ExerciseUnit;
  /** The stored set, if this row has been committed. */
  committed: SetLog | undefined;
  /** Same set index from the last session — the ghost suggestion. Never stored. */
  ghost: SetLog | undefined;
  /** Shown instead of ghost numbers when the exercise has no history at all. */
  prescription?: string;
  onCommit: (set: SetLog) => void;
  /** Renders the row as a readout with no controls at all. */
  readOnly?: boolean;
  /**
   * Whether a set would be an all-time best. Asked at commit time, so the PR
   * sweep fires exactly once, from the commit — never re-derived on a render.
   */
  evaluatePR?: (set: SetLog) => boolean;
}

type Draft = { weight?: number; reps?: number; seconds?: number };

function draftFrom(set: SetLog | undefined): Draft {
  return { weight: set?.weight, reps: set?.reps, seconds: set?.seconds };
}

export function SetRow({
  index,
  unit,
  committed,
  ghost,
  prescription,
  onCommit,
  readOnly = false,
  evaluatePR,
}: SetRowProps) {
  const isCommitted = !!committed;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [dirty, setDirty] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [sweepKey, setSweepKey] = useState(0);
  const [chip, setChip] = useState<SetDelta | null>(null);

  // Reopening a committed row starts from what was stored, not from the ghost.
  // Seeded here rather than in an effect, so no cascading render is triggered.
  const beginEdit = () => {
    if (readOnly) return;
    setDraft(draftFrom(committed));
    setEditing(true);
  };

  // `active` is what the athlete has actually put in — draft, or the stored set.
  // The ghost is deliberately kept out of it and passed to the Stepper as a
  // placeholder, so an untouched row renders dimmed rather than looking logged.
  const active: Draft = dirty || editing ? draft : draftFrom(committed);
  const suggestion: Draft = isCommitted && !editing ? {} : (ghost ?? {});

  // What a commit would actually write: whatever is on screen, ghost included.
  const effective: Draft = {
    weight: active.weight ?? suggestion.weight,
    reps: active.reps ?? suggestion.reps,
    seconds: active.seconds ?? suggestion.seconds,
  };

  // With no history to ghost from, fall back to the prescribed rep count so the
  // row still suggests something rather than showing a dash.
  const fallbackReps =
    !isCommitted && !ghost && prescription && unit !== 'check' && unit !== 'time'
      ? prescribedReps(prescription)
      : undefined;
  const suggestedReps = suggestion.reps ?? fallbackReps;
  const showingGhost = !isCommitted && !dirty && (!!ghost || fallbackReps != null);

  // A kg set with no weight is not a set. Committing one would write junk that
  // every tonnage figure downstream would then have to defend against.
  const canCommit =
    unit === 'check' ||
    (unit === 'kg' && (active.weight ?? suggestion.weight) != null) ||
    (unit === 'bodyweight' && (active.reps ?? suggestedReps) != null) ||
    (unit === 'time' && (active.seconds ?? suggestion.seconds) != null);

  // Plain function, not useCallback: the React compiler memoizes it, and a manual
  // dep list here silently went stale the moment a new suggestion source was added.
  const commit = () => {
    const set: SetLog = { committedAt: Date.now() };
    if (unit === 'kg') { set.weight = effective.weight; set.reps = effective.reps ?? fallbackReps; }
    else if (unit === 'bodyweight') { set.reps = effective.reps ?? fallbackReps; }
    else if (unit === 'time') { set.seconds = effective.seconds; }
    else { set.done = true; }

    // Nothing to record — don't write an empty set just because ✓ was tapped.
    if (unit !== 'check' && set.weight == null && set.reps == null && set.seconds == null) return;

    // Compare against the same set index last session before anything is written.
    setChip(setDelta(set, ghost));
    if (evaluatePR?.(set)) setSweepKey((k) => k + 1);

    onCommit(set);
    setDirty(false);
    setEditing(false);
    setFlashKey((k) => k + 1);
  };

  // Idle auto-commit. Held in a ref so the timer always fires the latest draft
  // rather than the closure captured when the timer was scheduled. This effect
  // is declared before the timer's so the ref is current when the timer lands.
  const commitRef = useRef(commit);
  useEffect(() => { commitRef.current = commit; });

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => commitRef.current(), IDLE_COMMIT_MS);
    return () => clearTimeout(t);
  }, [dirty, draft]);

  useEffect(() => {
    if (!chip) return;
    const t = setTimeout(() => setChip(null), CHIP_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [chip]);

  const update = (patch: Draft) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const showAsCommitted = readOnly || (isCommitted && !editing);
  const stepperCommitted = showAsCommitted;
  const isPRSet = showAsCommitted && !!committed && !!evaluatePR?.(committed);

  return (
    <div className="relative mb-2">
      {/* Decorative commit acknowledgement. The row reaches its committed look
          from state, so zeroing this under reduced motion loses nothing. */}
      {flashKey > 0 && (
        <div
          key={flashKey}
          aria-hidden
          className="stride-commit-flash pointer-events-none absolute inset-0 rounded-[10px]"
        />
      )}
      {sweepKey > 0 && (
        <div
          key={`pr-${sweepKey}`}
          aria-hidden
          className="stride-pr-sweep pointer-events-none absolute inset-0 rounded-[10px]"
        />
      )}

      <div
        className={`relative grid items-center gap-1.5 ${
          unit === 'kg'
            ? 'grid-cols-[18px_1.22fr_1fr_44px]'
            : 'grid-cols-[18px_minmax(0,1fr)_44px]'
        }`}
      >
        <span
          className={`stride-num font-mono text-[12px] ${showAsCommitted ? 'text-muted' : 'text-faint'}`}
        >
          {index + 1}
        </span>

        {unit === 'kg' && (
          <>
            <Stepper
              value={active.weight}
              placeholder={suggestion.weight != null ? String(suggestion.weight) : '—'}
              step={WEIGHT_STEP_KG}
              unit="KG"
              inputMode="decimal"
              ghost={showingGhost}
              committed={stepperCommitted}
              ariaLabel={`set ${index + 1} weight`}
              onChange={(weight) => update({ weight })}
              onEditBlur={() => { if (dirty) commitRef.current(); }}
            />
            <Stepper
              value={active.reps}
              placeholder={suggestedReps != null ? String(suggestedReps) : '—'}
              step={REPS_STEP}
              unit="REPS"
              inputMode="numeric"
              ghost={showingGhost}
              committed={stepperCommitted}
              ariaLabel={`set ${index + 1} reps`}
              onChange={(reps) => update({ reps })}
              onEditBlur={() => { if (dirty) commitRef.current(); }}
            />
          </>
        )}

        {unit === 'bodyweight' && (
          <Stepper
            value={active.reps}
            placeholder={suggestedReps != null ? String(suggestedReps) : '—'}
            step={REPS_STEP}
            unit="REPS"
            inputMode="numeric"
            ghost={showingGhost}
            committed={stepperCommitted}
            ariaLabel={`set ${index + 1} reps`}
            onChange={(reps) => update({ reps })}
            onEditBlur={() => { if (dirty) commitRef.current(); }}
          />
        )}

        {unit === 'time' && (
          <Stepper
            value={active.seconds}
            placeholder={suggestion.seconds != null ? String(suggestion.seconds) : '—'}
            step={TIME_STEP_SEC}
            unit="SEC"
            inputMode="numeric"
            ghost={showingGhost}
            committed={stepperCommitted}
            ariaLabel={`set ${index + 1} duration`}
            onChange={(seconds) => update({ seconds })}
            onEditBlur={() => { if (dirty) commitRef.current(); }}
          />
        )}

        {unit === 'check' && (
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted">
            {prescription ?? 'Complete'}
          </span>
        )}

        <CommitButton
          committed={showAsCommitted}
          disabled={readOnly || (!showAsCommitted && !canCommit)}
          large={unit === 'check'}
          label={showAsCommitted ? `Edit set ${index + 1}` : `Log set ${index + 1}`}
          onClick={() => (showAsCommitted ? beginEdit() : commit())}
        />

        {/* Feedback floats at the row's right edge, over the space a committed
            row frees up when its stepper chrome retires. It never takes grid
            width, so nothing reflows when the chip retires four seconds later. */}
        {(isPRSet || chip) && (
          <span className="pointer-events-none absolute inset-y-0 right-[46px] flex items-center gap-1.5">
            {isPRSet && <PRTag />}
            {chip && <DeltaChip delta={chip} />}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The delta against the same set index last session.
 *
 * A lighter set is muted, never red. Deloads are training, and an app that
 * paints them as failure is telling the athlete to train through fatigue.
 */
function DeltaChip({ delta }: { delta: SetDelta }) {
  const tone = delta.kind === 'up' ? 'text-accent' : 'text-muted';
  return (
    <span className={`stride-num font-mono text-[10px] uppercase tracking-[0.1em] ${tone}`}>
      {delta.label}
    </span>
  );
}

/** Understated by design: a tag, not a trophy. */
function PRTag() {
  return (
    <span className="rounded border border-[rgba(0,217,255,0.4)] bg-accent-tint px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
      PR
    </span>
  );
}

/**
 * The ✓. On a ghost row this is the whole interaction — one tap commits last
 * session's numbers verbatim, no keyboard.
 */
function CommitButton({
  committed,
  disabled,
  large,
  label,
  onClick,
}: {
  committed: boolean;
  disabled: boolean;
  large: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={committed}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[44px] w-[44px] flex-none items-center justify-center disabled:opacity-40"
    >
      <span
        className={`flex items-center justify-center rounded-full border transition-colors ${
          large ? 'h-[32px] w-[32px]' : 'h-[27px] w-[27px]'
        } ${
          committed
            ? 'border-[rgba(0,217,255,0.45)] bg-accent-tint'
            : 'border-hairline-strong bg-transparent'
        }`}
      >
        <Check
          size={large ? 17 : 14}
          color={committed ? 'var(--color-accent)' : 'var(--color-faint)'}
        />
      </span>
    </button>
  );
}
