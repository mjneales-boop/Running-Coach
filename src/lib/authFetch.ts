import { supabase } from './supabase';

/** fetch() that attaches the current Supabase access token as a Bearer header,
 *  so per-user API routes (Strava/Oura/coach) can identify the signed-in user.
 *  Every integration call must go through this — the routes 401 without it. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

/** Bearer token for one-off use (e.g. building an OAuth authorize request). */
export async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
