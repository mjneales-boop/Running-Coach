interface StrengthLinkCardProps {
  gymName: string;
  dayLabel: string;
  onClick: () => void;
}

export function StrengthLinkCard({ gymName, dayLabel, onClick }: StrengthLinkCardProps) {
  return (
    <div
      onClick={onClick}
      className="stride-rise flex cursor-pointer items-center justify-between rounded-2xl border border-hairline bg-surface px-5 py-[18px]"
    >
      <div>
        <div className="text-base font-bold">{gymName}</div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Next · {dayLabel}</div>
      </div>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2}>
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
