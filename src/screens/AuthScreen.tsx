import { useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { useAuth, InviteOnlyError } from '../hooks/useAuth';

type Mode = 'signin' | 'signup';

const INVITE_MESSAGE =
  'STRIDE is invite-only right now — ask the owner to add your email, then try again.';

function friendlyError(err: unknown): string {
  if (err instanceof InviteOnlyError) return INVITE_MESSAGE;
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/at least 6/i.test(msg)) return 'Password needs at least 6 characters.';
  if (/valid email/i.test(msg)) return 'That doesn’t look like a valid email.';
  if (/already registered/i.test(msg)) return 'That email already has an account — sign in instead.';
  return 'Something went wrong. Please try again.';
}

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-[9px] border border-hairline-strong bg-field px-3 py-2.5 font-display text-base font-bold text-ink outline-none placeholder:text-faint focus:border-accent';

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="stride-rise w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-2xl font-black uppercase tracking-[0.22em] text-ink">
            Stride
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Training, on your terms
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-card border border-hairline bg-surface p-5"
        >
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className={inputClass}
          />

          <label className="mt-4 mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            className={inputClass}
          />

          {error && (
            <p className="mt-4 rounded-[9px] border border-warning/40 bg-warning/10 px-3 py-2.5 text-[13px] leading-snug text-warning">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="mt-5 w-full">
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="mt-5 w-full text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
