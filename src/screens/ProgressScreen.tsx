import { useMemo } from 'react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { StatRow } from '../components/progress/StatRow';
import { VolumeBarChart } from '../components/progress/VolumeBarChart';
import { PaceLineChart } from '../components/progress/PaceLineChart';
import { TopLiftsList } from '../components/progress/TopLiftsList';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan, WEEKS } from '../hooks/usePlan';
import { useCompletion } from '../hooks/useCompletion';
import { useStrength } from '../hooks/useStrength';
import { useStorage } from '../hooks/useStorage';
import { buildProgressStats, buildPaceProgression } from '../lib/logic';
import { topLifts } from '../lib/strength';
import { GOAL_PACE } from '../constants/plan';
import type { StravaActivity } from '../types';

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parsePace(pace: string): number {
  const [m, s] = pace.split(':').map(Number);
  return m + s / 60;
}

interface ProgressScreenProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onOpenSettings: () => void;
}

export function ProgressScreen({ activeTab, onTabChange, onOpenSettings }: ProgressScreenProps) {
  const today = useCurrentDate();
  const { currentWeekIndex } = usePlan(today, 0);
  const { completion } = useCompletion();
  const { strength } = useStrength();
  const [stravaActivities] = useStorage<Record<string, StravaActivity>>('marathon-strava', {});

  const stats = useMemo(
    () => buildProgressStats(WEEKS, completion, currentWeekIndex),
    [completion, currentWeekIndex],
  );
  const pace = useMemo(
    () => buildPaceProgression(WEEKS, Object.values(stravaActivities)),
    [stravaActivities],
  );
  const lifts = useMemo(() => topLifts(strength, localDateKey(today)), [strength, today]);

  return (
    <div className="min-h-screen bg-canvas px-[22px] pb-[132px] pt-1.5">
      <ScreenHeader onAvatarClick={onOpenSettings} />

      <div className="stride-rise mb-6 border-b border-hairline pb-[22px]">
        <Eyebrow>The build</Eyebrow>
        <h1
          className="mt-3.5 font-display text-[33px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
          style={{ fontVariationSettings: "'wdth' 104" }}
        >
          Progression
        </h1>
      </div>

      <StatRow
        stats={[
          { label: '4-wk avg', value: `${stats.fourWeekAvgKm}`, unit: 'km' },
          { label: 'Peak wk', value: `${stats.peakWeekKm}`, unit: 'km' },
          { label: 'Ramp', value: `${stats.rampPct > 0 ? '+' : ''}${stats.rampPct}`, unit: '%', accent: true },
        ]}
      />

      <VolumeBarChart volume={stats.volume} />
      <PaceLineChart pace={pace} goalPaceMin={parsePace(GOAL_PACE)} />
      <TopLiftsList lifts={lifts} />

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
