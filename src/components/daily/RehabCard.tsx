import { useMemo, useState } from 'react';
import { Tag } from '../ui/Tag';
import { useStorage } from '../../hooks/useStorage';
import {
  REHAB_LOG_KEY,
  REHAB_PROTOCOLS,
  REHAB_SESSIONS,
  rehabExercises,
  type RehabLog,
  type RehabSession,
} from '../../constants/rehab';

interface RehabCardProps {
  rehabId: string;
  /** The day this log belongs to — not "now", so a dateOverride logs where it should. */
  date: string;
}

const SESSION_LABEL: Record<RehabSession, string> = { am: 'Morning', pm: 'Evening' };

/**
 * The twice-daily rehab routine, on the Today card face rather than behind
 * Details. A protocol you have to go looking for is a protocol that gets skipped,
 * and range work only pays if it actually happens twice a day.
 */
export function RehabCard({ rehabId, date }: RehabCardProps) {
  const protocol = REHAB_PROTOCOLS[rehabId];
  const [log, writeLog] = useStorage<RehabLog>(REHAB_LOG_KEY, {});
  const exercises = useMemo(() => (protocol ? rehabExercises(protocol) : []), [protocol]);
  const [picked, setPicked] = useState<RehabSession | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Open on the session you are about to do, not the one you finished. Derived
  // rather than seeded into state because the log arrives from storage async.
  const amComplete = exercises.length > 0 && (log[date]?.am ?? []).length === exercises.length;
  const active: RehabSession = picked ?? (amComplete ? 'pm' : 'am');

  if (!protocol) return null;

  const ticked = new Set(log[date]?.[active] ?? []);

  // Functional form: a burst of taps must not read one stale snapshot and drop
  // every tick but the last.
  const toggle = (id: string) => {
    void writeLog((prev) => {
      const next = new Set(prev[date]?.[active] ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [date]: { ...(prev[date] ?? {}), [active]: [...next] } };
    });
  };

  const count = (s: RehabSession) => (log[date]?.[s] ?? []).length;
  const complete = (s: RehabSession) => count(s) === exercises.length;

  return (
    <div className="stride-rise mb-[26px] rounded-[18px] border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.05)] p-[22px]">
      <div className="mb-1.5 flex items-center justify-between">
        <Tag tone="warn">Rehab</Tag>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">{protocol.cadence}</span>
      </div>

      <div className="my-1 font-display text-[32px] font-extrabold leading-[1.02] tracking-[-0.01em]">
        {protocol.name}
      </div>

      <p className="mb-[18px] mt-2.5 max-w-[40ch] text-[14px] leading-normal text-[#D3DAE1]">{protocol.rule}</p>

      <div className="mb-[18px] flex gap-2">
        {REHAB_SESSIONS.map((s) => (
          <button
            key={s}
            onClick={() => setPicked(s)}
            className={`flex-1 rounded-xl border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
              active === s
                ? 'border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.12)] text-[#F59E0B]'
                : 'border-hairline text-muted'
            }`}
          >
            {complete(s) ? '✓ ' : ''}
            {SESSION_LABEL[s]}
            <span className="ml-1.5 opacity-60">
              {count(s)}/{exercises.length}
            </span>
          </button>
        ))}
      </div>

      {protocol.blocks.map((block) => (
        <div key={block.name} className="mb-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{block.name}</div>
          {block.exercises.map((ex) => {
            const on = ticked.has(ex.id);
            const open = expanded === ex.id;
            return (
              <div key={ex.id} className="border-b border-hairline last:border-b-0">
                <div className="flex items-center gap-3 py-2.5">
                  <button
                    onClick={() => toggle(ex.id)}
                    aria-pressed={on}
                    aria-label={`${on ? 'Untick' : 'Tick'} ${ex.name}`}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[12px] transition-colors ${
                      on
                        ? 'border-[rgba(245,158,11,0.5)] bg-[rgba(245,158,11,0.18)] text-[#F59E0B]'
                        : 'border-hairline text-transparent'
                    }`}
                  >
                    ✓
                  </button>
                  <button onClick={() => setExpanded(open ? null : ex.id)} className="flex-1 text-left">
                    <div className={`text-[15px] font-semibold ${on ? 'text-muted line-through' : ''}`}>{ex.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] tracking-[0.06em] text-faint">
                      {ex.sets > 1 ? `${ex.sets} × ` : ''}
                      {ex.reps}
                    </div>
                  </button>
                  {ex.note && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                      {open ? '−' : '?'}
                    </span>
                  )}
                </div>
                {open && ex.note && (
                  <p className="max-w-[42ch] pb-3 pl-9 text-[13.5px] leading-normal text-[#D3DAE1]">{ex.note}</p>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="mt-[18px] border-l-2 border-[#F59E0B] py-0.5 pl-4">
        <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#F59E0B]">
          Do not
        </div>
        {protocol.avoid.map((line) => (
          <p key={line} className="mb-2 max-w-[42ch] text-[13.5px] leading-normal text-[#D3DAE1] last:mb-0">
            {line}
          </p>
        ))}
      </div>

      <p className="mt-4 max-w-[42ch] text-[12px] leading-normal text-faint">{protocol.disclaimer}</p>
    </div>
  );
}
