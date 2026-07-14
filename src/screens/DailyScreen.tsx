import { useMemo } from 'react';
import { HeroCountdown } from '../components/daily/HeroCountdown';
import { SessionCard } from '../components/daily/SessionCard';
import { ReadinessCard } from '../components/daily/ReadinessCard';
import { WeekProgressCard } from '../components/daily/WeekProgressCard';
import { StrengthLinkCard } from '../components/daily/StrengthLinkCard';
import { LastRunCard } from '../components/daily/LastRunCard';
import { PostRunSummaryCard } from '../components/daily/PostRunSummaryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan } from '../hooks/usePlan';
import { usePlanConfig } from '../hooks/usePlanConfig';
import { useCompletion } from '../hooks/useCompletion';
import { useReadiness } from '../hooks/useReadiness';
import { useOura } from '../hooks/useOura';
import { useStrava } from '../hooks/useStrava';
import { useLastRun } from '../hooks/useLastRun';
import { useSwaps } from '../hooks/useSwaps';
import { useGymSchedule } from '../hooks/useGymSchedule';
import { useStorage } from '../hooks/useStorage';
import type { StravaActivity } from '../types';
import {
  weeklyKmDone,
  nextNonRestDay,
  nextGymDay,
  applySwapsToWeek,
  applyGymOverrides,
  findTodaySession,
} from '../lib/logic';

function weekdayShort(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface DailyScreenProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onOpenSettings: () => void;
  onCompleteToday: () => void;
  onOpenDetails: () => void;
  /** Seed the coach chat with the post-run summary and jump to the Coach tab. */
  onContinueInCoach: (summary: string, hadRunData: boolean) => void;
}

