import { useMemo } from 'react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { PhaseBand } from '../components/plan/PhaseBand';
import { RaceDayCard } from '../components/plan/RaceDayCard';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan, WEEKS } from '../hooks/usePlan';
import { groupWeeksByPhase } from '../lib/logic';

interface FullPlanScreenProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onOpenSettings: () => void;
}

export function FullPlanScreen({ activeTab, onTabChange, onOpenSettings }: FullPlanScreenProps) {
  const today = useCurrentDate();
  const { currentWeekIndex } = usePlan(today, 0);
  const currentWeekId = WEEKS[currentWeekIndex]?.id;
  const currentPhaseNum = WEEKS[currentWeekIndex]?.phase;

  const realWeeks = useMemo(() => WEEKS.filter((w) => w.phase !== 0), []);
  const groups = useMemo(() => groupWeeksByPhase(realWeeks), [realWeeks]);

  return (
    <div className="min-h-screen bg-canvas px-[22px] pb-[132px] pt-1.5">
      <ScreenHeader onAvatarClick={onOpenSettings} />

      <div className="stride-rise mb-2 border-b border-hairline pb-[22px]">
        <Eyebrow>{realWeeks.length} weeks · base → race</Eyebrow>
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
        />
      ))}

      <RaceDayCard />

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
