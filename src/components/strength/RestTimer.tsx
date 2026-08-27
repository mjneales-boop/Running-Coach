import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 250;
const EXTEND_SEC = 30;
const SWIPE_DISMISS_PX = 40;

interface RestTimerProps {
  /** Epoch ms the rest began. Never a countdown counter — see below. */
  startedAt: number;
  durationSec: number;
  onExtend: (seconds: number) => void;
  onDismiss: () => void;
  /** `navigator.vibrate` on expiry, behind the athlete's settings flag. */
  haptics: boolean;
}

function mmss(totalSec: number): string {
  const s = Math.max(0, totalSec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/**
 * Rest countdown.
 *
 * Remaining time is always recomputed from `Date.now() - startedAt`, never
 * decremented on a tick. An interval-based counter drifts, and stops entirely
 * when iOS suspends a backgrounded PWA — the athlete would come back to a timer
 * frozen where they left it. This survives backgrounding because the tick only
 * triggers a re-read of the clock, and `visibilitychange` forces one immediately
 * on return.
 */
export function RestTimer({ startedAt, durationSec, onExtend, onDismiss, haptics }: RestTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const [dragY, setDragY] = useState(0);
  // `dragging` is state rather than a ref because the render reads it to decide
  // whether the pill should animate back or track the thumb.
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const buzzedFor = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    const onVisible = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const elapsedSec = (now - startedAt) / 1000;
  const remaining = Math.ceil(durationSec - elapsedSec);
  const expired = remaining <= 0;
  const fraction = Math.min(1, Math.max(0, elapsedSec / durationSec));

  // One buzz per rest period, keyed on when this rest is due to end. A restart
  // or a +30s re-arms it; a re-render never re-fires it.
  const endsAt = startedAt + durationSec * 1000;
  useEffect(() => {
    if (!expired || !haptics) return;
    if (buzzedFor.current === endsAt) return;
    buzzedFor.current = endsAt;
    navigator.vibrate?.(120);
  }, [endsAt, expired, haptics]);

  const endDrag = useCallback(() => {
    if (dragStartY.current !== null && dragY > SWIPE_DISMISS_PX) onDismiss();
    dragStartY.current = null;
    setDragging(false);
    setDragY(0);
  }, [dragY, onDismiss]);

  const R = 9;
  const CIRC = 2 * Math.PI * R;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={expired ? 'Rest complete' : `Rest, ${mmss(remaining)} remaining`}
      // No `-translate-x-1/2` class here: Tailwind v4 emits that as the standalone
      // `translate` property, which stacks with the inline `transform` below and
      // shifts the pill a full width off-screen. Centring is done inline only.
      className={`fixed left-1/2 z-20 w-[88%] max-w-[360px] rounded-2xl border bg-surface-2 ${
        expired ? 'stride-pulse-once border-[rgba(0,217,255,0.45)]' : 'border-[rgba(0,217,255,0.22)]'
      }`}
      style={{
        bottom: 'calc(92px + env(safe-area-inset-bottom) + 12px)',
        transform: `translateX(-50%) translateY(${dragY}px)`,
        transition: dragging ? undefined : 'transform 180ms cubic-bezier(0.2,0.7,0.2,1)',
      }}
      onPointerDown={(e) => { dragStartY.current = e.clientY; setDragging(true); }}
      onPointerMove={(e) => {
        if (dragStartY.current === null) return;
        setDragY(Math.max(0, e.clientY - dragStartY.current));
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <svg width={24} height={24} viewBox="0 0 24 24" className="flex-none" aria-hidden>
          <circle cx="12" cy="12" r={R} fill="none" stroke="var(--color-hairline-strong)" strokeWidth="2.5" />
          <circle
            cx="12"
            cy="12"
            r={R}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fraction)}
            transform="rotate(-90 12 12)"
          />
        </svg>

        <span className="stride-num flex-1 font-display text-[19px] font-bold leading-none text-ink">
          {expired ? 'Rest done' : mmss(remaining)}
        </span>

        <button
          type="button"
          onClick={() => onExtend(EXTEND_SEC)}
          className="min-h-[44px] px-2 font-mono text-[11px] uppercase tracking-[0.12em] text-accent"
        >
          +30s
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[44px] px-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
