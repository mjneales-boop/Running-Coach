import { describe, expect, it } from 'vitest';
import {
  buildStrengthIndex,
  committedSets,
  compareToLastSession,
  consistencySummary,
  currentStreak,
  durabilitySummary,
  isCommitted,
  isPR,
  lastSessionSets,
  lowerLegInsurance,
  musclesFor,
  primaryMuscle,
  sessionDurationMin,
  sessionSetCount,
  sessionTonnage,
  setDelta,
  setTonnage,
  strengthVsVolume,
  tonnageByMuscleGroup,
  weeklyGymAdherence,
  weeklyTonnageSeries,
} from '../strength';
import { REST_FALLBACK_SEC, WORKOUTS, restDefaultFor } from '../../constants/workouts';
import { completeAll, log, set, store, week } from './fixtures';

const T0 = new Date('2026-08-24T18:00:00').getTime();
const min = (n: number) => T0 + n * 60_000;

// ---------------------------------------------------------------------------

describe('muscle tagging', () => {
  it('tags every exercise in every workout template', () => {
    const untagged: string[] = [];
    for (const workout of Object.values(WORKOUTS)) {
      const all = [...workout.blocks.flatMap((b) => b.exercises), ...workout.alternatives];
      for (const ex of all) if (!ex.muscles?.length) untagged.push(`${workout.id}/${ex.id}`);
    }
    expect(untagged).toEqual([]);
  });

  it('falls back to core for an unknown exercise instead of crashing', () => {
    expect(musclesFor('not-a-real-exercise')).toEqual(['core']);
    expect(primaryMuscle('not-a-real-exercise')).toBe('core');
  });

  it('attributes a multi-muscle lift to its primary only', () => {
    expect(musclesFor('face-pull')).toEqual(['back', 'shoulders']);
    expect(primaryMuscle('face-pull')).toBe('back');
  });
});

describe('rest defaults', () => {
  it('gives upper-body days 90 seconds', () => {
    expect(restDefaultFor('chestback')).toBe(90);
    expect(restDefaultFor('shouldersarms')).toBe(90);
  });

  it('gives leg day 2:30', () => {
    expect(restDefaultFor('legs')).toBe(150);
  });

  it('falls back rather than returning zero for an unknown or missing workout', () => {
    expect(restDefaultFor('unknown')).toBe(REST_FALLBACK_SEC);
    expect(restDefaultFor(undefined)).toBe(REST_FALLBACK_SEC);
  });

  it('has a default for every workout template', () => {
    for (const id of Object.keys(WORKOUTS)) expect(restDefaultFor(id)).toBeGreaterThan(0);
  });
});

describe('isCommitted', () => {
  it('accepts a modern set with committedAt', () => {
    expect(isCommitted({ weight: 60, reps: 10, committedAt: T0 })).toBe(true);
  });

  it('accepts a legacy set that has values but no committedAt', () => {
    expect(isCommitted({ weight: 60, reps: 10 })).toBe(true);
  });

  it('accepts a bodyweight set with reps only, and a check set with done', () => {
    expect(isCommitted({ reps: 12 })).toBe(true);
    expect(isCommitted({ done: true })).toBe(true);
  });

  it('rejects an empty, undefined or ghost row', () => {
    expect(isCommitted({})).toBe(false);
    expect(isCommitted(undefined)).toBe(false);
    expect(isCommitted(null)).toBe(false);
  });
});

