import { useEffect, useRef, useState, type ReactNode } from 'react';
import { legacyImportPending, runLegacyImport, type LegacyImportResult } from '../lib/legacyImport';

/** One-time legacy localStorage → Supabase import (owner's device, first
 *  login). Blocks the app briefly while importing so hooks hydrate from the
 *  freshly imported data; afterwards it's a passthrough. */
export function MigrationGate({ children }: { children: ReactNode }) {
  const [importing, setImporting] = useState(() => legacyImportPending());
  const [confirmation, setConfirmation] = useState<LegacyImportResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!importing || started.current) return;
    started.current = true;
    void runLegacyImport()
      .then((result) => {
        if (result.readiness || result.stravaActivities || result.blobs.length) {
          setConfirmation(result);
        }
      })
      .finally(() => setImporting(false));
  }, [importing]);

  if (importing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-5">
        <div className="font-display text-sm font-black uppercase tracking-[0.22em] text-ink">
          Stride
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Importing your training history…
        </div>
      </div>
    );
  }

  return (
    <>
      {confirmation && (
        <div
          className="fixed inset-x-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-hairline-strong bg-surface-2 px-4 py-3 shadow-lg"
          // Sit clear of the iOS status bar / notch so the OK button is tappable
          // (top-4 alone put it under the safe area on installed PWAs).
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <span className="text-[13px] leading-snug text-ink">
            History imported — {confirmation.readiness} readiness days,{' '}
            {confirmation.stravaActivities} Strava runs. Your original data stays on this device.
          </span>
          <button
            type="button"
            onClick={() => setConfirmation(null)}
            className="-my-3 -mr-2 flex-none px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent"
          >
            OK
          </button>
        </div>
      )}
      {children}
    </>
  );
}
