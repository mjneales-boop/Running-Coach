import { buildHrEfficiency, zoneForActualPace, zonePaceBand, fmtPaceMin } from '../src/lib/hrEfficiency';
import type { StravaActivity, Zone } from '../src/types';

const zones: Zone[] = [
  { name: 'Recovery', pace: '7:00–7:40', hr: '<140' },
  { name: 'Easy', pace: '6:30–7:00', hr: '140–150' },
  { name: 'Steady', pace: '6:00–6:20', hr: '150–160' },
  { name: 'Marathon', pace: '5:41', hr: '160–170' },
  { name: 'Threshold', pace: '5:05–5:20', hr: '171–180' },
];

let fail = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};

eq('band parses range', zonePaceBand('6:30–7:00'), { lo: 6.5, hi: 7 });
eq('band parses single', zonePaceBand('5:41'), { lo: 5.6833333333333336, hi: 5.6833333333333336 });
eq('band rejects mixed', zonePaceBand('easy→5:41'), null);

eq('in-band pace -> Easy', zoneForActualPace(6.75, zones)?.name, 'Easy');
// 6:25 falls in the gap between Steady (—6:20) and Easy (6:30—); it is 5s from Easy's
// edge and 5.2s from Steady's, so it snaps to Easy. 6:22 leans the other way.
eq('gap pace 6:25 -> nearest is Easy', zoneForActualPace(6.42, zones)?.name, 'Easy');
eq('gap pace 6:22 -> nearest is Steady', zoneForActualPace(6.37, zones)?.name, 'Steady');
eq('MP exact -> Marathon', zoneForActualPace(5.68, zones)?.name, 'Marathon');
eq('sprint 3:30 -> unmatched', zoneForActualPace(3.5, zones)?.name, undefined);

// 9 easy runs over 90 days: pace held ~6:45, HR drifting 152 -> 142 (getting fitter).
const acts: StravaActivity[] = [152, 151, 149, 148, 147, 145, 144, 143, 142].map((hr, i) => ({
  id: String(i), name: `run ${i}`,
  date: new Date(Date.UTC(2026, 3, 25 + i * 10)).toISOString().slice(0, 10),
  sportType: 'Run', distanceKm: 8, movingTimeSec: 3240, avgPaceMinKm: 6.75, avgHR: hr,
}));
// One run with no HR strap, and one ancient run outside the window — both must be ignored.
acts.push({ id: 'x', name: 'no strap', date: '2026-07-10', sportType: 'Run', distanceKm: 5, movingTimeSec: 2000, avgPaceMinKm: 6.7 });
acts.push({ id: 'y', name: 'ancient', date: '2025-01-01', sportType: 'Run', distanceKm: 5, movingTimeSec: 2000, avgPaceMinKm: 6.7, avgHR: 190 });

const out = buildHrEfficiency(acts, zones, 90, new Date('2026-07-18T12:00:00Z'));
console.log('\nzones found:', out.map((z) => `${z.zone}(${z.points.length})`).join(', '));
eq('single Easy bucket', out.length, 1);
eq('9 points (no-HR + ancient dropped)', out[0].points.length, 9);
eq('avg HR', out[0].avgHR, 147);
eq('HR trend negative (fitter)', out[0].hrDelta! < 0, true);
console.log(`hrDelta=${out[0].hrDelta} bpm, avg pace ${fmtPaceMin(out[0].avgPaceMinKm)}/km`);

eq('single point is not a trend', buildHrEfficiency([acts[0]], zones, 90, new Date('2026-07-18T12:00:00Z')).length, 0);
eq('fmtPaceMin rounds 59.6s', fmtPaceMin(6.999), '7:00');

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
