import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  tone?: 'accent' | 'muted' | 'warn';
  className?: string;
}

export function Tag({ children, tone = 'muted', className = '' }: TagProps) {
  const styles =
    tone === 'accent'
      ? 'border-[rgba(0,217,255,0.35)] bg-accent-tint text-accent'
      : tone === 'warn'
        ? 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.10)] text-[#F59E0B]'
        : 'border-hairline text-muted';

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] ${styles} ${className}`}
    >
      {children}
    </span>
  );
}
