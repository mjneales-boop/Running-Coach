import { readinessHeadline } from '../../lib/logic';
import { usePlanConfig } from '../../hooks/usePlanConfig';
import { Button } from '../ui/Button';
import type { ReadinessEntry } from '../../types';

interface MetricProps {
  label: string;
  value: number | undefined;
  unit: string;
  baseline: number;
  isFirst?: boolean;
}

function Metric({ label, value, unit, baseline, isFirst }: MetricProps) {
  return (
    <div className={`pt-[18px] ${isFirst ? '' : 'border-l border-hairline pl-1'}`}>
      <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className="text-2xl font-extrabold tracking-[-0.01em]">
        {value ?? '—'}
        <span className="ml-0.5 text-[13px] font-medium text-muted">{unit}</span>
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] text-faint">base {baseline}</div>
    </div>
  );
}

interface ReadinessCardConnectedProps {
  variant: 'connected';
  entry: ReadinessEntry;
}

interface ReadinessCardNotConnectedProps {
  variant: 'not-connected';
  onConnect: () => void;
}

type ReadinessCardProps = ReadinessCardConnectedProps | ReadinessCardNotConnectedProps;

export function ReadinessCard(props: ReadinessCardProps) {
  const { athlete } = usePlanConfig();
  if (props.variant === 'not-connected') {
    return (
      <div className="stride-rise mb-[26px] rounded-[18px] border border-dashed border-hairline-strong bg-surface px-[22px] py-[30px] text-center">
        <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-hairline-strong">
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth={1.8}>
            <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="mb-2 text-lg font-bold">Readiness not linked</div>
        <p className="mx-auto mb-5 max-w-[30ch] text-sm leading-normal text-muted">
          Connect Oura to see HRV, resting heart rate and sleep — so STRIDE can adjust today's call to how you
          actually recovered.
        </p>
        <Button variant="primary" className="inline-block px-6" onClick={props.onConnect}>
          Connect Oura
        </Button>
      </div>
    );
  }

  const { entry } = props;
  const { headline, sub } = readinessHeadline(entry.score);

  return (
    <div className="stride-rise mb-[26px] rounded-[18px] border border-hairline bg-surface p-[22px]">
      <div className="mb-6 flex items-center gap-5">
        <div
          className="font-display text-[78px] font-black leading-[0.8] tracking-[-0.03em] text-accent"
          style={{ textShadow: '0 0 10px var(--color-accent-glow)' }}
        >
          {entry.score ?? '—'}
        </div>
        <div>
          <div className="text-[19px] font-bold">{headline}</div>
          <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{sub}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-0.5 border-t border-hairline">
        <Metric label="HRV" value={entry.hrv} unit="ms" baseline={athlete.baselineHRV} isFirst />
        <Metric label="RHR" value={entry.rhr} unit="bpm" baseline={athlete.baselineRHR} />
        <Metric label="Sleep" value={entry.sleep} unit="h" baseline={athlete.baselineSleep} />
      </div>
    </div>
  );
}
