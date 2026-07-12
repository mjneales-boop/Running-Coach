import { createClient, type User } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

// Anon-key client is enough to validate a user JWT via the Auth server;
// no service-role key needed (and none should reach this path).
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Returns the authenticated Supabase user for the request, or null. */
export async function verifyUser(req: VercelRequest): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}
