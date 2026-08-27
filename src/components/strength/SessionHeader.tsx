import { Eyebrow } from '../ui/Eyebrow';
import { ProgressRing } from '../ui/ProgressRing';
import { formatTonnage } from '../../lib/format';

interface SessionHeaderProps {
  eyebrow: string;
  title: string;
  committed: number;
  planned: number;
  lifts: number;
  /** Kilograms lifted so far this session. */
  tonnage: number;
  durationMin?: number;
}

export function SessionHeader({
  eyebrow,
  title,
  committed,
  planned,
  lifts,
  tonnage,
  durationMin,
}: SessionHeaderProps) {
  const meta = [
    `${lifts} ${lifts === 1 ? 'lift' : 'lifts'}`,
    tonnage > 0 ? formatTonnage(tonnage) : null,
    durationMin != null ? `${durationMin} min` : null,
  ].filter(Boolean);

  return (
    <div className="mb-[22px] border-b border-hairline pb-[22px]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Eyebrow>{eyebrow}</Eyebrow>
          {/* The tab bar already says Strength — the title names the session. */}
          <h1
            className="mt-3.5 font-display text-[40px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
            style={{ fontVariationSettings: "'wdth' 118" }}
          >
            {title}
          </h1>
        </div>

        {planned > 0 && (
          <div className="mt-1 flex-none">
            <ProgressRing
              value={committed / planned}
              size={44}
              label={`${committed} of ${planned} sets logged`}
            >
              <span className="stride-num font-mono text-[10px] tracking-[0.02em] text-muted">
                {committed}/{planned}
              </span>
            </ProgressRing>
          </div>
        )}
      </div>

      {meta.length > 0 && (
        <div className="stride-num mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
          {meta.join(' · ')}
        </div>
      )}
    </div>
  );
}
