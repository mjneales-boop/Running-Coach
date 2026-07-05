import type { ReactNode } from 'react';

export type TabKey = 'daily' | 'strength' | 'progress' | 'coach' | 'plan';

interface TabDef {
  key: TabKey;
  label: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  width: 23,
  height: 23,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
};

const TABS: TabDef[] = [
  {
    key: 'daily',
    label: 'Daily',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    key: 'strength',
    label: 'Strength',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'progress',
    label: 'Progress',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 19V5M4 15l4-4 4 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'coach',
    label: 'Coach',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5h16v11H9l-4 4V5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'plan',
    label: 'Full plan',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M8 6h12M8 12h12M8 18h12" strokeLinecap="round" />
        <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex h-[calc(92px+env(safe-area-inset-bottom))] items-start gap-0 border-t border-hairline bg-[rgba(10,12,14,0.82)] px-2.5 pt-3.5 backdrop-blur-xl">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex flex-1 flex-col items-center gap-1.5 ${isActive ? 'text-accent' : 'text-faint'}`}
          >
            {tab.icon}
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
