import { useEffect, useState } from 'react';
import { UiKitDemo } from './screens/UiKitDemo';
import { DailyScreen } from './screens/DailyScreen';
import { StrengthScreen } from './screens/StrengthScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { FullPlanScreen } from './screens/FullPlanScreen';
import { CoachScreen } from './screens/CoachScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SessionModal } from './components/SessionModal';
import { ReadinessModal } from './components/ReadinessModal';
import type { TabKey } from './components/ui/TabBar';
import { useCurrentDate } from './hooks/useCurrentDate';
import { CompletionProvider, useCompletion } from './hooks/useCompletion';
import { useReadiness } from './hooks/useReadiness';
import { SwapsProvider, useSwaps } from './hooks/useSwaps';
import { useStorage } from './hooks/useStorage';
import { GymScheduleProvider, useGymSchedule } from './hooks/useGymSchedule';
import { OuraProvider, useOura } from './hooks/useOura';
import { StravaProvider, useStrava } from './hooks/useStrava';
import { useAutoSync } from './hooks/useAutoSync';
import { usePlan, WEEKS } from './hooks/usePlan';
import { applySwapsToWeek, applyGymOverrides } from './lib/logic';
import type { DayAbbr, StravaActivity } from './types';

interface SessionModalTarget {
  weekId: string;
  dayAbbr: DayAbbr;
}

export default function App() {
  return (
    <CompletionProvider>
      <SwapsProvider>
        <GymScheduleProvider>
          <OuraProvider>
            <StravaProvider>
              <AppShell />
            </StravaProvider>
          </OuraProvider>
        </GymScheduleProvider>
      </SwapsProvider>
    </CompletionProvider>
  );
}

function AppShell() {
  const today = useCurrentDate();

  const [tab, setTab] = useState<TabKey>('daily');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionModal, setSessionModal] = useState<SessionModalTarget | null>(null);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);
  const [strengthFocus, setStrengthFocus] = useState<SessionModalTarget | null>(null);

  const { currentWeek, todaySession } = usePlan(today, 0);
  const { completion, toggleDone, setNotes } = useCompletion();
  const { latestEntry, logEntry } = useReadiness();
  const { swaps, swapDays } = useSwaps();
  const { gymOverrides, setGymOnDay, removeGymFromDay } = useGymSchedule();
  const [stravaActivities] = useStorage<Record<string, StravaActivity>>('marathon-strava', {});
  const oura = useOura();
  const strava = useStrava();
  useAutoSync(oura, strava);

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const openTodayModal = () => {
    if (todaySession) {
      setSessionModal({ weekId: currentWeek.id, dayAbbr: todaySession.d });
    }
  };

  const completeToday = () => {
    if (todaySession) {
      toggleDone(currentWeek.id, todaySession.d);
    }
  };

  const navigateToStrength = (weekId: string, dayAbbr: DayAbbr) => {
    setStrengthFocus({ weekId, dayAbbr });
    setTab('strength');
    setSessionModal(null);
  };

  useEffect(() => {
    if (tab !== 'strength') setStrengthFocus(null);
  }, [tab]);

  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('uikit')) {
    return <UiKitDemo />;
  }

  return (
    <>
      {settingsOpen ? (
        <SettingsScreen onBack={() => setSettingsOpen(false)} />
      ) : (
        <>
          {tab === 'daily' && (
            <DailyScreen
              activeTab={tab}
              onTabChange={setTab}
              onOpenSettings={() => setSettingsOpen(true)}
              onCompleteToday={completeToday}
              onOpenDetails={openTodayModal}
            />
          )}
          {tab === 'strength' && (
            <StrengthScreen
              activeTab={tab}
              onTabChange={setTab}
              onOpenSettings={() => setSettingsOpen(true)}
              focusDay={strengthFocus}
            />
          )}
          {tab === 'progress' && (
            <ProgressScreen activeTab={tab} onTabChange={setTab} onOpenSettings={() => setSettingsOpen(true)} />
          )}
          {tab === 'plan' && (
            <FullPlanScreen
              activeTab={tab}
              onTabChange={setTab}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenSession={(weekId, dayAbbr) => setSessionModal({ weekId, dayAbbr })}
            />
          )}
          {tab === 'coach' && <CoachScreen activeTab={tab} onTabChange={setTab} />}
        </>
      )}

      {/* Session modal (bridge — retired once each tab gets its own STRIDE detail view) */}
      {sessionModal &&
        (() => {
          const rawWeek = WEEKS.find((w) => w.id === sessionModal.weekId)!;
          const modalWeek = applyGymOverrides(
            applySwapsToWeek(rawWeek, swaps[sessionModal.weekId] ?? {}),
            gymOverrides,
          );
          return (
            <SessionModal
              weekId={sessionModal.weekId}
              dayAbbr={sessionModal.dayAbbr}
              week={modalWeek}
              completion={completion}
              onToggleDone={toggleDone}
              onSetNotes={setNotes}
              onClose={() => setSessionModal(null)}
              swapMap={swaps[sessionModal.weekId] ?? {}}
              onSwapDay={(a, b) => swapDays(sessionModal.weekId, a, b)}
              stravaActivities={stravaActivities}
              onAddGym={setGymOnDay}
              onRemoveGym={removeGymFromDay}
              onNavigateToStrength={navigateToStrength}
            />
          );
        })()}

      {/* Readiness modal (bridge — retired once Settings/Daily own manual readiness logging) */}
      {readinessModalOpen && (
        <ReadinessModal
          dateKey={todayKey}
          existing={latestEntry}
          onSave={logEntry}
          onClose={() => setReadinessModalOpen(false)}
        />
      )}
    </>
  );
}
