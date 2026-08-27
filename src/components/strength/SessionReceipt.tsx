import { Sheet } from '../ui/Sheet';
import { Eyebrow } from '../ui/Eyebrow';
import { formatTonnage } from '../../lib/format';
import { receiptLine } from '../../lib/strength';
import type { MuscleBreakdownEntry } from '../../lib/strength';

interface SessionReceiptProps {
  workoutName: string;
  date: string;
  tonnage: number;
  sets: number;
  durationMin?: number;
  /** Tonnage change against the previous session of the same workout. */
  comparison: { tonnageDelta: number; pct: number } | null;
  streakWeeks: number;
  muscles: MuscleBreakdownEntry[];
  onClose: () => void;
}

function longDate(date: string): string {
  return new Date(`${date}T12:00:00`)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')
    .toUpperCase();
}

/**
 * The unit rides small and inline beside the figure rather than inflating it —
 * "2.41" and "41" then set at the same visual weight, which is what makes the
 * three stats read as a row instead of three unrelated numbers.
 */
function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-1">
        <span className="stride-num font-display text-[32px] font-black leading-none tracking-[-0.02em]">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{unit}</span>
        )}
      </div>
      <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">{label}</div>
    </div>
  );
}

/** Splits `4.28 t` into its figure and unit so Stat can set them separately. */
function splitTonnage(kg: number): { value: string; unit?: string } {
  if (kg <= 0) return { value: '—' };
  const [value, unit] = formatTonnage(kg).split(' ');
  return { value, unit };
}

export function SessionReceipt({
  workoutName,
  date,
  tonnage,
  sets,
  durationMin,
  comparison,
  streakWeeks,
  muscles,
  onClose,
}: SessionReceiptProps) {
  return (
    <Sheet
      onClose={onClose}
      headerLeft={
        <>
          <Eyebrow>Session logged</Eyebrow>
          <div className="mt-1.5 truncate font-display text-[15px] font-bold uppercase tracking-[0.02em]">
            {workoutName} · {longDate(date)}
          </div>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3 border-b border-hairline pb-6">
        <Stat {...splitTonnage(tonnage)} label="Tonnage" />
        <Stat value={String(sets)} label="Sets" />
        <Stat value={durationMin != null ? String(durationMin) : '—'} unit={durationMin != null ? 'min' : undefined} label="Duration" />
      </div>

      {comparison && (
        <div className="stride-num border-b border-hairline py-4 font-mono text-[11px] uppercase tracking-[0.1em]">
          <span className={comparison.pct >= 0 ? 'text-accent' : 'text-muted'}>
            {comparison.pct >= 0 ? '▲' : '▼'} {Math.abs(comparison.pct)}%
          </span>{' '}
          <span className="text-faint">vs last {workoutName.toLowerCase()}</span>
        </div>
      )}

      {streakWeeks > 0 && (
        <div className="border-b border-hairline py-5">
          {/* The one place `success` green is permitted in this feature. */}
          <div className="stride-num font-mono text-[11px] uppercase tracking-[0.16em] text-success">
            Streak · {streakWeeks} {streakWeeks === 1 ? 'week' : 'weeks'}
          </div>
          <p className="mt-2 font-mono text-[11px] leading-[1.6] text-muted">
            Every planned gym session, {streakWeeks === 1 ? 'one week' : `${streakWeeks} weeks`} running.
          </p>
        </div>
      )}

      {muscles.length > 0 && (
        <div className="border-b border-hairline py-5">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">Muscle groups</div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
            {muscles.map((m) => (
              <span key={m.muscle} className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{m.muscle}</span>
                <span className="flex items-center gap-[3px]" aria-hidden>
                  {Array.from({ length: m.exercises }, (_, i) => (
                    <span key={i} className="h-[5px] w-[5px] rounded-full bg-accent" />
                  ))}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="py-6 font-mono text-[12px] leading-[1.7] text-[#B4BDC5]">{receiptLine(date)}</p>
    </Sheet>
  );
}
