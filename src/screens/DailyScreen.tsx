import { useMemo } from 'react';
import { HeroCountdown } from '../components/daily/HeroCountdown';
import { SessionCard } from '../components/daily/SessionCard';
import { ReadinessCard } from '../components/daily/ReadinessCard';
import { WeekProgressCard } from '../components/daily/WeekProgressCard';
import { StrengthLinkCard } from '../components/daily/StrengthLinkCard';
import { LastRunCard } from '../components/daily/LastRunCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan } from '../hooks/usePlan';
import { useCompletion } from '../hooks/useCompletion';
import { useReadiness } from '../hooks/useReadiness';
import { useOura } from '../hooks/useOura';
import { useStrava } from '../hooks/useStrava';
import { useLastRun } from '../hooks/useLastRun';
import { useSwaps } from '../hooks/useSwaps';
import { useGymSchedule } from '../hooks/useGymSchedule';
import { SEED_READINESS } from '../constants/plan';
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
}

export function DailyScreen({
  activeTab,
  onTabChange,
  onOpenSettings,
  onCompleteToday,
  onOpenDetails,
}: DailyScreenProps) {
  const today = useCurrentDate();
  const { currentWeek: rawCurrentWeek, currentPhase, daysToRace, weeks } = usePlan(today, 0);
  const { completion } = useCompletion();
  const { latestEntry } = useReadiness();
  const { swaps } = useSwaps();
  const { gymOverrides } = useGymSchedule();
  const oura = useOura();
  const strava = useStrava();
  const lastRun = useLastRun(strava.connected);

  const currentWeek = useMemo(
    () => applyGymOverrides(applySwapsToWeek(rawCurrentWeek, swaps[rawCurrentWeek.id] ?? {}), gymOverrides),
    [rawCurrentWeek, swaps, gymOverrides],
  );
  const todaySession = useMemo(() => findTodaySession(today, currentWeek), [today, currentWeek]);
  // Once connected, a fresh account may not have synced yet — seed data keeps the card meaningful in that gap.
  const readinessEntry = latestEntry.score != null ? latestEntry : SEED_READINESS;
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
        <ReadinessCard variant="connected" entry={readinessEntry} />
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
