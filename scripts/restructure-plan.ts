/**
 * One-off plan restructure — splices the rewritten weeks 8–16 and the corrected
 * pace zones into the owner's live plan row.
 *
 *   npx tsx scripts/restructure-plan.ts          # dry run: verify + report, writes nothing
 *   npx tsx scripts/restructure-plan.ts --apply  # writes, then re-verifies from the DB
 *
 * Required env (.env at the repo root):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL
 *
 * Why a script and not a SQL migration: the whole plan is a single `weeks` JSONB
 * value on one row, so "change everything from 2026-08-10 onward and nothing
 * before it" is a read-modify-write, not a row filter.
 *
 * Why an in-place UPDATE and not a new row + `active` flip: `plans_one_active_per_user`
 * is a partial unique index on (user_id) WHERE active, so two active rows are
 * impossible even momentarily. The unavoidable two-statement flip would leave a
 * window with zero active plans, during which the app renders the onboarding
 * wizard — and if the second statement failed, it would stay there. A single
 * UPDATE of the JSONB is atomic and never touches `active`.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { WEEKS, ZONES } from '../src/constants/plan';
import { weeksSchema } from '../lib/planSchema';
import type { Week, Zone } from '../src/types';

/** Nothing dated before this may change. Weeks pre1–w7 are history. */
const CUTOVER = '2026-08-10';
const EXPECTED_WEEK_IDS = ['w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'w15', 'w16'];
const EXPECTED_TARGETS = [42, 60, 64, 68, 48, 60, 50, 38, 22];
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Transcribed from the club schedule. A typo here fails the run rather than shipping. */
const EXPECTED_FIXTURES = [
  { date: '2026-08-15', kickoff: '15:00', opponent: 'Swan Hill SC',            homeAway: 'away', venue: 'Ken Harrison Reserve Pitch 1' },
  { date: '2026-08-23', kickoff: '14:00', opponent: 'Colts United FC',         homeAway: 'home', venue: 'Chewton Soldiers Memorial Park Pitch 1' },
  { date: '2026-08-29', kickoff: '16:00', opponent: 'Colts United FC',         homeAway: 'away', venue: 'Benefit Bendigo Strathfieldsaye Soccer Complex Pitch 1' },
  { date: '2026-09-06', kickoff: '15:00', opponent: 'Deniliquin Wanderers SC', homeAway: 'home', venue: 'Chewton Soldiers Memorial Park Pitch 1' },
];

const APPLY = process.argv.includes('--apply');
const FORCE_COMPLETIONS = process.argv.includes('--force-completions');

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var ${name}`);
    process.exit(1);
  }
  return v;
}

const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const OWNER_EMAIL = requireEnv('OWNER_EMAIL');

let failures = 0;
const ok = (msg: string, detail = '') => console.log(`  ✓ ${msg.padEnd(52)}${detail}`);
const bad = (msg: string, detail = '') => {
  failures++;
  console.log(`  ✗ ${msg.padEnd(52)}${detail}`);
};
const check = (cond: boolean, msg: string, detail = '') => (cond ? ok(msg, detail) : bad(msg, detail));

async function fail(step: string, error: unknown): Promise<never> {
  console.error(`✗ ${step}:`, error);
  process.exit(1);
}

/**
 * Deep equality that ignores object key order. Postgres JSONB does not preserve
 * insertion order, so a plain JSON.stringify comparison reports every round-tripped
 * week as "changed" even when the content is byte-for-byte the same. Array order
 * is significant and is preserved.
 */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}
const eq = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/** Every §9 acceptance criterion, run against whatever week array it is handed. */
function verify(kept: Week[], incoming: Week[], zones: Zone[], liveZones: Zone[]) {
  console.log('\nAcceptance criteria (brief §9)');

  const strayPast = kept.flatMap((w) => w.days.filter((d) => d.date >= CUTOVER));
  check(strayPast.length === 0, `no session before ${CUTOVER} modified`, `${kept.length} weeks kept, ${strayPast.length} stray days`);

  const strayFuture = incoming.flatMap((w) => w.days.filter((d) => d.date < CUTOVER));
  check(strayFuture.length === 0, 'every replaced day is on/after the cutover', `${strayFuture.length} stray`);

  check(eq(incoming.map((w) => w.id), EXPECTED_WEEK_IDS), 'week ids preserved (completion keys survive)', incoming.map((w) => w.id).join(','));

  const games = incoming.flatMap((w) => w.days.filter((d) => d.type === 'GAME'));
  check(games.length > 0, 'GAME session type present', `${games.length} across the block`);

  const actual = games.map((g) => ({
    date: g.date, kickoff: g.fixture?.kickoff, opponent: g.fixture?.opponent,
    homeAway: g.fixture?.homeAway, venue: g.fixture?.venue,
  }));
  check(eq(actual, EXPECTED_FIXTURES), 'all known fixtures match date/time/opponent/venue', `${actual.length}/${EXPECTED_FIXTURES.length}`);

  const longWeeks = incoming.filter((w) => !w.race);
  const tueLongs = longWeeks.filter((w) => w.days.find((d) => d.type === 'LONG')?.d === 'tue');
  check(tueLongs.length === longWeeks.length, 'long run sits on Tuesday, weeks 8–15', `${tueLongs.length}/${longWeeks.length}`);

  const satFixtureWeeks = incoming.filter((w) => w.days.some((d) => d.type === 'GAME' && d.d === 'sat'));
  const noWorkout = satFixtureWeeks.filter((w) => !w.days.some((d) => d.type === 'WORKOUT'));
  check(noWorkout.length === satFixtureWeeks.length, 'Saturday-fixture weeks have no workout', `${satFixtureWeeks.map((w) => w.id).join(',')}`);

  check(eq(incoming.map((w) => w.targetKm), EXPECTED_TARGETS), 'weekly volume targets unchanged', incoming.map((w) => w.targetKm).join('/'));

  // Pace prescriptions must name the corrected zone values. This is the durable guard
  // against the class of bug where zone numbers move but the prescription text does
  // not follow. Checked per session over title+notes together: a title may name the
  // zone ("4×400m @ CV") while the notes carry the pace.
  const sessions = incoming.flatMap((w) => w.days.map((d) => ({ id: `${w.id} ${d.d}`, text: `${d.title} ${d.notes ?? ''}` })));
  const statesPace = (term: RegExp, pace: string) =>
    sessions.filter((s) => term.test(s.text) && !s.text.includes(pace)).map((s) => s.id);

  const SUB_T = /sub-?\s?T\b/i;
  const subTBad = statesPace(SUB_T, '5:25–5:35');
  // A sub-T session legitimately mentions "threshold" ("sub-T only, never full
  // threshold") — it is governed by the sub-T check above, not this one.
  const subTIds = new Set(sessions.filter((s) => SUB_T.test(s.text)).map((s) => s.id));
  const tBad = statesPace(/@\s*T\b|\bthreshold\b/i, '5:10–5:20').filter((id) => !subTIds.has(id));
  const cvBad = statesPace(/\bCV\b/, '4:55–5:05');
  check(subTBad.length === 0, 'every sub-T prescription reads 5:25–5:35', subTBad.join(', '));
  check(tBad.length === 0, 'every threshold prescription reads 5:10–5:20', tBad.join(', '));
  check(cvBad.length === 0, 'every CV prescription reads 4:55–5:05', cvBad.join(', '));

  const lateGames = games.filter((g) => g.date > '2026-09-20');
  check(lateGames.length === 0, 'no GAME in the final three weeks', lateGames.map((g) => g.date).join(',') || 'none');

  const badFixtures = games.filter((g) => !g.fixture?.kickoff || !g.fixture?.opponent || !g.fixture?.homeAway);
  check(badFixtures.length === 0, 'every GAME carries a complete fixture', `${games.length - badFixtures.length}/${games.length}`);

  // Structural invariants
  const shapeOk = incoming.every(
    (w) => w.days.length === 7 && eq(w.days.map((d) => d.d), DAY_ORDER) && w.days[0].date === w.dateStart,
  );
  check(shapeOk, '7 days per week, mon→sun, contiguous dates');

  const parsed = weeksSchema.safeParse([...kept, ...incoming]);
  check(parsed.success, 'full plan passes the zod week schema', parsed.success ? '' : JSON.stringify(parsed.error.issues[0]));

  const hrUnchanged = eq(zones.map((z) => z.hr), liveZones.map((z) => z.hr));
  check(hrUnchanged, 'HR bands untouched (runAnalysis buckets on them)');
  const namesUnchanged = eq(zones.map((z) => z.name), liveZones.map((z) => z.name));
  check(namesUnchanged, 'zone names and order unchanged');

  // Informational — hard sessions, lifts, and the km/target gap
  console.log('\nWeekly shape');
  const HARD = new Set(['LONG', 'WORKOUT', 'RACE', 'GAME']);
  for (const w of incoming) {
    const km = w.days.reduce((s, d) => s + (d.type === 'RACE' ? 0 : d.km ?? 0), 0);
    const delta = km - w.targetKm;
    const hard = w.days.filter((d) => HARD.has(d.type)).length;
    const lifts = w.days.filter((d) => d.gym).length;
    const pattern = w.days.map((d) => (d.type === 'GAME' ? 'GAME' : d.type.slice(0, 4))).join(' ');
    console.log(
      `  ${w.id.padEnd(4)} ${String(km).padStart(5)} km / ${String(w.targetKm).padEnd(3)} target ` +
        `(${delta >= 0 ? '+' : ''}${delta.toFixed(0).padStart(3)})  hard ${hard}  lifts ${lifts}   ${pattern}`,
    );
  }
  const overloaded = incoming.filter((w) => w.days.filter((d) => HARD.has(d.type)).length > 2 && !w.race);
  console.log(
    overloaded.length === 0
      ? '  → no week exceeds two hard sessions'
      : `  ⚠ weeks over two hard sessions: ${overloaded.map((w) => w.id).join(', ')}`,
  );
}

async function main() {
  console.log(`Stride plan restructure — ${APPLY ? 'APPLY' : 'DRY RUN'} (cutover ${CUTOVER})\n`);

  // 1. Owner
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) await fail('listUsers', listErr);
  const owner = list.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());
  if (!owner) await fail('owner lookup', `no user with email ${OWNER_EMAIL}`);
  const userId = owner!.id;
  console.log(`owner: ${OWNER_EMAIL} (${userId})`);

  // 2. Live plan
  const { data: live, error: planErr } = await admin
    .from('plans')
    .select('id, mode, weeks, zones, phases, generated_at')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (planErr) await fail('plan lookup', planErr);
  if (!live) await fail('plan lookup', 'no active plan — run `npm run seed:owner` first');
  const liveWeeks = live!.weeks as Week[];
  const liveZones = live!.zones as Zone[];
  console.log(`live plan: ${live!.id} — ${liveWeeks.length} weeks\n`);

  // 3. Split at the cutover
  const straddling = liveWeeks.filter((w) => !(w.dateEnd < CUTOVER) && !(w.dateStart >= CUTOVER));
  if (straddling.length) await fail('split', `weeks straddle the cutover: ${straddling.map((w) => w.id).join(', ')}`);

  const kept = liveWeeks.filter((w) => w.dateEnd < CUTOVER);
  const dropped = liveWeeks.filter((w) => w.dateStart >= CUTOVER);
  const incoming = WEEKS.filter((w) => w.dateStart >= CUTOVER);

  if (!eq(dropped.map((w) => w.id), incoming.map((w) => w.id))) {
    await fail('split', `week ids differ — live [${dropped.map((w) => w.id)}] vs new [${incoming.map((w) => w.id)}]`);
  }
  for (let i = 0; i < dropped.length; i++) {
    if (dropped[i].dateStart !== incoming[i].dateStart || dropped[i].dateEnd !== incoming[i].dateEnd) {
      await fail('split', `${dropped[i].id} date range moved`);
    }
  }

  // Soft: history in the DB is authoritative. Report divergence, never clobber it.
  console.log('Pre-cutover weeks (left untouched)');
  for (const w of kept) {
    const authored = WEEKS.find((x) => x.id === w.id);
    console.log(`  ${w.id.padEnd(5)} ${eq(w, authored) ? '✓ identical to constants' : '≠ DIFFERS from constants — DB kept as-is (real history)'}`);
  }

  const newWeeks = [...kept, ...incoming];
  verify(kept, incoming, ZONES, liveZones);

  // 4. Zones
  console.log('\nZone corrections');
  for (let i = 0; i < ZONES.length; i++) {
    const before = liveZones[i], after = ZONES[i];
    if (before?.pace !== after.pace) console.log(`  ${after.name.padEnd(16)} ${before?.pace} → ${after.pace}   (hr ${after.hr} unchanged)`);
  }

  // 5. Stale overrides — these layer on top of the plan at render time and would
  //    scramble the new layout if left pointing at the old one.
  console.log('\nStale override sweep');
  const blobPlan: { resource: string; value: Record<string, unknown> }[] = [];
  for (const resource of ['swaps', 'gymOverrides', 'exercise-overrides']) {
    const { data } = await admin.from('user_blobs').select('value').eq('user_id', userId).eq('resource', resource).maybeSingle();
    const value = (data?.value ?? null) as Record<string, unknown> | null;
    if (!value) { console.log(`  ${resource.padEnd(19)} absent`); continue; }
    const stale = Object.keys(value).filter((k) => (resource === 'swaps' ? EXPECTED_WEEK_IDS.includes(k) : k >= CUTOVER));
    console.log(`  ${resource.padEnd(19)} ${stale.length} stale key(s)${stale.length ? `: ${stale.join(', ')}` : ''}`);
    if (stale.length) {
      const cleaned = Object.fromEntries(Object.entries(value).filter(([k]) => !stale.includes(k)));
      blobPlan.push({ resource, value: cleaned });
    }
  }

  const completionKeys = incoming.flatMap((w) => w.days.map((d) => `${w.id}-${d.d}`));
  const { data: hits } = await admin.from('completions').select('key').eq('user_id', userId).in('key', completionKeys);
  const staleCompletions = (hits ?? []).map((r) => r.key as string);
  console.log(`  completions         ${staleCompletions.length} logged in the affected weeks${staleCompletions.length ? `: ${staleCompletions.join(', ')}` : ''}`);
  if (staleCompletions.length && !FORCE_COMPLETIONS) {
    console.log('    → these point at sessions that are about to change. Re-run with --force-completions to clear them.');
  }

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed — nothing written. Fix src/constants/plan.ts and re-run.`);
    process.exit(1);
  }
  if (!APPLY) {
    console.log('\nAll checks passed. Dry run — nothing written. Re-run with --apply to write.');
    return;
  }

  // 6. Write. Backup first (active:false is legal under the partial unique index).
  console.log('\nApplying…');
  const { data: existingBackups } = await admin.from('plans').select('id, weeks').eq('user_id', userId).eq('active', false);
  const already = (existingBackups ?? []).find((b) => eq(b.weeks, liveWeeks));
  let backupId = already?.id as string | undefined;
  if (backupId) {
    console.log(`  ✓ backup already exists: ${backupId}`);
  } else {
    // generated_at is copied, not defaulted: api/generate-plan.ts rate-limits on
    // count(plans where generated_at >= today), so a fresh timestamp here would
    // silently burn one of the owner's three daily generations.
    const { data: ins, error } = await admin
      .from('plans')
      .insert({
        user_id: userId, mode: live!.mode, weeks: liveWeeks, zones: liveZones,
        phases: live!.phases, active: false, generated_at: live!.generated_at,
      })
      .select('id')
      .single();
    if (error) await fail('backup insert', error);
    backupId = ins!.id as string;
    console.log(`  ✓ backup row: ${backupId}`);
  }

  const { error: updErr } = await admin.from('plans').update({ weeks: newWeeks, zones: ZONES }).eq('id', live!.id);
  if (updErr) await fail('plan update', updErr);
  console.log(`  ✓ plan updated in place (${newWeeks.length} weeks, active untouched)`);

  const now = Date.now();
  for (const { resource, value } of blobPlan) {
    const { error } = await admin
      .from('user_blobs')
      .upsert({ user_id: userId, resource, value, updated_at: now }, { onConflict: 'user_id,resource' });
    if (error) await fail(`blob ${resource}`, error);
    console.log(`  ✓ ${resource}: stale keys removed`);
  }

  if (staleCompletions.length && FORCE_COMPLETIONS) {
    const { error } = await admin.from('completions').delete().eq('user_id', userId).in('key', staleCompletions);
    if (error) await fail('completions delete', error);
    console.log(`  ✓ completions: ${staleCompletions.length} cleared`);
  }

  // 7. Re-verify against what is actually stored
  console.log('\nRe-reading from the database…');
  const { data: after, error: afterErr } = await admin
    .from('plans').select('weeks, zones').eq('id', live!.id).single();
  if (afterErr) await fail('re-read', afterErr);
  const storedWeeks = after!.weeks as Week[];
  failures = 0;
  verify(
    storedWeeks.filter((w) => w.dateEnd < CUTOVER),
    storedWeeks.filter((w) => w.dateStart >= CUTOVER),
    after!.zones as Zone[],
    liveZones,
  );

  console.log(
    failures === 0
      ? '\nDone. Hard-reload the PWA on the phone — the plan is fetched once on mount and blobs sync once per session.'
      : `\n⚠ ${failures} check(s) failed AFTER writing. Roll back with the SQL below.`,
  );
  console.log('\nRollback (paste into the Supabase SQL editor):');
  console.log(`  update plans p set weeks = b.weeks, zones = b.zones`);
  console.log(`  from plans b where p.id = '${live!.id}' and b.id = '${backupId}';`);
  if (failures > 0) process.exit(1);
}

void main();
