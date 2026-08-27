import { ConsistencyBlock } from './ConsistencyBlock';
import { TonnageChart } from './TonnageChart';
import { DurabilityBlock } from './DurabilityBlock';
import { ExerciseProgression } from './ExerciseProgression';
import {
  buildStrengthIndex,
  consistencySummary,
  durabilitySummary,
  lowerLegInsurance,
  strengthVsVolume,
  weeklyGymAdherence,
} from '../../lib/strength';
import type { CompletionEntry, Week, WorkoutLog } from '../../types';

interface StatsSegmentProps {
  strength: Record<string, WorkoutLog>;
  weeks: Week[];
  completion: Record<string, CompletionEntry>;
  todayStr: string;
}

/**
 * The between-sessions surface.
 *
 * Block order is deliberate and matches what the athlete actually wants back:
 * consistency first as the hero, then volume, then the running linkage, with
 * PRs last. PRs are a garnish here, not the headline.
 */
export function StatsSegment({ strength, weeks, completion, todayStr }: StatsSegmentProps) {
  const index = buildStrengthIndex(strength);
  const adherence = weeklyGymAdherence(weeks, strength, todayStr);
  const durability = strengthVsVolume(weeks, strength, completion, todayStr);

  return (
    <div className="stride-rise">
      <ConsistencyBlock adherence={adherence} summary={consistencySummary(adherence)} />
      <TonnageChart strength={strength} weeks={weeks} todayStr={todayStr} />
      <DurabilityBlock
        points={durability}
        summary={durabilitySummary(durability)}
        lowerLeg={lowerLegInsurance(weeks, strength, todayStr)}
      />
      <ExerciseProgression strength={strength} index={index} todayStr={todayStr} />
    </div>
  );
}