describe('setTonnage', () => {
  it('is weight × reps for kg exercises', () => {
    expect(setTonnage('db-bench', set(30, 10, T0))).toBe(300);
  });

  it('is zero for bodyweight, and zero for a partial set', () => {
    expect(setTonnage('pullups', set(undefined, 10, T0))).toBe(0);
    expect(setTonnage('db-bench', set(30, undefined, T0))).toBe(0);
  });

  it('is zero for an unknown exercise rather than throwing', () => {
    expect(setTonnage('mystery-lift', set(30, 10, T0))).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('buildStrengthIndex', () => {
  const strength = store(
    log('2026-08-10', 'chestback', { 'db-bench': [set(30, 10, T0), set(30, 9, T0)] }),
    log('2026-08-17', 'chestback', { 'db-bench': [set(32.5, 10, T0), set(32.5, 8, T0)] }),
    log('2026-08-24', 'chestback', { 'db-bench': [set(32.5, 11, T0)] }),
  );
  const index = buildStrengthIndex(strength);

  it('sorts logs ascending by date', () => {
    expect(index.logs.map((l) => l.date)).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
  });

  it('builds per-exercise history in date order with top set and tonnage', () => {
    const history = index.byExercise.get('db-bench')!;
    expect(history.map((h) => h.date)).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
    expect(history[0].tonnage).toBe(30 * 10 + 30 * 9);
    expect(history[1].topSet).toEqual(set(32.5, 10, T0));
  });

  it('resolves the all-time PR to the earliest date that reached it', () => {
    // 32.5×11 on the 24th beats 32.5×10 on the 17th: heavier ties break on reps.
    expect(index.prByExercise.get('db-bench')).toEqual({ set: set(32.5, 11, T0), date: '2026-08-24' });
  });

  it('ignores exercises whose sets are all uncommitted', () => {
    const empty = buildStrengthIndex(store(log('2026-08-10', 'chestback', { 'db-bench': [{}, {}] })));
    expect(empty.byExercise.has('db-bench')).toBe(false);
  });

  it('survives an empty store', () => {
    const empty = buildStrengthIndex({});
    expect(empty.logs).toEqual([]);
    expect(empty.prByExercise.size).toBe(0);
  });

  it('filters out malformed entries without throwing', () => {
    const messy = buildStrengthIndex({
      a: undefined as unknown as never,
      b: log('2026-08-10', 'chestback', {}),
    });
    expect(messy.logs.map((l) => l.date)).toEqual(['2026-08-10']);
  });
});

describe('lastSessionSets', () => {
  const index = buildStrengthIndex(
    store(
      log('2026-08-10', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
      log('2026-08-17', 'chestback', { 'db-bench': [set(32.5, 10, T0), set(32.5, 8, T0)] }),
      log('2026-08-24', 'chestback', { 'db-bench': [set(35, 6, T0)] }),
    ),
  );

  it('returns the most recent session strictly before the date', () => {
    expect(lastSessionSets(index, 'db-bench', '2026-08-24')).toEqual([set(32.5, 10, T0), set(32.5, 8, T0)]);
  });

  it('excludes today, so ghost prefill never mirrors what was just logged', () => {
    const sets = lastSessionSets(index, 'db-bench', '2026-08-24');
    expect(sets.some((s) => s.weight === 35)).toBe(false);
  });

  it('returns empty for an exercise with no history', () => {
    expect(lastSessionSets(index, 'pec-deck', '2026-08-24')).toEqual([]);
    expect(lastSessionSets(index, 'db-bench', '2026-01-01')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('session metrics', () => {
  const session = log('2026-08-24', 'chestback', {
    'db-bench': [set(30, 10, min(0)), set(30, 10, min(3))],
    pullups: [set(undefined, 8, min(6))],           // bodyweight: sets count, tonnage does not
    'cable-crunch': [set(20, 15, min(9)), {}],      // trailing uncommitted row
  });

  it('sums tonnage over committed kg sets only', () => {
    expect(sessionTonnage(session)).toBe(30 * 10 * 2 + 20 * 15);
  });

  it('counts bodyweight sets toward the set total but not tonnage', () => {
    expect(sessionSetCount(session).committed).toBe(4);
  });

  it('reads planned sets from the workout template', () => {
    const planned = WORKOUTS.chestback.blocks
      .flatMap((b) => b.exercises)
      .reduce((s, e) => s + e.sets, 0);
    expect(sessionSetCount(session).planned).toBe(planned);
  });

  it('honours an explicit exercise list for swapped sessions', () => {
    const exercises = [WORKOUTS.chestback.blocks[0].exercises[0]];
    expect(sessionSetCount(session, exercises).planned).toBe(4);
  });

  it('measures duration from first to last commit', () => {
    expect(sessionDurationMin(session)).toBe(9);
  });

  it('returns undefined duration for a legacy log with no timestamps', () => {
    expect(sessionDurationMin(log('2026-08-24', 'chestback', { 'db-bench': [set(30, 10), set(30, 10)] })))
      .toBeUndefined();
  });

  it('returns zero tonnage and no duration for a missing log', () => {
    expect(sessionTonnage(undefined)).toBe(0);
    expect(sessionDurationMin(undefined)).toBeUndefined();
    expect(sessionSetCount(undefined)).toEqual({ committed: 0, planned: 0 });
  });

  it('allows committed to exceed planned when extra sets are added', () => {
    const extra = log('2026-08-24', 'chestback', {
      'db-bench': [set(30, 10, T0), set(30, 10, T0), set(30, 10, T0), set(30, 10, T0), set(30, 8, T0)],
    });
    expect(sessionSetCount(extra, [WORKOUTS.chestback.blocks[0].exercises[0]])).toEqual({
      committed: 5,
      planned: 4,
    });
  });
});

describe('compareToLastSession', () => {
  const strength = store(
    log('2026-08-17', 'chestback', { 'db-bench': [set(30, 10, T0)] }),   // 300
    log('2026-08-24', 'chestback', { 'db-bench': [set(30, 11, T0)] }),   // 330
    log('2026-08-20', 'legs', { squat: [set(80, 5, T0)] }),
  );
  const index = buildStrengthIndex(strength);

  it('reports the tonnage delta and percentage against the previous same-workout session', () => {
    expect(compareToLastSession(index, 'chestback', '2026-08-24')).toEqual({ tonnageDelta: 30, pct: 10 });
  });

  it('returns null when there is no earlier session of that workout', () => {
    expect(compareToLastSession(index, 'chestback', '2026-08-17')).toBeNull();
    expect(compareToLastSession(index, 'legs', '2026-08-20')).toBeNull();
  });

  it('returns null for a date with no session', () => {
    expect(compareToLastSession(index, 'chestback', '2026-08-31')).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('weeklyGymAdherence', () => {
  const weeks = [
    week('1', '2026-08-03', ['tue', 'thu']),
    week('2', '2026-08-10', ['tue', 'thu']),
    week('3', '2026-08-17', ['tue']),          // cutback: one gym day
    week('4', '2026-08-24', ['tue', 'thu']),   // in flight
    week('5', '2026-08-31', ['tue', 'thu']),   // future
  ];
  const today = '2026-08-26';

  const strength = store(
    log('2026-08-04', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
    log('2026-08-06', 'legs', { squat: [set(80, 5, T0)] }),
    log('2026-08-11', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
    // 2026-08-13 stood down for recovery
    log('2026-08-13', 'legs', {}, { skippedAt: '2026-08-13T09:00:00Z', skipReason: 'recovery' }),
    log('2026-08-18', 'chestback', { 'db-bench': [set(32.5, 10, T0)] }),
    log('2026-08-25', 'chestback', { 'db-bench': [set(32.5, 10, T0)] }),
  );

  const adherence = weeklyGymAdherence(weeks, strength, today);

  it('marks a fully honoured week complete', () => {
    expect(adherence[0]).toMatchObject({ planned: 2, completed: 2, skipped: 0, status: 'complete' });
  });

  it('treats a recovery skip as honoured, not missed', () => {
    expect(adherence[1]).toMatchObject({ planned: 2, completed: 1, skipped: 1, status: 'skipped' });
  });

  it('is plan-relative: a cutback week with one gym day is satisfied by one session', () => {
    expect(adherence[2]).toMatchObject({ planned: 1, completed: 1, status: 'complete' });
  });

  it('never marks the in-flight week missed', () => {
    expect(adherence[3]).toMatchObject({ isCurrent: true, completed: 1, status: 'partial' });
  });

  it('marks weeks that have not started as future', () => {
    expect(adherence[4].status).toBe('future');
  });

  it('does not count a run marked done as evidence the gym session happened', () => {
    // A gym day is usually an easy-run day too. Ticking the run done says nothing
    // about the lifting, and must never inflate the streak.
    expect(weeklyGymAdherence([week('9', '2026-08-03', ['tue'])], {}, today)[0].status).toBe('missed');
  });

  it('treats a week with no scheduled gym work as vacuously complete', () => {
    expect(weeklyGymAdherence([week('9', '2026-08-03', [])], {}, today)[0].status).toBe('complete');
  });
});

describe('currentStreak', () => {
  const today = '2026-08-26';
  const build = (weeks: ReturnType<typeof week>[], strength: Record<string, never> | ReturnType<typeof store>) =>
    currentStreak(weeklyGymAdherence(weeks, strength, today));

  const done = (date: string) => log(date, 'chestback', { 'db-bench': [set(30, 10, T0)] });
  const skipped = (date: string) =>
    log(date, 'chestback', {}, { skippedAt: `${date}T09:00:00Z`, skipReason: 'recovery' as const });

  it('counts consecutive honoured weeks', () => {
    const weeks = [week('1', '2026-08-03', ['tue']), week('2', '2026-08-10', ['tue']), week('3', '2026-08-17', ['tue'])];
    expect(build(weeks, store(done('2026-08-04'), done('2026-08-11'), done('2026-08-18')))).toBe(3);
  });

  it('does not break on a week stood down for recovery', () => {
    const weeks = [week('1', '2026-08-03', ['tue']), week('2', '2026-08-10', ['tue']), week('3', '2026-08-17', ['tue'])];
    expect(build(weeks, store(done('2026-08-04'), skipped('2026-08-11'), done('2026-08-18')))).toBe(3);
  });

  it('breaks on a missed week', () => {
    const weeks = [week('1', '2026-08-03', ['tue']), week('2', '2026-08-10', ['tue']), week('3', '2026-08-17', ['tue'])];
    expect(build(weeks, store(done('2026-08-04'), done('2026-08-18')))).toBe(1);
  });

  it('passes over an unfinished current week without breaking the streak', () => {
    const weeks = [
      week('1', '2026-08-10', ['tue']),
      week('2', '2026-08-17', ['tue']),
      week('3', '2026-08-24', ['tue', 'thu']), // in flight, nothing logged
    ];
    expect(build(weeks, store(done('2026-08-11'), done('2026-08-18')))).toBe(2);
  });

  it('extends the streak once the current week is itself complete', () => {
    const weeks = [week('1', '2026-08-17', ['tue']), week('2', '2026-08-24', ['tue'])];
    expect(build(weeks, store(done('2026-08-18'), done('2026-08-25')))).toBe(2);
  });

  it('is zero with no history', () => {
    expect(build([week('1', '2026-08-03', ['tue'])], {})).toBe(0);
    expect(currentStreak([])).toBe(0);
  });
});

describe('consistencySummary', () => {
  it('counts skips as honoured and excludes future weeks from the denominator', () => {
    const weeks = [
      week('1', '2026-08-03', ['tue', 'thu']),
      week('2', '2026-08-10', ['tue', 'thu']),
      week('3', '2026-08-31', ['tue', 'thu']), // future
    ];
    const strength = store(
      log('2026-08-04', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
      log('2026-08-06', 'legs', { squat: [set(80, 5, T0)] }),
      log('2026-08-11', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
      log('2026-08-13', 'legs', {}, { skippedAt: '2026-08-13T09:00:00Z', skipReason: 'recovery' }),
    );
    const summary = consistencySummary(weeklyGymAdherence(weeks, strength, '2026-08-26'));
    expect(summary).toMatchObject({ sessionsDone: 4, sessionsPlanned: 4, pctOfPlanned: 100 });
  });
});

// ---------------------------------------------------------------------------

describe('tonnageByMuscleGroup', () => {
  const strength = store(
    log('2026-08-10', 'chestback', {
      'db-bench': [set(30, 10, T0)],       // chest 300
      'lat-pulldown': [set(50, 10, T0)],   // back 500
      'face-pull': [set(20, 15, T0)],      // primary back → 300, never split
      'cable-crunch': [set(20, 15, T0)],   // core 300
      pullups: [set(undefined, 8, T0)],    // bodyweight → 0
    }),
    log('2026-09-01', 'chestback', { 'db-bench': [set(35, 10, T0)] }), // outside range
  );

  const totals = tonnageByMuscleGroup(strength, '2026-08-01', '2026-08-31');

  it('buckets tonnage onto the primary muscle', () => {
    expect(totals.chest).toBe(300);
    expect(totals.back).toBe(800);
    expect(totals.core).toBe(300);
  });

  it('never double-counts a two-muscle lift', () => {
    expect(totals.shoulders).toBe(0);
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    expect(sum).toBe(sessionTonnage(strength['2026-08-10']));
  });

  it('respects the inclusive date range', () => {
    expect(tonnageByMuscleGroup(strength, '2026-08-01', '2026-09-30').chest).toBe(650);
  });

  it('returns a zeroed record for an empty store', () => {
    expect(tonnageByMuscleGroup({}, '2026-08-01', '2026-08-31').legs).toBe(0);
  });
});

describe('weeklyTonnageSeries', () => {
  const weeks = [week('1', '2026-08-17', ['tue']), week('2', '2026-08-24', ['tue'])];
  const strength = store(
    log('2026-08-18', 'chestback', {
      'db-bench': [set(30, 10, T0)],
      'lat-pulldown': [set(50, 10, T0)],
      pullups: [set(undefined, 8, T0)],
    }),
    log('2026-08-25', 'chestback', { 'db-bench': [set(32.5, 10, T0)] }),
  );

  it('buckets tonnage into plan weeks and flags the current one', () => {
    const series = weeklyTonnageSeries(strength, weeks, undefined, '2026-08-26');
    expect(series[0]).toMatchObject({ tonnage: 800, sets: 3, isCurrent: false });
    expect(series[1]).toMatchObject({ tonnage: 325, sets: 1, isCurrent: true });
  });

  it('counts a zero-tonnage bodyweight set in the set total', () => {
    const series = weeklyTonnageSeries(strength, weeks, undefined, '2026-08-26');
    expect(series[0].sets).toBe(3);
    expect(series[0].tonnage).toBe(800); // pullups contributed sets but no kg
  });

  it('filters to a single muscle group', () => {
    const chest = weeklyTonnageSeries(strength, weeks, 'chest', '2026-08-26');
    expect(chest[0].tonnage).toBe(300);
    expect(chest[0].sets).toBe(1);
  });

  it('marks weeks that have not started as future', () => {
    const series = weeklyTonnageSeries(strength, [week('3', '2026-09-07', ['tue'])], undefined, '2026-08-26');
    expect(series[0]).toMatchObject({ isFuture: true, tonnage: 0 });
  });
});

// ---------------------------------------------------------------------------

describe('strengthVsVolume', () => {
  const weeks = [
    week('1', '2026-08-03', ['tue', 'thu'], { km: 10 }), // full gym, 70 km
    week('2', '2026-08-10', ['tue', 'thu'], { km: 6 }),  // one gym only, 42 km
    week('3', '2026-08-31', ['tue'], { km: 10 }),        // future
  ];
  const completion = completeAll(weeks);
  const strength = store(
    log('2026-08-04', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
    log('2026-08-06', 'legs', { squat: [set(80, 5, T0)] }),
    log('2026-08-11', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
  );
  const points = strengthVsVolume(weeks, strength, completion, '2026-08-26');

  it('pairs weekly km with gym sessions honoured', () => {
    expect(points[0]).toMatchObject({ km: 70, gymPlanned: 2, gymDone: 2, fullGym: true });
    expect(points[1]).toMatchObject({ km: 42, gymPlanned: 2, gymDone: 1, fullGym: false });
  });

  it('reports zero km for future weeks rather than their target', () => {
    expect(points[2]).toMatchObject({ isFuture: true, km: 0 });
  });

  it('summarises km with and without full gym weeks, without any correlation', () => {
    const summary = durabilitySummary(points);
    expect(summary).toEqual({
      weeksWithFullGym: 1,
      weeksAssessed: 2,
      avgKmWithFullGym: 70,
      avgKmWithoutFullGym: 42,
    });
  });

  it('returns zeros rather than NaN when a bucket is empty', () => {
    expect(durabilitySummary([])).toEqual({
      weeksWithFullGym: 0,
      weeksAssessed: 0,
      avgKmWithFullGym: 0,
      avgKmWithoutFullGym: 0,
    });
  });
});

describe('lowerLegInsurance', () => {
  const weeks = [
    week('1', '2026-08-03', ['tue']),
    week('2', '2026-08-10', ['tue']),
    week('3', '2026-08-31', ['tue']), // future
  ];

  it('counts settled weeks containing at least one committed calf/tibialis set', () => {
    const strength = store(
      log('2026-08-04', 'legs', { 'calf-raise': [set(40, 8, T0)] }),
      log('2026-08-11', 'legs', { squat: [set(80, 5, T0)] }), // no lower-leg work
    );
    expect(lowerLegInsurance(weeks, strength, '2026-08-26')).toEqual({ weeks: 1, total: 2 });
  });

  it('ignores uncommitted lower-leg rows', () => {
    const strength = store(log('2026-08-04', 'legs', { 'calf-raise': [{}] }));
    expect(lowerLegInsurance(weeks, strength, '2026-08-26')).toEqual({ weeks: 0, total: 2 });
  });
});

// ---------------------------------------------------------------------------

describe('setDelta', () => {
  it('reports a heavier set as up', () => {
    expect(setDelta(set(32.5, 10, T0), set(30, 10, T0))).toMatchObject({ kind: 'up', label: '+2.5 KG' });
  });

  it('reports a lighter set as down — never an error state', () => {
    const d = setDelta(set(27.5, 10, T0), set(30, 10, T0));
    expect(d.kind).toBe('down');
    expect(d.label).toBe('−2.5 KG');
  });

  it('reports an identical set as matched', () => {
    expect(setDelta(set(30, 10, T0), set(30, 10, T0))).toMatchObject({ kind: 'matched', label: '= MATCHED' });
  });

  it('falls back to reps when the weight is unchanged', () => {
    expect(setDelta(set(30, 12, T0), set(30, 10, T0))).toMatchObject({ kind: 'up', label: '+2 REPS' });
  });

  it('uses reps alone for bodyweight work', () => {
    expect(setDelta(set(undefined, 9, T0), set(undefined, 8, T0))).toMatchObject({ kind: 'up', label: '+1 REP' });
  });

  it('reports first time when there is nothing to compare against', () => {
    expect(setDelta(set(30, 10, T0), undefined)).toMatchObject({ kind: 'first', label: 'FIRST TIME' });
    expect(setDelta(set(30, 10, T0), {})).toMatchObject({ kind: 'first' });
  });

  it('avoids floating-point noise on plate weights', () => {
    expect(setDelta(set(68.2, 10, T0), set(78, 10, T0)).weightDelta).toBe(-9.8);
  });
});

describe('isPR', () => {
  const strength = store(
    log('2026-08-10', 'chestback', { 'db-bench': [set(30, 10, T0)] }),
    log('2026-08-17', 'chestback', { 'db-bench': [set(32.5, 10, T0)] }),
  );
  const index = buildStrengthIndex(strength);

  it('is true for a set heavier than anything before it', () => {
    expect(isPR(index, 'db-bench', set(35, 8, T0), '2026-08-24')).toBe(true);
  });

  it('is false for a set that does not beat the standing best', () => {
    expect(isPR(index, 'db-bench', set(30, 10, T0), '2026-08-24')).toBe(false);
    expect(isPR(index, 'db-bench', set(32.5, 10, T0), '2026-08-24')).toBe(false);
  });

  it('breaks a weight tie on reps', () => {
    expect(isPR(index, 'db-bench', set(32.5, 11, T0), '2026-08-24')).toBe(true);
  });

  it('does not disqualify a set already written into the index', () => {
    // The realistic case: commit → store writes → index rebuilds → UI asks "was that a PR?"
    const after = buildStrengthIndex(
      store(...index.logs, log('2026-08-24', 'chestback', { 'db-bench': [set(35, 8, T0)] })),
    );
    expect(isPR(after, 'db-bench', set(35, 8, T0), '2026-08-24')).toBe(true);
  });

  it('registers two PRs within the same session', () => {
    const after = buildStrengthIndex(
      store(...index.logs, log('2026-08-24', 'chestback', { 'db-bench': [set(35, 8, T0), set(37.5, 6, T0)] })),
    );
    expect(isPR(after, 'db-bench', set(35, 8, T0), '2026-08-24')).toBe(true);
    expect(isPR(after, 'db-bench', set(37.5, 6, T0), '2026-08-24')).toBe(true);
  });

  it('treats the first ever set of an exercise as a PR', () => {
    expect(isPR(index, 'pec-deck', set(40, 10, T0), '2026-08-24')).toBe(true);
  });

  it('rejects an uncommitted ghost row', () => {
    expect(isPR(index, 'db-bench', {}, '2026-08-24')).toBe(false);
  });

  it('compares against the whole index when no date is given', () => {
    expect(isPR(index, 'db-bench', set(35, 8, T0))).toBe(true);
    expect(isPR(index, 'db-bench', set(30, 10, T0))).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('legacy logs', () => {
  // Every stored log must keep rendering without migration.
  const legacy = store(
    log('2026-07-06', 'chestback', { 'db-bench': [{ weight: 30, reps: 10 }, { weight: 30, reps: 9 }] }),
    log('2026-07-13', 'chestback', { 'db-bench': [{ weight: 32.5, reps: 10 }] }),
  );
  const index = buildStrengthIndex(legacy);

  it('indexes sets that have no committedAt', () => {
    expect(index.byExercise.get('db-bench')).toHaveLength(2);
    expect(index.prByExercise.get('db-bench')?.date).toBe('2026-07-13');
  });

  it('computes tonnage and set counts from them', () => {
    expect(sessionTonnage(legacy['2026-07-06'])).toBe(570);
    expect(committedSets(legacy['2026-07-06'], 'db-bench')).toHaveLength(2);
  });

  it('still supports ghost prefill from them', () => {
    expect(lastSessionSets(index, 'db-bench', '2026-07-13')).toEqual([
      { weight: 30, reps: 10 },
      { weight: 30, reps: 9 },
    ]);
  });

  it('treats them as committed at the log date for adherence', () => {
    const adherence = weeklyGymAdherence([week('1', '2026-07-06', ['mon'])], legacy, '2026-08-26');
    expect(adherence[0].status).toBe('complete');
  });
});
