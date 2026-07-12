# STRIDE — Marathon Coach

Multi-user training dashboard (React 19 + Vite + Tailwind v4) with Supabase auth/Postgres,
Vercel serverless API routes, per-user Strava/Oura sync, and an AI coach.
Originally a single-athlete dashboard for the EDP Lisbon Marathon 2026 (sub-4:00 goal).

Signup is invite-only: emails must be on the owner-managed `allowed_emails` list
(enforced by a DB trigger, not just the UI).

---

## Local Development

```bash
npm install
cp .env.example .env   # fill in Supabase + provider keys
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). API routes need `vercel dev`
(or the deployed URL) since they are serverless functions.

## Production Build

```bash
npm run build
npm run preview   # preview the built output locally
npm run typecheck:server
```

## Deploy to Vercel

1. Push to GitHub; import the repo in Vercel (Framework: **Vite**, auto-detected).
2. Set environment variables (see `.env.example`):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (server routes)
   - `ANTHROPIC_API_KEY`, `SESSION_PASSWORD`, `STRAVA_*`, `OURA_*`
   - Note: `SUPABASE_SERVICE_ROLE_KEY` is **not** set in Vercel — it is only used
     locally by the seed script.
3. Deploy. `vercel.json` handles SPA routing so refreshes don't 404.

## Supabase setup (one-time)

1. Create a project, then run `supabase/migrations/0001_init.sql` in the SQL Editor
   (tables, RLS policies, allowlist trigger, profile trigger, `is_email_allowed` RPC).
2. Auth → Sign In / Providers: enable **Email**, disable **Confirm email**.
   Auth → URL Configuration: set the Site URL to the production URL.
3. Seed the owner account and migrate legacy data:

```bash
npm run seed:owner   # needs SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL/PASSWORD, KV_* in .env
```

The script adds the owner to the allowlist, creates the auth user + admin profile,
inserts the plan row from `src/constants/plan.ts`, and pulls completion/strength/
swaps/gym-override history from the legacy Upstash Redis store. Readiness and
Strava history import in-app on the owner's device on first login (one-time,
non-destructive — legacy localStorage keys are never deleted).

---

## Backups & restore

Supabase's free tier has no automated backups, so `.github/workflows/db-backup.yml`
runs `pg_dump` nightly (03:00 UTC) and keeps 30 days of gzipped dumps as workflow
artifacts. It can also be run on demand: GitHub → Actions → db-backup → Run workflow.

Setup: add the repo secret `SUPABASE_DB_URL` = the **Session pooler** connection
string (Dashboard → Connect → Session pooler; the direct DB host is IPv6-only and
unreachable from GitHub runners).

### Restore procedure

1. Download the artifact from the Actions run and `gunzip stride-<date>.sql.gz`.
2. Restore into a fresh (or the same) project:

   ```bash
   psql "$SUPABASE_DB_URL" -f stride-<date>.sql
   ```

   The dump includes `public` and `auth` schemas with `--clean --if-exists`, so
   objects are dropped and recreated.
3. Verify: log in on the app and check completions/readiness counts, and re-run
   `grant execute on function public.is_email_allowed(text) to anon, authenticated;`
   if RPC calls 401 (grants can need re-applying after a cross-project restore).

If the project moves to Supabase Pro, its built-in daily backups become primary
and this workflow stays as belt-and-braces.

---

## Architecture

```
api/                    Vercel serverless functions
  coach-chat.ts         Anthropic-backed coach (verifies Supabase JWT)
  strava/* oura/*       OAuth + sync (iron-session cookies; per-user DB tokens in Phase 4)
lib/                    Server-side helpers (session, token refresh, verifyUser)
scripts/seed-owner.ts   One-time owner seed/migration (service-role key)
supabase/migrations/    Schema + RLS + triggers
src/
  constants/plan.ts     Owner's 18-week plan — seed data only, not imported by the app
  lib/supabase.ts       Supabase client singleton
  lib/db.ts             Typed per-user data layer (completions, readiness, strava, blobs, plan)
  lib/storage.ts        Legacy async storage adapter, now routed to Supabase + per-user cache
  lib/logic.ts          Pure business logic (plan/zones/athlete passed as parameters)
  hooks/useAuth.tsx     Supabase auth provider (session gate)
  hooks/usePlanConfig.tsx  PlanContext — weeks/zones/phases/race/athlete from the DB
  hooks/                Data hooks (signatures unchanged from the single-user app)
  screens/              Daily / Strength / Progress / Full plan / Coach / Settings / Auth
  components/           UI components
```

## Storage

All user data lives in Supabase Postgres behind RLS (`user_id = auth.uid()`).
localStorage holds a per-user cache under `stride:{userId}:{key}` for optimistic
writes and offline reads. The pre-multi-user keys (`marathon-*`, `stride-settings`,
`stride-coach-messages`) are read once by the in-app import and then left untouched.

| Table | Contents |
|---|---|
| `plans` | Active plan: `weeks`, `zones`, `phases` jsonb |
| `completions` | `key = weekId-dayAbbr`, entry jsonb, LWW by `updated_at` (epoch ms) |
| `readiness_entries` | Per-day readiness (manual + Oura) |
| `strava_activities` | Synced activity cache |
| `strength_logs` | Per-date workout logs, LWW |
| `user_blobs` | swaps, gymOverrides, exercise-overrides, settings, coach-messages, strava-lastrun, app-settings |

### Debug date override

```js
// DevTools console (uid = your Supabase user id, visible in the network tab):
localStorage.setItem('stride:<uid>:marathon-settings', JSON.stringify({ dateOverride: '2026-08-17' }));
// Then refresh. To reset, remove the key.
```

---

## Tech Stack

- React 19 + TypeScript, Vite, Tailwind CSS v4
- Supabase (Auth + Postgres + RLS)
- Vercel serverless functions (`@vercel/node`)
- Anthropic API (coach), Strava + Oura OAuth
- Upstash Redis (legacy store, retired after Phase 1 verification)
