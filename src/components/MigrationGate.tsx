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
        <div className="fixed inset-x-4 top-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-hairline-strong bg-surface-2 px-4 py-3 shadow-lg">
          <span className="text-[13px] leading-snug text-ink">
            History imported — {confirmation.readiness} readiness days,{' '}
            {confirmation.stravaActivities} Strava runs. Your original data stays on this device.
          </span>
          <button
            type="button"
            onClick={() => setConfirmation(null)}
            className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent"
          >
            OK
          </button>
        </div>
      )}
      {children}
    </>
  );
}
