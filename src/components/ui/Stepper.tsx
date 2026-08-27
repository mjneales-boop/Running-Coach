import { useCallback, useEffect, useRef, useState } from 'react';

const LONG_PRESS_DELAY_MS = 400;
const LONG_PRESS_INTERVAL_MS = 150;

interface StepperProps {
  value: number | undefined;
  /** Rendered when `value` is undefined — the ghost suggestion, or a dash. */
  placeholder?: string;
  step: number;
  min?: number;
  max?: number;
  unit: string;
  /** Dims the value to 38%: a suggestion from last session, not a stored figure. */
  ghost?: boolean;
  /** Committed rows lose their stepper chrome and keep only the number. */
  committed?: boolean;
  disabled?: boolean;
  inputMode?: 'decimal' | 'numeric';
  onChange: (next: number) => void;
  /** Fired when the native keyboard closes, so the row can auto-commit on blur. */
  onEditBlur?: () => void;
  onEnter?: () => void;
  ariaLabel: string;
}

/** Trims float noise from repeated ±1.25 steps (1.25 × 3 = 3.7500000000000004). */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function format(n: number): string {
  return Number.isInteger(n) ? String(n) : String(round(n));
}

export function Stepper({
  value,
  placeholder,
  step,
  min = 0,
  max = 9999,
  unit,
  ghost = false,
  committed = false,
  disabled = false,
  inputMode = 'decimal',
  onChange,
  onEditBlur,
  onEnter,
  ariaLabel,
}: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  // Long-press repeat runs off timers held in refs so a re-render never
  // orphans one. `valueRef` keeps the repeat reading the live value rather
  // than the value captured when the press started; it is synced in an effect
  // because writing a ref during render is not safe under the React compiler.
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const stopRepeat = useCallback(() => {
    if (delayRef.current) { clearTimeout(delayRef.current); delayRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => stopRepeat, [stopRepeat]);

  const applyStep = useCallback(
    (direction: 1 | -1) => {
      // Stepping an untouched ghost row starts from the suggestion on screen,
      // not from zero — nudging last week's 62.5 gives 63.75, not 1.25.
      const suggested = placeholder != null ? Number(placeholder) : Number.NaN;
      const base = valueRef.current ?? (Number.isNaN(suggested) ? 0 : suggested);
      const next = round(Math.min(max, Math.max(min, base + direction * step)));
      if (next !== valueRef.current) {
        valueRef.current = next;
        onChange(next);
      }
    },
    [max, min, onChange, placeholder, step],
  );

  const startRepeat = useCallback(
    (direction: 1 | -1) => {
      if (disabled) return;
      applyStep(direction);
      delayRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => applyStep(direction), LONG_PRESS_INTERVAL_MS);
      }, LONG_PRESS_DELAY_MS);
    },
    [applyStep, disabled],
  );

  const commitText = useCallback(() => {
    const parsed = Number(text.replace(',', '.'));
    if (text !== '' && !Number.isNaN(parsed)) {
      onChange(round(Math.min(max, Math.max(min, parsed))));
    }
    setEditing(false);
    onEditBlur?.();
  }, [max, min, onChange, onEditBlur, text]);

  const display = value != null ? format(value) : (placeholder ?? '—');

  // A committed row is a readout, not a control: the chrome goes, the number stays.
  if (committed) {
    return (
      <div className="flex min-w-0 items-baseline justify-center gap-1.5">
        <span className="stride-num font-display text-[17px] font-bold leading-none text-ink">{display}</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint">{unit}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 items-center justify-between rounded-[10px] border bg-field ${
        disabled ? 'border-hairline-soft opacity-40' : 'border-hairline-strong'
      }`}
    >
      <StepButton label={`Decrease ${ariaLabel}`} disabled={disabled} onStart={() => startRepeat(-1)} onStop={stopRepeat}>
        −
      </StepButton>

      {editing ? (
        <input
          value={text}
          autoFocus
          inputMode={inputMode}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { commitText(); onEnter?.(); }
            if (e.key === 'Escape') { setEditing(false); }
          }}
          aria-label={ariaLabel}
          className="stride-num min-w-0 flex-1 bg-transparent py-2.5 text-center font-display text-[17px] font-bold text-ink outline-none"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-label={`Edit ${ariaLabel}`}
          onClick={() => { setText(value != null ? format(value) : ''); setEditing(true); }}
          className="min-w-0 flex-1 px-1 py-2.5"
        >
          <span
            className={`stride-num font-display text-[17px] font-bold leading-none ${
              ghost && value == null ? 'text-ink opacity-[0.38]' : 'text-ink'
            }`}
          >
            {display}
          </span>
        </button>
      )}

      <StepButton label={`Increase ${ariaLabel}`} disabled={disabled} onStart={() => startRepeat(1)} onStop={stopRepeat}>
        +
      </StepButton>
    </div>
  );
}

/**
 * The ± control.
 *
 * Two steppers and a commit button cannot all carry 44px-wide chrome inside a
 * 375px row and still leave room to read "102.5". So the button draws at 36px
 * and an invisible overlay extends its hit area 4px into the gutter on each
 * side, reaching the 44×44 floor — the brief's "use padding, not size".
 * Adjacent steppers' overlays meet in the 6px gap without overlapping, and the
 * number keeps its own tap target in the middle.
 */
function StepButton({
  children,
  label,
  disabled,
  onStart,
  onStop,
}: {
  children: string;
  label: string;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      // Pointer events rather than click: the press must begin repeating while
      // held, and must stop if the thumb slides off or the browser cancels.
      onPointerDown={(e) => { e.preventDefault(); onStart(); }}
      onPointerUp={onStop}
      onPointerLeave={onStop}
      onPointerCancel={onStop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex h-[44px] w-9 flex-none touch-none select-none items-center justify-center font-display text-[19px] font-bold leading-none text-muted active:text-ink"
    >
      <span aria-hidden className="absolute inset-y-0 -left-1 -right-1" />
      {children}
    </button>
  );
}
