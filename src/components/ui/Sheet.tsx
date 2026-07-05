import type { CSSProperties, ReactNode } from 'react';

interface SheetProps {
  onClose: () => void;
  headerLeft: ReactNode;
  children: ReactNode;
}

const bodyStyle: CSSProperties = {
  WebkitOverflowScrolling: 'touch',
  paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
};

const headerStyle: CSSProperties = {
  paddingTop: 'calc(14px + env(safe-area-inset-top))',
};

export function Sheet({ onClose, headerLeft, children }: SheetProps) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-canvas">
      <div
        style={headerStyle}
        className="flex flex-none items-center justify-between gap-3 border-b border-hairline px-[22px] pb-4"
      >
        <div className="min-w-0">{headerLeft}</div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-hairline-strong text-xl leading-none text-muted"
        >
          ×
        </button>
      </div>
      <div style={bodyStyle} className="flex-1 overflow-y-auto px-[22px] pt-5">
        {children}
      </div>
    </div>
  );
}
