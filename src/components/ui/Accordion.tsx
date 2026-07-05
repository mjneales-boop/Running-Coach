import type { ReactNode } from 'react';

interface AccordionProps {
  header: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

export function Accordion({ header, open, onToggle, children, className = '' }: AccordionProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-hairline bg-surface ${className}`}>
      <div onClick={onToggle} className="flex cursor-pointer items-center justify-between gap-3 px-[18px] py-4">
        {header}
      </div>
      {open && <div className="px-[18px] pb-[18px]">{children}</div>}
    </div>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-faint)"
      strokeWidth={2}
      style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : undefined }}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
