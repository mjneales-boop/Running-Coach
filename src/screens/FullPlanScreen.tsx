import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { PhaseBand } from '../components/plan/PhaseBand';
import { RaceDayCard } from '../components/plan/RaceDayCard';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan } from '../hooks/usePlan';
import { usePlanConfig } from '../hooks/usePlanConfig';
import { groupWeeksByPhase } from '../lib/logic';
import type { DayAbbr } from '../types';

interface FullPlanScreenProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onOpenSettings: () => void;
  onOpenSession: (weekId: string, dayAbbr: DayAbbr) => void;
}

export function FullPlanScreen({ activeTab, onTabChange, onOpenSettings, onOpenSession }: FullPlanScreenProps) {
  const today = useCurrentDate();
  const { currentWeekIndex, weeks, phases } = usePlan(today, 0);
  const { mode } = usePlanConfig();
  const currentWeekId = weeks[currentWeekIndex]?.id;
  const currentPhaseNum = weeks[currentWeekIndex]?.phase;
  const [openWeekId, setOpenWeekId] = useState<string | null>(currentWeekId ?? null);

  const realWeeks = useMemo(() => weeks.filter((w) => w.phase !== 0), [weeks]);
  const groups = useMemo(() => groupWeeksByPhase(realWeeks, phases), [realWeeks, phases]);

  return (
    <div className="min-h-screen bg-canvas px-[22px] pb-[132px] pt-1.5">
      <ScreenHeader onAvatarClick={onOpenSettings} />

      <div className="stride-rise mb-2 border-b border-hairline pb-[22px]">
        <Eyebrow>{realWeeks.length} weeks · {mode === 'general' ? 'rolling blocks' : 'base → race'}</Eyebrow>
        <h1
          className="mt-3.5 font-display text-[40px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
          style={{ fontVariationSettings: "'wdth' 122" }}
        >
          Full plan
        </h1>
      </div>

      {groups.map((g) => (
        <PhaseBand
          key={g.phase.num}
          phase={g.phase}
          weeks={g.weeks}
          currentWeekId={currentWeekId}
          isCurrentPhase={g.phase.num === currentPhaseNum}
          openWeekId={openWeekId}
          onToggleWeek={(weekId) => setOpenWeekId((cur) => (cur === weekId ? null : weekId))}
          onOpenDay={onOpenSession}
        />
      ))}

      {mode !== 'general' && <RaceDayCard />}

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
