import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { TodayCard } from './components/TodayCard';
import { ReadinessBand } from './components/ReadinessBand';
import { WeekStrip } from './components/WeekStrip';
import { Timeline } from './components/Timeline';
import { PacingZones } from './components/PacingZones';
import { SessionModal } from './components/SessionModal';
import { ReadinessModal } from './components/ReadinessModal';
import { useCurrentDate } from './hooks/useCurrentDate';
import { useCompletion } from './hooks/useCompletion';
import { useReadiness } from './hooks/useReadiness';
import { usePlan, WEEKS } from './hooks/usePlan';
import { findCurrentWeekIndex } from './lib/logic';
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

  const [viewedWeekIndex, setViewedWeekIndex] = useState(initialWeekIndex);
  const [sessionModal, setSessionModal] = useState<SessionModalTarget | null>(null);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);

  const { currentWeek, viewedWeek, todaySession, currentPhase, daysToRace, currentWeekIndex } =
    usePlan(today, viewedWeekIndex);

  const { completion, toggleDone, setNotes } = useCompletion();
  const { latestEntry, latestSleepDate, logEntry } = useReadiness();

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
        <div style={{ height: SEC_GAP }} />

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
          week={currentWeek}
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
          week={viewedWeek}
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
      </div>

      {/* Session modal */}
      {sessionModal && (
        <SessionModal
          weekId={sessionModal.weekId}
          dayAbbr={sessionModal.dayAbbr}
          week={WEEKS.find((w) => w.id === sessionModal.weekId)!}
          completion={completion}
          onToggleDone={toggleDone}
          onSetNotes={setNotes}
          onClose={() => setSessionModal(null)}
        />
      )}

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
