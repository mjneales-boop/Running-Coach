import { formatDateShort } from '../../lib/logic';

interface RecentHistoryListProps {
  entries: { date: string; summary: string }[];
}

export function RecentHistoryList({ entries }: RecentHistoryListProps) {
  if (!entries.length) {
    return <div className="stride-rise py-3 font-mono text-xs text-faint">No sessions logged in the last 30 days.</div>;
  }

  return (
    <div className="stride-rise">
      {entries.map((entry) => (
        <div key={entry.date} className="flex items-center justify-between border-b border-hairline-soft py-3.5">
          <span className="font-mono text-xs tracking-[0.06em] text-muted">
            {formatDateShort(new Date(`${entry.date}T12:00:00`))}
          </span>
          <span className="font-mono text-xs tracking-[0.04em] text-[#C4CCD3]">{entry.summary}</span>
        </div>
      ))}
    </div>
  );
}
