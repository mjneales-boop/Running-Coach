import { describe, it, expect } from 'vitest';
import { parseEasyRange, easyKmWindow, buildPaceProgression } from '../logic';
import type { Zone, Week, StravaActivity, StravaSplit } from '../../types';

const zones = [
  { name: 'Recovery', pace: '7:20–7:50', hr: '<141' },
  { name: 'Easy', pace: '6:35–7:05', hr: '141-156' },
  { name: 'Steady', pace: '6:00–6:15', hr: '156-165' },
  { name: 'Marathon (MP)', pace: '5:41', hr: '162-171' },
] as unknown as Zone[];

describe('parseEasyRange', () => {
  it('parses a valid ascending range', () => {
    expect(parseEasyRange('6:00', '6:20')).toEqual({ fast: 6, slow: 6 + 20 / 60 });
  });

  // Regression: settings blobs written before these fields existed return undefined,
  // and calling .trim() on that crashed the whole Progress screen to a blank page.
  it('returns null for missing values instead of throwing', () => {
    expect(() => parseEasyRange(undefined, undefined)).not.toThrow();
    expect(parseEasyRange(undefined, undefined)).toBeNull();
    expect(parseEasyRange(null, '6:20')).toBeNull();
    expect(parseEasyRange('6:00', undefined)).toBeNull();
  });

  it('rejects malformed, reversed and out-of-range input', () => {
    expect(parseEasyRange('6:00', '')).toBeNull();
    expect(parseEasyRange('abc', '6:20')).toBeNull();
    expect(parseEasyRange('6:20', '6:00')).toBeNull();  // reversed
    expect(parseEasyRange('6:00', '6:00')).toBeNull();  // zero width
    expect(parseEasyRange('6:99', '7:00')).toBeNull();  // invalid seconds
    expect(parseEasyRange('0:30', '1:00')).toBeNull();  // implausibly fast
  });
});

describe('easyKmWindow', () => {
  it('extends halfway to the neighbouring zones, never into them', () => {
    const w = easyKmWindow(zones);
    expect(w.fast).toBeCloseTo((6.25 + 6 + 35 / 60) / 2, 5); // midpoint of Steady hi / Easy lo
    expect(w.slow).toBeCloseTo((7 + 5 / 60 + (7 + 20 / 60)) / 2, 5);
    // The whole point: marathon pace must never count as easy running.
    expect(w.fast).toBeGreaterThan(5 + 41 / 60);
  });
});

const weeks = [
  { id: 'w1', num: '1', dateStart: '2026-01-05', dateEnd: '2026-01-11' },
] as unknown as Week[];

function run(id: string, pace: number, km: number, hr?: number): StravaActivity {
  return {
    id, name: id, date: '2026-01-07', sportType: 'Run',
    distanceKm: km, movingTimeSec: pace * 60 * km, avgPaceMinKm: pace,
    ...(hr != null && { avgHR: hr }),
  };
}
const splitsOf = (pace: number, n: number, hr?: number): StravaSplit[] =>
  Array.from({ length: n }, (_, i) => ({
    split: i + 1, distanceM: 1000, avgPaceMinKm: pace, ...(hr != null && { avgHR: hr }),
  }));

describe('buildPaceProgression', () => {
  it('counts only the easy kilometres of a mixed long run', () => {
    // 20 km easy + 6 km at MP. The MP block must not be counted.
    const acts = [run('a', 6.4, 26, 150)];
    const splits = { a: [...splitsOf(6.8, 20, 148), ...splitsOf(5.68, 6, 172)] };
    const r = buildPaceProgression(weeks, acts, zones, splits);
    expect(r.points[0].easyKm).toBe(20);
    expect(r.points[0].actual).toBeCloseTo(6.8, 2);
    expect(r.points[0].hr).toBe(148);
  });

  it('an explicit override replaces both the band and the counting window', () => {
    // Athlete runs easy at 6:10 — Steady by the zone table, so zone-derived counts zero.
    const acts = [run('a', 6.17, 10, 150)];
    const splits = { a: splitsOf(6.17, 10, 150) };

    expect(buildPaceProgression(weeks, acts, zones, splits).points[0].easyKm).toBe(0);

    const forced = buildPaceProgression(
      weeks, acts, zones, splits, parseEasyRange('6:00', '6:20'),
    );
    expect(forced.points[0].easyKm).toBe(10);
    expect(forced.easyLo).toBe(6);
    expect(forced.window.fast).toBe(6);
    expect(forced.window.slow).toBeCloseTo(6 + 20 / 60, 5);
  });

  it('falls back to whole-run averages when splits are missing, and flags it', () => {
    const r = buildPaceProgression(weeks, [run('a', 6.8, 10, 150)], zones, {});
    expect(r.approximate).toBe(true);
    expect(r.points[0].easyKm).toBe(10);
  });

  it('trims trailing weeks with no data', () => {
    const many = [
      { id: 'w1', num: '1', dateStart: '2026-01-05', dateEnd: '2026-01-11' },
      { id: 'w2', num: '2', dateStart: '2026-01-12', dateEnd: '2026-01-18' },
      { id: 'w3', num: '3', dateStart: '2026-01-19', dateEnd: '2026-01-25' },
    ] as unknown as Week[];
    const acts = [run('a', 6.8, 10, 150)]; // week 1 only
    const r = buildPaceProgression(many, acts, zones, { a: splitsOf(6.8, 10, 150) });
    expect(r.points).toHaveLength(1);
  });
});
