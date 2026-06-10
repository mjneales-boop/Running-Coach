import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { TodayCard } from './components/TodayCard';
import { ReadinessBand } from './components/ReadinessBand';
import { WeekStrip } from './components/WeekStrip';
import { Timeline } from './components/Timeline';
import { PacingZones } from './components/PacingZones';
import { SessionModal } from './components/SessionModal';
import { ReadinessModal } from './components/ReadinessModal';
import { StrengthView } from './components/StrengthView';
import { useCurrentDate } from './hooks/useCurrentDate';
import { useCompletion } from './hooks/useCompletion';
import { useReadiness } from './hooks/useReadiness';
import { useSwaps } from './hooks/useSwaps';
import { useStrength } from './hooks/useStrength';
import { usePlan, WEEKS } from './hooks/usePlan';
import { findCurrentWeekIndex, findTodaySession, applySwapsToWeek } from './lib/logic';
import type { DayAbbr } from './types';

interface SessionModalTarget {
  weekId: string;
  dayAbbr: DayAbbr;
}

const SEC_GAP = 40;

export default function App() {
  const today = useCurrentDate();

  const initialWeekIndex = useMemo(
    () => findCurrentWeekIndex(today, WEEKS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [view, setView] = useState<'dashboard' | 'strength'>('dashboard');
  const [viewedWeekIndex, setViewedWeekIndex] = useState(initialWeekIndex);
  const [sessionModal, setSessionModal] = useState<SessionModalTarget | null>(null);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);

  const { currentWeek, viewedWeek, currentPhase, daysToRace, currentWeekIndex } =
    usePlan(today, viewedWeekIndex);

  const { completion, toggleDone, setNotes } = useCompletion();
  const { latestEntry, latestSleepDate, logEntry } = useReadiness();
  const { swaps, swapDays } = useSwaps();
  const { strength, logSet, markComplete: markStrengthComplete } = useStrength();

  const swappedCurrentWeek = useMemo(
    () => applySwapsToWeek(currentWeek, swaps[currentWeek.id] ?? {}),
    [currentWeek, swaps],
  );
  const swappedViewedWeek = useMemo(
    () => applySwapsToWeek(viewedWeek, swaps[viewedWeek.id] ?? {}),
    [viewedWeek, swaps],
  );
  const todaySession = useMemo(
    () => findTodaySession(today, swappedCurrentWeek),
    [today, swappedCurrentWeek],
  );

  const todayKey = today.toISOString().slice(0, 10);
  const weekLabel = `${currentPhase.short.toLowerCase()} · wk ${currentWeek.num.toLowerCase()}`;

  const handlePrevWeek = () => setViewedWeekIndex((i) => Math.max(0, i - 1));
  const handleNextWeek = () => setViewedWeekIndex((i) => Math.min(WEEKS.length - 1, i + 1));
  const handleTodayWeek = () => setViewedWeekIndex(currentWeekIndex);

  const openSessionModal = (weekId: string, dayAbbr: DayAbbr) =>
    setSessionModal({ weekId, dayAbbr });

  const openTodayModal = () => {
    if (todaySession) {
      setSessionModal({ weekId: currentWeek.id, dayAbbr: todaySession.d });
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        color: 'var(--text)',
        fontFamily: 'var(--sans)',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 32px 56px',
        }}
      >
        {/* Header */}
        <Header today={today} daysToRace={daysToRace} />
        <div style={{ height: 24 }} />

        {/* View nav */}
        <div style={{ display: 'flex', gap: 24, marginBottom: SEC_GAP, fontFamily: 'var(--mono)', fontSize: 13 }}>
          {(['dashboard', 'strength'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: view === v ? 'var(--text)' : 'var(--text-muted)',
                letterSpacing: '0.04em',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                transition: 'color 150ms',
              }}
            >
              {'// ' + v}
            </button>
          ))}
        </div>

        {/* Dashboard view */}
        {view === 'dashboard' && (
          <>
            {/* Today Card */}
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: 'var(--text-muted)',
                textTransform: 'lowercase',
                marginBottom: 14,
              }}
            >
              {`// today · ${weekLabel}`}
            </div>
            <TodayCard
              week={swappedCurrentWeek}
              day={todaySession}
              completion={completion}
              onToggleDone={toggleDone}
              onOpenModal={openTodayModal}
            />
            <div style={{ height: SEC_GAP }} />

            {/* Readiness */}
            <ReadinessBand
              latestEntry={latestEntry}
              latestSleepDate={latestSleepDate}
              onOpenLog={() => setReadinessModalOpen(true)}
            />
            <div style={{ height: SEC_GAP }} />

            {/* Week Strip */}
            <WeekStrip
              week={swappedViewedWeek}
              today={today}
              completion={completion}
              onDayClick={openSessionModal}
              onPrev={handlePrevWeek}
              onToday={handleTodayWeek}
              onNext={handleNextWeek}
            />
            <div style={{ height: SEC_GAP }} />

            {/* Timeline */}
            <Timeline
              completion={completion}
              currentWeekIndex={currentWeekIndex}
              viewedWeekIndex={viewedWeekIndex}
              onWeekClick={setViewedWeekIndex}
            />
            <div style={{ height: SEC_GAP }} />

            {/* Pacing Zones */}
            <PacingZones />
          </>
        )}

        {/* Strength view */}
        {view === 'strength' && <StrengthView strength={strength} />}
      </div>

      {/* Session modal */}
      {sessionModal && (() => {
        const rawWeek = WEEKS.find((w) => w.id === sessionModal.weekId)!;
        const modalWeek = applySwapsToWeek(rawWeek, swaps[sessionModal.weekId] ?? {});
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
            strength={strength}
            onLogSet={logSet}
            onMarkStrengthComplete={markStrengthComplete}
          />
        );
      })()}

      {/* Readiness modal */}
      {readinessModalOpen && (
        <ReadinessModal
          dateKey={todayKey}
          existing={latestEntry}
          onSave={logEntry}
          onClose={() => setReadinessModalOpen(false)}
        />
      )}
    </div>
  );
}
