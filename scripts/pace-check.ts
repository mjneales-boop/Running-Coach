// Runnable sanity check for the deterministic pace calculator.
//   npx tsx scripts/pace-check.ts
// Prints the zone table for representative athletes and asserts the key
// invariants (ordering, no absurd easy paces). Exits non-zero on any failure.

import { computeZones, parseTimeToSeconds, type ComputedZones } from '../lib/paceCalc.ts';

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.log(`  ✗ FAIL: ${label}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

/** First number (sec/km) out of a "m:ss" or "m:ss–m:ss" pace string. */
function firstPaceSec(pace: string): number {
  const [m, s] = pace.split('–')[0].split(':').map(Number);
  return m * 60 + s;
}

function show(name: string, z: ComputedZones) {
  console.log(`\n${name}  [basis=${z.basis}, T=${Math.floor(z.thresholdPaceSecPerKm / 60)}:${String(z.thresholdPaceSecPerKm % 60).padStart(2, '0')}/km]`);
  for (const zone of z.zones) {
    console.log(`  ${zone.name.padEnd(16)} ${zone.pace.padEnd(13)} hr ${zone.hr}${zone.hero ? '  ★' : ''}`);
  }
  // Invariant: zones must run slowest → fastest (Recovery slowest, VO2 fastest).
  const secs = z.zones.map((zn) => firstPaceSec(zn.pace));
  let mono = true;
  for (let i = 1; i < secs.length; i++) if (secs[i] > secs[i - 1]) mono = false;
  check(`${name}: zones ordered slowest→fastest`, mono);
  return z;
}

// --- time parsing ---
console.log('Time parsing');
check('44:30 → 2670s', parseTimeToSeconds('44:30') === 2670);
check('3:59:59 → 14399s', parseTimeToSeconds('3:59:59') === 14399);
check('garbage → null', parseTimeToSeconds('abc') === null);

// --- the exact case the user hit: seasoned 50 km/wk, no race time ---
const seasoned = show('Seasoned, 50 km/wk, no race time', computeZones({
  experience: 'advanced', weeklyKm: 50, age: 34,
}));
check('seasoned easy pace faster than 6:00/km (the original bug)', firstPaceSec(seasoned.zones[1].pace) < 360);

// --- race-time anchored: 44:30 10K ---
const race = show('44:30 10K runner', computeZones({
  raceTimes: [{ distance: '10K', time: '44:30' }], age: 34,
}));
check('44:30 10K → threshold ~4:20–4:45/km', race.thresholdPaceSecPerKm > 255 && race.thresholdPaceSecPerKm < 290);

// --- beginner low volume: should be genuinely easy, not absurd ---
const beginner = show('Beginner, 15 km/wk, no race time', computeZones({
  experience: 'beginner', weeklyKm: 15, age: 40,
}));
check('beginner easy pace between 6:30 and 8:00/km', firstPaceSec(beginner.zones[1].pace) > 390 && firstPaceSec(beginner.zones[1].pace) < 480);

// --- race time beats the estimate (sharper signal) ---
const both = computeZones({ experience: 'beginner', weeklyKm: 15, raceTimes: [{ distance: '5K', time: '19:30' }] });
check('a fast 5K overrides a beginner estimate', both.basis === 'race-times' && both.thresholdPaceSecPerKm < 270);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
