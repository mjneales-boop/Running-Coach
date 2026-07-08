import { Tag } from '../ui/Tag';
import { StatBlock } from './SessionCard';
import { RouteLine } from './RouteLine';
import { SplitsList } from './SplitsList';
import { formatPaceMinKm } from '../../lib/format';
import type { StravaRunDetail } from '../../types';

function relativeDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

interface LastRunCardProps {
  run: StravaRunDetail | null;
  loading: boolean;
  error: string | null;
}

export function LastRunCard({ run, loading, error }: LastRunCardProps) {
  if (!run) {
    return (
      <div className="stride-rise mb-[26px] rounded-[18px] border border-hairline bg-surface p-[22px]">
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-faint">
          {loading ? 'Loading last run…' : error ? "Couldn't reach Strava" : 'No recent runs'}
        </div>
      </div>
    );
  }

  return (
    <div className="stride-rise mb-[26px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-1.5 flex items-center justify-between">
        <Tag tone="accent">Run</Tag>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">{relativeDate(run.date)}</span>
      </div>
      <div className="mb-4 text-[15px] font-semibold text-ink">{run.name}</div>

      <div className="grid grid-cols-3 gap-0.5 border-t border-hairline">
        <StatBlock label="Distance" value={run.distanceKm.toFixed(2)} unit="km" isFirst />
        <StatBlock label="Pace" value={formatPaceMinKm(run.avgPaceMinKm)} unit="/km" />
        <StatBlock label="Elev." value={String(run.elevationGainM)} unit="m" />
      </div>
      <div className="mt-0.5 grid grid-cols-2 gap-0.5 border-t border-hairline">
        <StatBlock label="Avg HR" value={run.avgHR != null ? String(run.avgHR) : '—'} unit="bpm" isFirst />
        <StatBlock label="Max HR" value={run.maxHR != null ? String(run.maxHR) : '—'} unit="bpm" />
      </div>

      <RouteLine polyline={run.polyline} fullPolyline={run.fullPolyline} />
      <SplitsList splits={run.splits} />

      {error && (
        <div className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-warning">
          Couldn't refresh — showing last known run
        </div>
      )}
    </div>
  );
}
