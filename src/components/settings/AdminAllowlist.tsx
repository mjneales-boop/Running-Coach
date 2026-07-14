import { useEffect, useState } from 'react';
import { Eyebrow } from '../ui/Eyebrow';
import { fetchAllowlist, addAllowedEmail, removeAllowedEmail, type AllowedEmail } from '../../lib/db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Owner-only allowlist manager — add/remove who can sign up, from inside the
 *  app (replaces scripts/allowlist.ts). Only rendered when the profile is admin;
 *  the allowed_emails RLS policy also restricts these writes to admins server-side. */
export function AdminAllowlist({ ownerEmail }: { ownerEmail?: string }) {
  const [rows, setRows] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setRows(await fetchAllowlist());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the allowlist');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function add() {
    const email = input.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addAllowedEmail(email);
      setInput('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that email');
    } finally {
      setBusy(false);
    }
  }

  async function remove(email: string) {
    setBusy(true);
    setError(null);
    try {
      await removeAllowedEmail(email);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that email');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-[26px]">
      <Eyebrow className="mb-3">Allowlist · who can sign up</Eyebrow>
      <div className="rounded-2xl border border-hairline bg-surface px-5 py-1">
        <div className="flex items-center gap-2 py-[14px]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add();
            }}
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="name@example.com"
            className="w-full rounded-[9px] border border-hairline-strong bg-field px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy}
            className="flex-none whitespace-nowrap rounded-[9px] border border-[rgba(0,217,255,0.4)] bg-accent-tint px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent disabled:opacity-40"
          >
            Add
          </button>
        </div>

        {error && (
          <p className="pb-3 text-[12.5px] leading-snug text-warning">{error}</p>
        )}

        {loading ? (
          <div className="border-t border-hairline py-[14px] font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t border-hairline py-[14px] text-[13.5px] text-muted">
            No emails allowlisted yet.
          </div>
        ) : (
          rows.map((r) => {
            const isOwner = ownerEmail && r.email === ownerEmail.toLowerCase();
            return (
              <div
                key={r.email}
                className="flex items-center justify-between gap-3 border-t border-hairline py-[14px]"
              >
                <span className="min-w-0 truncate text-[14.5px] text-ink">
                  {r.email}
                  {isOwner && (
                    <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">you</span>
                  )}
                </span>
                {!isOwner && (
                  <button
                    type="button"
                    onClick={() => void remove(r.email)}
                    disabled={busy}
                    className="flex-none font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-warning disabled:opacity-40"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="mt-2 px-1 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
        {rows.length} allowed · removing an email doesn't delete an existing account
      </p>
    </div>
  );
}
