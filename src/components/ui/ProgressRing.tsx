import type { ReactNode } from 'react';

type RingSize = 28 | 44 | 64;

const STROKE: Record<RingSize, number> = { 28: 2, 44: 2.5, 64: 3 };

interface ProgressRingProps {
  /** 0–1. Values above 1 are clamped: logging extra sets fills the ring, never overfills it. */
  value: number;
  size?: RingSize;
  /** Centre content — usually `12/22` in mono. */
  children?: ReactNode;
  label?: string;
}

export function ProgressRing({ value, size = 44, children, label }: ProgressRingProps) {
  const stroke = STROKE[size];
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(1, Math.max(0, value));

  return (
    <div
      className="relative flex flex-none items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-hairline-strong)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 200ms cubic-bezier(0.2, 0.7, 0.2, 1)' }}
        />
      </svg>
      {children && (
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      )}
    </div>
  );
}
