/**
 * One-time owner seed. Run locally with the service-role key:
 *
 *   npm run seed:owner
 *
 * Required env (put them in .env at the repo root — see .env.example):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL, OWNER_PASSWORD
 *   KV_REST_API_URL, KV_REST_API_TOKEN   (to pull completion/strength/swaps/gym data from Redis)
 *
 * Idempotent: allowlist/profile/blobs upsert; the user and plan row are only
 * created if missing; completion/strength rows upsert by key.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import {
  WEEKS,
  ZONES,
  PHASES,
  ATHLETE,
  RACE_NAME,
  RACE_DATE,
  RACE_TIME,
  RACE_LOCATION,
  GOAL_TIME,
  GOAL_PACE,
} from '../src/constants/plan';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var ${name}`);
    process.exit(1);
  }
  return v;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const OWNER_EMAIL = requireEnv('OWNER_EMAIL');
const OWNER_PASSWORD = requireEnv('OWNER_PASSWORD');
const KV_URL = requireEnv('KV_REST_API_URL');
const KV_TOKEN = requireEnv('KV_REST_API_TOKEN');

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

async function fail(step: string, error: unknown): Promise<never> {
  console.error(`✗ ${step}:`, error);
  process.exit(1);
}

async function main() {
  // 1. Allowlist FIRST — the signup trigger also fires for admin-created users.
  {
    const { error } = await admin.from('allowed_emails').upsert({ email: OWNER_EMAIL.toLowerCase() });
    if (error) await fail('allowlist', error);
    console.log(`✓ allowlist: ${OWNER_EMAIL}`);
  }

  // 2. Owner auth user (create or reuse)
  let userId: string;
  {
    const { data, error } = await admin.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      if (!/already/i.test(error.message)) await fail('createUser', error);
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) await fail('listUsers', listErr);
      const existing = list.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());
      if (!existing) await fail('createUser', 'user exists but not found in listUsers');
      userId = existing!.id;
      console.log(`✓ user exists: ${userId}`);
    } else {
      userId = data.user.id;
      console.log(`✓ user created: ${userId}`);
    }
  }

  // 3. Profile (the signup trigger already inserted a bare row — upsert over it)
  {
    const { error } = await admin.from('profiles').upsert({
      id: userId,
      display_name: ATHLETE.name,
      is_admin: true,
      max_hr: ATHLETE.maxHR,
      baseline_hrv: ATHLETE.baselineHRV,
      baseline_rhr: ATHLETE.baselineRHR,
      baseline_sleep: ATHLETE.baselineSleep,
      race_name: RACE_NAME,
      race_date: RACE_DATE,
      race_time: RACE_TIME,
      race_location: RACE_LOCATION,
      goal_time: GOAL_TIME,
      goal_pace: GOAL_PACE,
    });
    if (error) await fail('profile', error);
    console.log('✓ profile seeded (is_admin, baselines, race metadata)');
  }

  // 4. Plan row (skip if an active plan already exists)
  {
    const { data: existing, error: selErr } = await admin
      .from('plans')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();
    if (selErr) await fail('plan lookup', selErr);
    if (existing) {
      console.log(`✓ active plan already present (${existing.id}) — skipped`);
    } else {
      const { error } = await admin.from('plans').insert({
        user_id: userId,
        mode: 'race',
        weeks: WEEKS,
        zones: ZONES,
        phases: PHASES,
      });
      if (error) await fail('plan insert', error);
      console.log(`✓ plan inserted: ${WEEKS.length} weeks, ${ZONES.length} zones, ${PHASES.length} phases`);
    }
  }

  // 5. Redis-authoritative data → per-user tables
  //    completion:{weekId}:{day}  → completions
  {
    const keys = await redis.keys('completion:*');
    let count = 0;
    if (keys.length) {
      const values = await redis.mget<Record<string, unknown>[]>(...keys);
      const rows = keys
        .map((k, i) => ({ k, entry: values[i] as { weekId?: string; day?: string; updatedAt?: number } | null }))
        .filter((r) => r.entry != null)
        .map(({ k, entry }) => {
          const [, weekId, day] = k.split(':');
          const e = { weekId, day, ...entry };
          return {
            user_id: userId,
            key: `${e.weekId ?? weekId}-${e.day ?? day}`,
            entry: e,
            updated_at: e.updatedAt ?? 0,
          };
        });
      if (rows.length) {
        const { error } = await admin.from('completions').upsert(rows, { onConflict: 'user_id,key' });
        if (error) await fail('completions upsert', error);
        count = rows.length;
      }
    }
    console.log(`✓ completions: ${count} rows from Redis`);
  }

  //    strength:{date}:{workoutId} → strength_logs (keyed by date)
  {
    const keys = await redis.keys('strength:*');
    let count = 0;
    if (keys.length) {
      const values = await redis.mget<Record<string, unknown>[]>(...keys);
      const rows = keys
        .map((k, i) => ({ k, entry: values[i] as { date?: string; updatedAt?: number } | null }))
        .filter((r) => r.entry != null)
        .map(({ k, entry }) => {
          const date = entry!.date ?? k.split(':')[1];
          return { user_id: userId, date, entry, updated_at: entry!.updatedAt ?? 0 };
        });
      if (rows.length) {
        const { error } = await admin.from('strength_logs').upsert(rows, { onConflict: 'user_id,date' });
        if (error) await fail('strength upsert', error);
        count = rows.length;
      }
    }
    console.log(`✓ strength_logs: ${count} rows from Redis`);
  }

  //    blob:swaps / blob:gymOverrides → user_blobs
  for (const resource of ['swaps', 'gymOverrides']) {
    const blob = await redis.get<{ value: unknown; updatedAt: number }>(`blob:${resource}`);
    if (blob?.value != null) {
      const { error } = await admin.from('user_blobs').upsert(
        { user_id: userId, resource, value: blob.value, updated_at: blob.updatedAt ?? 0 },
        { onConflict: 'user_id,resource' },
      );
      if (error) await fail(`blob ${resource}`, error);
      console.log(`✓ user_blobs/${resource}: imported (updatedAt ${blob.updatedAt ?? 0})`);
    } else {
      console.log(`✓ user_blobs/${resource}: nothing in Redis — skipped`);
    }
  }

  // 6. Final row counts for eyeball verification
  for (const table of ['completions', 'strength_logs', 'user_blobs', 'readiness_entries', 'strava_activities', 'plans']) {
    const { count, error } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) await fail(`count ${table}`, error);
    console.log(`  ${table}: ${count} rows`);
  }
  console.log('\nDone. Readiness + Strava history import runs in-app on the owner’s device (one-time).');
}

void main();
