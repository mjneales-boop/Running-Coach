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
import { RunSummariesProvider } from './hooks/useRunSummaries';
import { useStorage } from './hooks/useStorage';
import { GymScheduleProvider, useGymSchedule } from './hooks/useGymSchedule';
import { OuraProvider, useOura } from './hooks/useOura';
import { StravaProvider, useStrava } from './hooks/useStrava';
import { useCoachMessages } from './hooks/useCoachMessages';
import { useAutoSync } from './hooks/useAutoSync';
import { useBlockExtension } from './hooks/useBlockExtension';
import { usePlan } from './hooks/usePlan';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { PlanProvider } from './hooks/usePlanConfig';
import { AuthScreen } from './screens/AuthScreen';
import { MigrationGate } from './components/MigrationGate';
import { applySwapsToWeek, applyGymOverrides } from './lib/logic';
import type { DayAbbr, StravaActivity } from './types';

interface SessionModalTarget {
  weekId: string;
  dayAbbr: DayAbbr;
}

export default function App() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('uikit')) {
    return <UiKitDemo />;
  }
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="font-display text-sm font-black uppercase tracking-[0.22em] text-faint">
          Stride
        </div>
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return (
    <MigrationGate>
      <PlanProvider>
        <CompletionProvider>
          <SwapsProvider>
            <RunSummariesProvider>
              <GymScheduleProvider>
                <OuraProvider>
                  <StravaProvider>
                    <AppShell />
                  </StravaProvider>
                </OuraProvider>
              </GymScheduleProvider>
            </RunSummariesProvider>
          </SwapsProvider>
        </CompletionProvider>
      </PlanProvider>
    </MigrationGate>
  );
}

function AppShell() {
  const today = useCurrentDate();

  const [tab, setTab] = useState<TabKey>('daily');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionModal, setSessionModal] = useState<SessionModalTarget | null>(null);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);
  const [strengthFocus, setStrengthFocus] = useState<SessionModalTarget | null>(null);

  const { currentWeek, todaySession, weeks } = usePlan(today, 0);
  const { completion, toggleDone, setNotes } = useCompletion();
  const { latestEntry, logEntry } = useReadiness();
  const { swaps, swapDays } = useSwaps();
  const { gymOverrides, setGymOnDay, removeGymFromDay } = useGymSchedule();
  const [stravaActivities] = useStorage<Record<string, StravaActivity>>('marathon-strava', {});
  const oura = useOura();
  const strava = useStrava();
  const { messages: coachMessages, setMessages: setCoachMessages } = useCoachMessages();
  useAutoSync(oura, strava);
  useBlockExtension(today);

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

  // Seed the coach chat with the post-run summary (as a natural user→assistant opener so
  // the history is Anthropic-valid) and jump to the Coach tab to continue the conversation.
  const continueInCoach = (summary: string, hadRunData: boolean) => {
    const opener = hadRunData ? "How did today's run look?" : 'I just finished my run.';
    void setCoachMessages([
      ...coachMessages,
      { role: 'user', content: opener },
      { role: 'assistant', content: summary },
    ]);
    setSessionModal(null);
    setTab('coach');
  };

  useEffect(() => {
    if (tab !== 'strength') setStrengthFocus(null);
  }, [tab]);

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
              onContinueInCoach={continueInCoach}
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
          const rawWeek = weeks.find((w) => w.id === sessionModal.weekId)!;
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