export function DailyScreen({
  activeTab,
  onTabChange,
  onOpenSettings,
  onCompleteToday,
  onOpenDetails,
  onContinueInCoach,
}: DailyScreenProps) {
  const today = useCurrentDate();
  const { currentWeek: rawCurrentWeek, currentPhase, daysToRace, weeks } = usePlan(today, 0);
  const { athlete } = usePlanConfig();
  const { completion } = useCompletion();
  const { latestEntry, readiness } = useReadiness();
  const { swaps } = useSwaps();
  const { gymOverrides } = useGymSchedule();
  const oura = useOura();
  const strava = useStrava();
  const lastRun = useLastRun(strava.connected);
  const [stravaActivities] = useStorage<Record<string, StravaActivity>>('marathon-strava', {});

  const currentWeek = useMemo(
    () => applyGymOverrides(applySwapsToWeek(rawCurrentWeek, swaps[rawCurrentWeek.id] ?? {}), gymOverrides),
    [rawCurrentWeek, swaps, gymOverrides],
  );
  const todaySession = useMemo(() => findTodaySession(today, currentWeek), [today, currentWeek]);
  // Use the athlete's own reading only — never the seed (owner's) numbers. Before
  // the first sync this is empty and the card shows "—" rather than fake data.
  const readinessEntry = latestEntry;
  // A new user has no profile baselines (they'd show "base 0"). Derive them from
  // their own Oura history; fall back to the latest reading so the number is never 0.
  const baselines = useMemo(() => {
    const vals = Object.values(readiness);
    const avg = (pick: (e: (typeof vals)[number]) => number | undefined): number | undefined => {
      const nums = vals.map(pick).filter((n): n is number => n != null);
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
    };
    return {
      hrv: athlete.baselineHRV > 0 ? athlete.baselineHRV : Math.round(avg((e) => e.hrv) ?? readinessEntry.hrv ?? 0),
      rhr: athlete.baselineRHR > 0 ? athlete.baselineRHR : Math.round(avg((e) => e.rhr) ?? readinessEntry.rhr ?? 0),
      sleep:
        athlete.baselineSleep > 0
          ? athlete.baselineSleep
          : Math.round((avg((e) => e.sleep) ?? readinessEntry.sleep ?? 0) * 10) / 10,
    };
  }, [readiness, athlete, readinessEntry]);
  const syncTimeLabel = oura.lastSynced
    ? oura.lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const kmDone = weeklyKmDone(currentWeek, completion);
  const nextDay = nextNonRestDay(today, currentWeek, weeks);
  const gymDay = nextGymDay(today, currentWeek);
  const todayStr = localDateKey(today);
  const isRest = !todaySession || todaySession.type === 'REST';
  const todayDone = todaySession ? !!completion[`${currentWeek.id}-${todaySession.d}`]?.done : false;

  return (
    <div className="min-h-screen bg-canvas px-[22px] pb-[132px] pt-1.5">
      <ScreenHeader onAvatarClick={onOpenSettings} />

      <HeroCountdown daysToRace={daysToRace} week={currentWeek} phase={currentPhase} />

      <div className="stride-rise mb-3.5 flex items-baseline justify-between">
        <Eyebrow>Today</Eyebrow>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          {today.toLocaleDateString('en-US', { weekday: 'long' })}
        </span>
      </div>

      {isRest ? (
        <SessionCard
          variant="rest"
          weekMeta={`Wk ${currentWeek.num} · ${currentPhase.short.toLowerCase()}`}
          gym={todaySession?.gym}
          done={todayDone}
          onComplete={onCompleteToday}
          onDetails={onOpenDetails}
        />
      ) : (
        todaySession && (
          <SessionCard
            variant="run"
            weekMeta={`Wk ${currentWeek.num} · ${currentPhase.short.toLowerCase()}`}
            day={todaySession}
            done={todayDone}
            onStart={onCompleteToday}
            onDetails={onOpenDetails}
          />
        )
      )}

      {todayDone && todaySession && ['LONG', 'WORKOUT', 'EASY'].includes(todaySession.type) && (
        <PostRunSummaryCard
          weekId={currentWeek.id}
          dayAbbr={todaySession.d}
          day={todaySession}
          entry={completion[`${currentWeek.id}-${todaySession.d}`] ?? { done: true }}
          runDetail={lastRun.run && lastRun.run.date === todaySession.date ? lastRun.run : null}
          activitySummary={stravaActivities[todaySession.date]}
          onContinueInCoach={onContinueInCoach}
        />
      )}

      <div className="stride-rise mb-3.5 flex items-baseline justify-between">
        <Eyebrow>Readiness</Eyebrow>
        {oura.connected && (
          <span
            onClick={oura.disconnect}
            className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.14em] text-faint"
          >
            Oura{syncTimeLabel ? ` · ${syncTimeLabel}` : ''}
          </span>
        )}
      </div>
      {oura.connected ? (
        <ReadinessCard variant="connected" entry={readinessEntry} baselines={baselines} />
      ) : (
        <ReadinessCard variant="not-connected" onConnect={oura.connect} />
      )}

      <div className="stride-rise mb-3.5 flex items-baseline justify-between">
        <Eyebrow>This week</Eyebrow>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          Target {currentWeek.targetKm} km
        </span>
      </div>
      <WeekProgressCard
        kmDone={kmDone}
        kmTarget={currentWeek.targetKm}
        nextDayLabel={nextDay ? weekdayShort(nextDay.date) : '—'}
        nextTitle={nextDay?.title ?? 'Rest'}
        nextKm={nextDay?.km}
      />

      <div className="stride-rise mb-3.5 flex items-baseline justify-between">
        <Eyebrow>Last run</Eyebrow>
      </div>
      <LastRunCard run={lastRun.run} loading={lastRun.loading} error={lastRun.error} />

      <div className="stride-rise mb-3.5 flex items-baseline justify-between">
        <Eyebrow>Strength</Eyebrow>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">5× / week</span>
      </div>
      {gymDay?.gym && (
        <StrengthLinkCard
          gymName={gymDay.gym}
          dayLabel={gymDay.date === todayStr ? 'Today' : weekdayShort(gymDay.date)}
          onClick={() => onTabChange('strength')}
        />
      )}

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
