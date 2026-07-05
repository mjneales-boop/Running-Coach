import type { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Eyebrow({ children, action, className = '' }: EyebrowProps) {
  return (
    <div
      className={`flex items-baseline gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted ${
        action ? 'justify-between' : ''
      } ${className}`}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}
