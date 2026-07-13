import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from './crypto.js';

// Per-user third-party OAuth tokens live in oauth_connections. RLS is enabled
// with NO policies, so only this service-role client (server-only) can touch
// it. Every call is explicitly scoped to a resolved user id — the service role
// bypasses RLS, so the user_id filter is the isolation boundary.

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export type Provider = 'strava' | 'oura';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix SECONDS (both providers normalized to seconds)
}

export async function getConnection(uid: string, provider: Provider): Promise<Tokens | null> {
  const { data, error } = await admin
    .from('oauth_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', uid)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    accessToken: decrypt(data.access_token as string),
    refreshToken: decrypt(data.refresh_token as string),
    expiresAt: Number(data.expires_at),
  };
}

export async function saveConnection(uid: string, provider: Provider, t: Tokens): Promise<void> {
  const { error } = await admin.from('oauth_connections').upsert(
    {
      user_id: uid,
      provider,
      access_token: encrypt(t.accessToken),
      refresh_token: encrypt(t.refreshToken),
      expires_at: t.expiresAt,
    },
    { onConflict: 'user_id,provider' },
  );
  if (error) throw error;
}

export async function deleteConnection(uid: string, provider: Provider): Promise<void> {
  const { error } = await admin
    .from('oauth_connections')
    .delete()
    .eq('user_id', uid)
    .eq('provider', provider);
  if (error) throw error;
}
