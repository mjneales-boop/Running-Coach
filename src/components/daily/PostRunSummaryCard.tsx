import { useCallback, useEffect, useRef, useState } from 'react';
import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { usePlanConfig } from '../../hooks/usePlanConfig';
import { useReadiness } from '../../hooks/useReadiness';
import { useRunSummaries } from '../../hooks/useRunSummaries';
import { buildRunSummaryContext } from '../../lib/coachContext';
import { authFetch } from '../../lib/authFetch';
import type { CompletionEntry, Day, DayAbbr, StravaActivity, StravaRunDetail } from '../../types';

interface PostRunSummaryCardProps {
  weekId: string;
  dayAbbr: DayAbbr;
  day: Day;
  entry: CompletionEntry;
  /** Rich last-run detail (with per-km HR splits), already matched to this session's date, else null. */
  runDetail: StravaRunDetail | null;
  /** Lighter summary activity for this date (avg HR only) — fallback when no splits. */
  activitySummary?: StravaActivity;
  /** Seed the coach chat with this summary and jump to the Coach tab. */
  onContinueInCoach: (summary: string, hadRunData: boolean) => void;
}

export function PostRunSummaryCard({
  weekId,
  dayAbbr,
  day,
  entry,
  runDetail,
  activitySummary,
  onContinueInCoach,
}: PostRunSummaryCardProps) {
  const plan = usePlanConfig();
  const { readiness } = useReadiness();
  const { summaries, saveSummary } = useRunSummaries();

  const sessionKey = `${weekId}-${dayAbbr}`;
  const cached = summaries[sessionKey];

  const [summary, setSummary] = useState<string | null>(cached?.summary ?? null);
  const [hadRunData, setHadRunData] = useState<boolean>(cached?.hadRunData ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const readinessEntry = readiness[day.date] ?? {};
      const context = buildRunSummaryContext(day, entry, runDetail, activitySummary, readinessEntry, plan);
      const res = await authFetch('/api/post-run-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || !data.summary) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSummary(data.summary);
      setHadRunData(context.hasRunData);
      saveSummary(sessionKey, data.summary, context.hasRunData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach your coach.');
    } finally {
      setLoading(false);
    }
    // plan/readiness are stable within a mount; deliberately omitted to avoid re-firing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, entry, runDetail, activitySummary, sessionKey, saveSummary]);

  // Lazy, generate-once: only fire when there's no cached summary for this session.
  useEffect(() => {
    if (cached || startedRef.current) return;
    startedRef.current = true;
    void generate();
  }, [cached, generate]);

  return (
    <div className="stride-rise mb-[26px] overflow-hidden rounded-[18px] border border-[rgba(0,217,255,0.3)] bg-[rgba(0,217,255,0.05)] p-[22px] shadow-[0_0_24px_-8px_rgba(0,217,255,0.25)]">
      <div className="mb-3 flex items-center justify-between">
        <Tag tone="accent">Coach</Tag>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent/70">Post-run</span>
      </div>

      {loading && !summary && (
        <div className="flex items-center gap-1.5 py-1.5">
          <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent" />
          <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent [animation-delay:0.2s]" />
          <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent [animation-delay:0.4s]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            Looking at your run…
          </span>
        </div>
      )}

      {summary && (
        <p className="max-w-[44ch] whitespace-pre-line text-[15px] leading-normal text-[#D3DAE1]">{summary}</p>
      )}

      {error && !summary && (
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-warning">{error}</span>
          <button
            onClick={() => generate()}
            className="rounded-lg border border-hairline px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted"
          >
            Retry
          </button>
        </div>
      )}

      {summary && (
        <Button
          variant="ghost"
          className="mt-4 w-full"
          onClick={() => onContinueInCoach(summary, hadRunData)}
        >
          Continue with Coach →
        </Button>
      )}
    </div>
  );
}
