import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Module-level accessor so non-React code (src/lib/storage.ts cache scoping)
// can read the current user id synchronously.
let currentUserId = '';
export const getCurrentUserId = () => currentUserId;

export class InviteOnlyError extends Error {
  constructor() {
    super('invite_only');
    this.name = 'InviteOnlyError';
  }
}

interface UseAuth {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<UseAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The module-level uid must be set before setSession triggers a render of
    // the gated children, whose hooks read it synchronously for cache scoping.
    const applySession = (s: Session | null) => {
      currentUserId = s?.user.id ?? '';
      setSession(s);
    };
    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      applySession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: UseAuth = {
    session,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password) => {
      const { data: allowed, error: rpcError } = await supabase.rpc('is_email_allowed', {
        check_email: email,
      });
      if (rpcError) throw rpcError;
      if (!allowed) throw new InviteOnlyError();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        // The allowlist trigger surfaces as a generic DB error — map it too.
        if (/database error/i.test(error.message)) throw new InviteOnlyError();
        throw error;
      }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
