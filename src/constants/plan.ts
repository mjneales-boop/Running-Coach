import type { Week, PhaseInfo, Zone } from '../types';

export const RACE_DATE = '2026-10-10';
export const RACE_TIME = '08:00';
export const RACE_NAME = 'EDP Lisbon Marathon 2026';
export const RACE_LOCATION = 'Carcavelos → Lisbon';
export const GOAL_TIME = '3:59:59';
export const GOAL_PACE = '5:41';

export const ATHLETE = {
  name: 'Max Neale',
  maxHR: 200,
  baselineRHR: 42,
  baselineHRV: 103,
  baselineSleep: 7.2,
};

/** Shown on Daily when readiness has never been logged/synced (fresh install, Oura not connected). */
export const SEED_READINESS = {
  score: 84,
  hrv: 108,
  rhr: 44,
  sleep: 7.4,
};

export const PHASES: PhaseInfo[] = [
  { num: 0, name: 'Pre-Ramp',               short: 'PRE',      weeks: 'pre1,pre2', color: '#2E6E75' },
  { num: 1, name: 'Aerobic Base',            short: 'BASE',     weeks: '1-4',       color: '#2C7CB0', blurb: 'Aerobic foundation · easy volume' },
  { num: 2, name: 'Strength / Threshold',    short: 'STRENGTH', weeks: '5-8',       color: '#2497CE', blurb: 'Hills, tempo & durability' },
  { num: 3, name: 'Marathon-Specific',       short: 'MARATHON', weeks: '9-12',      color: '#16B9DC', blurb: 'Race-specific · MP work' },
  { num: 4, name: 'Sharpen + Taper',         short: 'TAPER',    weeks: '13-16',     color: '#00D9FF', blurb: 'Sharpen, freshen & race' },
];

export const ZONES: Zone[] = [
  { name: 'Recovery',         pace: '7:00–7:30', hr: '<140' },
  { name: 'Easy',             pace: '6:30–7:00', hr: '140–155' },
  { name: 'Steady',           pace: '6:00–6:20', hr: '155–165' },
  { name: 'Marathon (MP)',    pace: '5:41',       hr: '165–175', hero: true },
  { name: 'Sub-T',            pace: '5:00–5:15', hr: '175–185' },
  { name: 'Threshold',        pace: '4:50–5:00', hr: '185–190' },
  { name: 'VO2 / CV',         pace: '4:25–4:35', hr: '190+' },
];

export const WEEKS: Week[] = [
  // ──────── PRE-RAMP ────────
  {
    id: 'pre1', label: 'Pre-Ramp 1', num: 'PR1', phase: 0,
    dateStart: '2026-06-08', dateEnd: '2026-06-14', targetKm: 26,
    days: [
      { d: 'mon', date: '2026-06-08', type: 'EASY',  title: 'Easy 5 km + 4×100m strides',      km: 5,  pace: '6:30–7:00', notes: 'Early morning. Strides on flat, full recovery.' },
      { d: 'tue', date: '2026-06-09', type: 'REST',  title: 'Rest or 30 min easy spin',                             notes: 'Optional bike if energy good.' },
      { d: 'wed', date: '2026-06-10', type: 'EASY',  title: 'Easy 6 km',                        km: 6,  pace: '6:30–7:00', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-06-11', type: 'REST',  title: 'Rest' },
      { d: 'fri', date: '2026-06-12', type: 'EASY',  title: 'Easy 5 km',                        km: 5,  pace: '6:30–7:00' },
      { d: 'sat', date: '2026-06-13', type: 'LONG',  title: 'Long 10 km easy',                  km: 10, pace: '6:30–7:00', gym: 'Legs', workoutId: 'legs', notes: 'Pre-dawn start. Hydrate aggressively.' },
      { d: 'sun', date: '2026-06-14', type: 'REST',  title: 'Rest' },
    ],
  },
  {
    id: 'pre2', label: 'Pre-Ramp 2 · Moving Week', num: 'PR2', phase: 0,
    dateStart: '2026-06-15', dateEnd: '2026-06-21', targetKm: 30,
    days: [
      { d: 'mon', date: '2026-06-15', type: 'EASY',  title: 'Easy 6 km · Austin',                              km: 6,  pace: '6:30–7:00' },
      { d: 'tue', date: '2026-06-16', type: 'EASY',  title: 'Easy 5 km + 6×100m strides · LAST AUSTIN RUN',   km: 5,  pace: '6:30–7:00', gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-06-17', type: 'REST',  title: 'Travel day · Austin → Castlemaine' },
      { d: 'thu', date: '2026-06-18', type: 'EASY',  title: 'Shakeout 4 km · learn local routes',              km: 4,  pace: '6:30–7:00' },
      { d: 'fri', date: '2026-06-19', type: 'EASY',  title: 'Easy 5 km',                                       km: 5,  pace: '6:30–7:00' },
      { d: 'sat', date: '2026-06-20', type: 'LONG',  title: 'Long 10 km easy · first Castlemaine long',        km: 10, pace: '6:30–7:00', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-06-21', type: 'REST',  title: 'Rest · prep for plan Week 1' },
    ],
  },
  // ──────── PHASE 1 — AEROBIC BASE ────────
  {
    id: 'w1', label: 'Week 1', num: '1', phase: 1,
    dateStart: '2026-06-22', dateEnd: '2026-06-28', targetKm: 28,
    days: [
      { d: 'mon', date: '2026-06-22', type: 'LONG',    title: 'Long 12 km easy',                              km: 12, pace: '6:30–7:00', notes: 'Conversational throughout.' },
      { d: 'tue', date: '2026-06-23', type: 'BIKE',    title: 'Bike 40 min easy + Upper lift PM',             duration: 40, gym: 'Upper lift', workoutId: 'chestback', notes: 'HR <140 on bike.' },
      { d: 'wed', date: '2026-06-24', type: 'EASY',    title: 'Easy 6 km + 6×100m strides',                  km: 6,  pace: '6:30–7:00', strides: '6×100m' },
      { d: 'thu', date: '2026-06-25', type: 'EASY',    title: 'Easy 5 km',                                    km: 5,  pace: '6:30–7:00', notes: 'Or REST if legs feel flat.' },
      { d: 'fri', date: '2026-06-26', type: 'REST',    title: 'Rest',                                         notes: '20 min mobility / core.' },
      { d: 'sat', date: '2026-06-27', type: 'EASY',    title: 'Easy 6 km + Accessory lift PM',               km: 6,  pace: '6:30–7:00', gym: 'Accessory lift', workoutId: 'legs' },
      { d: 'sun', date: '2026-06-28', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w2', label: 'Week 2', num: '2', phase: 1,
    dateStart: '2026-06-29', dateEnd: '2026-07-05', targetKm: 34,
    days: [
      { d: 'mon', date: '2026-06-29', type: 'LONG',    title: 'Long 14 km easy',                              km: 14, pace: '6:30–7:00' },
      { d: 'tue', date: '2026-06-30', type: 'BIKE',    title: 'Bike 45 min easy + Upper lift PM',             duration: 45, gym: 'Upper lift', workoutId: 'chestback' },
      { d: 'wed', date: '2026-07-01', type: 'EASY',    title: 'Easy 7 km',                                    km: 7,  pace: '6:30–7:00' },
      { d: 'thu', date: '2026-07-02', type: 'EASY',    title: 'Easy 7 km',                                    km: 7,  pace: '6:30–7:00', notes: 'Hill sprints optional — keep it light.' },
      { d: 'fri', date: '2026-07-03', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-07-04', type: 'EASY',    title: 'Easy 7 km + Accessory lift PM',               km: 7,  pace: '6:30–7:00', gym: 'Accessory lift', workoutId: 'legs' },
      { d: 'sun', date: '2026-07-05', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w3', label: 'Week 3', num: '3', phase: 1,
    dateStart: '2026-07-06', dateEnd: '2026-07-12', targetKm: 46,
    days: [
      { d: 'mon', date: '2026-07-06', type: 'LONG',    title: 'Long 19 km easy',                              km: 19, pace: '6:30–7:00' },
      { d: 'tue', date: '2026-07-07', type: 'BIKE',    title: 'Bike 50 min easy + Chest/Back PM',             duration: 50, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-07-08', type: 'EASY',    title: 'Easy 9 km + 4×100m strides',                  km: 9,  pace: '6:30–7:00', strides: '4×100m', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-07-09', type: 'WORKOUT', title: '5×1km @ steady · first workout',              km: 9,  notes: '2 km WU · 5×1km @ 6:00/km · 90s jog recovery · 1 km CD.' },
      { d: 'fri', date: '2026-07-10', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-07-11', type: 'EASY',    title: 'Easy 10 km + 6×12s hill sprints + Leg Day PM', km: 10, pace: '6:30–7:00', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-07-12', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w4', label: 'Week 4 · Cutback', num: '4', phase: 1, cutback: true,
    dateStart: '2026-07-13', dateEnd: '2026-07-19', targetKm: 36,
    days: [
      { d: 'mon', date: '2026-07-13', type: 'LONG',    title: 'Long 14 km easy · cutback',                   km: 14, pace: '6:30–7:00', notes: 'Deliberately shorter — recovery week.' },
      { d: 'tue', date: '2026-07-14', type: 'BIKE',    title: 'Bike 40 min easy + Chest/Back (light) PM',    duration: 40, gym: 'Chest/Back (light)', workoutId: 'chestback' },
      { d: 'wed', date: '2026-07-15', type: 'EASY',    title: 'Easy 7 km + 6×100m strides',                  km: 7,  pace: '6:30–7:00', strides: '6×100m', gym: 'Shoulders/Arms (light)', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-07-16', type: 'EASY',    title: 'Easy 7 km + 6×12s hill sprints',              km: 7,  pace: '6:30–7:00' },
      { d: 'fri', date: '2026-07-17', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-07-18', type: 'EASY',    title: 'Easy 8 km + Leg Day (light) PM',              km: 8,  pace: '6:30–7:00', gym: 'Legs (light)', workoutId: 'legs' },
      { d: 'sun', date: '2026-07-19', type: 'REST',    title: 'Rest · assess niggles, sleep, RHR' },
    ],
  },
  // ──────── PHASE 2 — STRENGTH / THRESHOLD ────────
  {
    id: 'w5', label: 'Week 5', num: '5', phase: 2,
    dateStart: '2026-07-20', dateEnd: '2026-07-26', targetKm: 50,
    days: [
      { d: 'mon', date: '2026-07-20', type: 'LONG',    title: 'Long 22 km easy',                              km: 22, pace: '6:30–7:00' },
      { d: 'tue', date: '2026-07-21', type: 'BIKE',    title: 'Bike 50 min easy + Chest/Back PM',             duration: 50, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-07-22', type: 'EASY',    title: 'Easy 10 km',                                   km: 10, pace: '6:30–7:00', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-07-23', type: 'WORKOUT', title: '4×1.5km @ sub-T (5:10)',                      km: 9,  notes: '2 km WU · 4×1.5km @ 5:10/km · 2 min jog rec · 1 km CD.' },
      { d: 'fri', date: '2026-07-24', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-07-25', type: 'EASY',    title: 'Easy 9 km + 8×100m strides + Leg Day PM',     km: 9,  pace: '6:30–7:00', strides: '8×100m', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-07-26', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w6', label: 'Week 6', num: '6', phase: 2,
    dateStart: '2026-07-27', dateEnd: '2026-08-02', targetKm: 54,
    days: [
      { d: 'mon', date: '2026-07-27', type: 'LONG',    title: 'Long 24 km · FASTED',                         km: 24, pace: '6:30–7:00 / steady', notes: '18 km easy + 6 km steady (6:00–6:20). Water + electrolytes only. Cut short if energy crashes.' },
      { d: 'tue', date: '2026-07-28', type: 'BIKE',    title: 'Bike 60 min easy + Chest/Back PM',             duration: 60, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-07-29', type: 'EASY',    title: 'Easy 10 km + 6×100m strides',                 km: 10, pace: '6:30–7:00', strides: '6×100m', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-07-30', type: 'WORKOUT', title: '3×2km @ sub-T (5:10)',                        km: 9,  notes: '2 km WU · 3×2km @ 5:10/km · 2 min jog rec · 1 km CD.' },
      { d: 'fri', date: '2026-07-31', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-08-01', type: 'EASY',    title: 'Easy 11 km + 6×12s hill sprints + Leg Day PM', km: 11, pace: '6:30–7:00', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-08-02', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w7', label: 'Week 7', num: '7', phase: 2,
    dateStart: '2026-08-03', dateEnd: '2026-08-09', targetKm: 58,
    days: [
      { d: 'mon', date: '2026-08-03', type: 'LONG',    title: 'Long 26 km easy · fueled',                    km: 26, pace: '6:30–7:00', notes: '1 gel every 35 min, electrolytes throughout. Practice fueling rhythm.' },
      { d: 'tue', date: '2026-08-04', type: 'BIKE',    title: 'Bike 60 min easy + Chest/Back PM',             duration: 60, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-08-05', type: 'EASY',    title: 'Easy 11 km',                                   km: 11, pace: '6:30–7:00', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-08-06', type: 'WORKOUT', title: '5×1km @ T (4:55) + 4×200m',                   km: 10, notes: '2 km WU · 5×1km @ 4:55/km · 90s jog rec · 4×200m fast (40–45s) · 1 km CD.' },
      { d: 'fri', date: '2026-08-07', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-08-08', type: 'EASY',    title: 'Moderate 11 km — last 3 km steady + strides + Leg Day PM', km: 11, pace: '6:30→6:00', strides: '6×100m', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-08-09', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w8', label: 'Week 8 · Cutback', num: '8', phase: 2, cutback: true,
    dateStart: '2026-08-10', dateEnd: '2026-08-16', targetKm: 42,
    days: [
      { d: 'mon', date: '2026-08-10', type: 'LONG',    title: 'Long 18 km easy · cutback',                   km: 18, pace: '6:30–7:00' },
      { d: 'tue', date: '2026-08-11', type: 'BIKE',    title: 'Bike 40 min easy + Chest/Back (light) PM',    duration: 40, gym: 'Chest/Back (light)', workoutId: 'chestback' },
      { d: 'wed', date: '2026-08-12', type: 'EASY',    title: 'Easy 8 km',                                   km: 8,  pace: '6:30–7:00', gym: 'Shoulders/Arms (light)', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-08-13', type: 'EASY',    title: 'Easy 8 km + 6×12s hill sprints',              km: 8,  pace: '6:30–7:00' },
      { d: 'fri', date: '2026-08-14', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-08-15', type: 'EASY',    title: 'Easy 8 km + Leg Day (light) PM',              km: 8,  pace: '6:30–7:00', gym: 'Legs (light)', workoutId: 'legs' },
      { d: 'sun', date: '2026-08-16', type: 'REST',    title: 'Rest · assess' },
    ],
  },
  // ──────── PHASE 3 — MARATHON-SPECIFIC ────────
  {
    id: 'w9', label: 'Week 9', num: '9', phase: 3,
    dateStart: '2026-08-17', dateEnd: '2026-08-23', targetKm: 60,
    days: [
      { d: 'mon', date: '2026-08-17', type: 'LONG',    title: 'Long 28 km · 6 km @ MP',                      km: 28, pace: 'easy → 5:41', notes: '22 km easy + 6 km @ MP (5:41/km).' },
      { d: 'tue', date: '2026-08-18', type: 'BIKE',    title: 'Bike 60 min easy + Chest/Back PM',             duration: 60, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-08-19', type: 'EASY',    title: 'Easy 11 km',                                   km: 11, pace: '6:30–7:00', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-08-20', type: 'WORKOUT', title: '6×1km @ T (4:55)',                             km: 10, notes: '2 km WU · 6×1km @ 4:55/km · 90s jog rec · 1 km CD.' },
      { d: 'fri', date: '2026-08-21', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-08-22', type: 'EASY',    title: 'Moderate 11 km — 4 km @ MP + strides + Leg Day PM', km: 11, pace: 'easy → 5:41', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-08-23', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w10', label: 'Week 10', num: '10', phase: 3,
    dateStart: '2026-08-24', dateEnd: '2026-08-30', targetKm: 64,
    days: [
      { d: 'mon', date: '2026-08-24', type: 'LONG',    title: 'MP Long 30 km · 2×5km @ MP',                  km: 30, pace: 'easy → 5:41', notes: '18 km easy + 2×5km @ MP w/ 1 km easy jog between + 1 km CD.' },
      { d: 'tue', date: '2026-08-25', type: 'BIKE',    title: 'Bike 60 min easy + Chest/Back PM',             duration: 60, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-08-26', type: 'EASY',    title: 'Easy 12 km + 6×100m strides',                 km: 12, pace: '6:30–7:00', strides: '6×100m', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-08-27', type: 'WORKOUT', title: '3×3km @ sub-T (5:10)',                        km: 12, notes: '2 km WU · 3×3km @ 5:10/km · 3 min jog rec · 1 km CD.' },
      { d: 'fri', date: '2026-08-28', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-08-29', type: 'EASY',    title: 'Moderate 10 km — 4 km @ MP + Leg Day PM',     km: 10, pace: 'easy → 5:41', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-08-30', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w11', label: 'Week 11 · PEAK', num: '11', phase: 3, peak: true,
    dateStart: '2026-08-31', dateEnd: '2026-09-06', targetKm: 68,
    days: [
      { d: 'mon', date: '2026-08-31', type: 'LONG',    title: 'LONGEST RUN — 32 km · 8 km @ MP',             km: 32, pace: 'easy → 5:41', notes: '24 km easy + 8 km @ MP. FULL race fueling rehearsal: 1 gel every 30 min, electrolytes throughout, race kit if possible.' },
      { d: 'tue', date: '2026-09-01', type: 'BIKE',    title: 'Bike 60 min easy + Chest/Back PM',             duration: 60, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-09-02', type: 'EASY',    title: 'Easy 13 km',                                   km: 13, pace: '6:30–7:00', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-09-03', type: 'WORKOUT', title: '5×1.5km @ T (4:55)',                           km: 12, notes: '2 km WU · 5×1.5km @ 4:55/km · 90s jog rec · 1 km CD.' },
      { d: 'fri', date: '2026-09-04', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-09-05', type: 'EASY',    title: 'Moderate 11 km — 4 km @ MP + strides + Leg Day PM', km: 11, pace: 'easy → 5:41', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-09-06', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w12', label: 'Week 12 · Cutback', num: '12', phase: 3, cutback: true,
    dateStart: '2026-09-07', dateEnd: '2026-09-13', targetKm: 48,
    days: [
      { d: 'mon', date: '2026-09-07', type: 'LONG',    title: 'Long 22 km easy · cutback',                   km: 22, pace: '6:30–7:00', notes: 'Relaxed, conversational throughout.' },
      { d: 'tue', date: '2026-09-08', type: 'BIKE',    title: 'Bike 45 min easy + Chest/Back (light) PM',    duration: 45, gym: 'Chest/Back (light)', workoutId: 'chestback' },
      { d: 'wed', date: '2026-09-09', type: 'EASY',    title: 'Easy 9 km',                                   km: 9,  pace: '6:30–7:00', gym: 'Shoulders/Arms (light)', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-09-10', type: 'WORKOUT', title: '4 km @ MP block',                             km: 10, notes: '4 km easy + 4 km @ MP + 2 km easy.' },
      { d: 'fri', date: '2026-09-11', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-09-12', type: 'EASY',    title: 'Easy 7 km + 6×100m strides + Leg Day (light) PM', km: 7, pace: '6:30–7:00', strides: '6×100m', gym: 'Legs (light)', workoutId: 'legs' },
      { d: 'sun', date: '2026-09-13', type: 'REST',    title: 'Rest' },
    ],
  },
  // ──────── PHASE 4 — SHARPEN + TAPER ────────
  {
    id: 'w13', label: 'Week 13', num: '13', phase: 4,
    dateStart: '2026-09-14', dateEnd: '2026-09-20', targetKm: 60,
    days: [
      { d: 'mon', date: '2026-09-14', type: 'LONG',    title: 'Dress Rehearsal Long 28 km · 10 km @ MP',     km: 28, pace: 'easy → 5:41', notes: '18 km easy + 10 km @ MP. Practice every race detail — fueling, kit, breakfast timing.' },
      { d: 'tue', date: '2026-09-15', type: 'BIKE',    title: 'Bike 50 min easy + Chest/Back PM',             duration: 50, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-09-16', type: 'EASY',    title: 'Easy 11 km',                                   km: 11, pace: '6:30–7:00', gym: 'Shoulders/Arms', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-09-17', type: 'WORKOUT', title: '8×800m @ T (~3:55 each)',                      km: 11, notes: '2 km WU · 8×800m @ ~3:55 per rep · 90s jog rec · 1 km CD.' },
      { d: 'fri', date: '2026-09-18', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-09-19', type: 'EASY',    title: '10 km — 5 km @ MP + Leg Day PM',              km: 10, pace: 'easy → 5:41', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-09-20', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w14', label: 'Week 14 · Heat Prep', num: '14', phase: 4,
    dateStart: '2026-09-21', dateEnd: '2026-09-27', targetKm: 50,
    days: [
      { d: 'mon', date: '2026-09-21', type: 'LONG',    title: 'Long 22 km · 4 km @ MP',                      km: 22, pace: 'easy → 5:41', notes: '18 km easy + 4 km @ MP.' },
      { d: 'tue', date: '2026-09-22', type: 'BIKE',    title: 'Bike 45 min easy + Chest/Back PM',             duration: 45, gym: 'Chest/Back', workoutId: 'chestback' },
      { d: 'wed', date: '2026-09-23', type: 'EASY',    title: 'Easy 9 km · EXTRA LAYER (heat prep)',          km: 9,  pace: '6:30–7:00', gym: 'Shoulders/Arms', workoutId: 'shouldersarms', notes: 'Wear extra layer or 15–20 min sauna post-run if accessible.' },
      { d: 'thu', date: '2026-09-24', type: 'WORKOUT', title: '4×1km @ T + 4×400m @ CV',                     km: 10, notes: '2 km WU · 4×1km @ 4:55 · 4×400m @ CV (~1:50) · 90s/60s rec · 1 km CD.' },
      { d: 'fri', date: '2026-09-25', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-09-26', type: 'EASY',    title: '9 km — 3 km @ MP + Leg Day PM',               km: 9,  pace: 'easy → 5:41', gym: 'Legs', workoutId: 'legs' },
      { d: 'sun', date: '2026-09-27', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w15', label: 'Week 15 · Taper', num: '15', phase: 4,
    dateStart: '2026-09-28', dateEnd: '2026-10-04', targetKm: 38,
    days: [
      { d: 'mon', date: '2026-09-28', type: 'LONG',    title: 'Long 16 km · race kit rehearsal',             km: 16, pace: 'easy → 5:41', notes: '12 km easy + 4 km @ MP. WEAR RACE KIT. Eat race breakfast. Use race fueling.' },
      { d: 'tue', date: '2026-09-29', type: 'BIKE',    title: 'Bike 30 min easy + Chest/Back (light) PM',    duration: 30, gym: 'Chest/Back (light)', workoutId: 'chestback' },
      { d: 'wed', date: '2026-09-30', type: 'EASY',    title: 'Easy 7 km · extra layer',                     km: 7,  pace: '6:30–7:00', gym: 'Shoulders/Arms (light)', workoutId: 'shouldersarms' },
      { d: 'thu', date: '2026-10-01', type: 'WORKOUT', title: '5×1km @ MP + 5×200m @ CV',                    km: 9,  notes: '2 km WU · 5×1km @ MP (5:41) · 5×200m @ CV (~50s) · 60s rec · 1 km CD.' },
      { d: 'fri', date: '2026-10-02', type: 'REST',    title: 'Rest' },
      { d: 'sat', date: '2026-10-03', type: 'EASY',    title: 'Easy 6 km + 6×100m strides + Leg Day (light) PM', km: 6, pace: '6:30–7:00', strides: '6×100m', gym: 'Legs (light)', workoutId: 'legs' },
      { d: 'sun', date: '2026-10-04', type: 'REST',    title: 'Rest' },
    ],
  },
  {
    id: 'w16', label: 'Week 16 · RACE WEEK', num: '16', phase: 4, race: true,
    dateStart: '2026-10-05', dateEnd: '2026-10-11', targetKm: 22,
    days: [
      { d: 'mon', date: '2026-10-05', type: 'EASY',    title: 'Easy 6 km + 4×100m strides',                  km: 6,  pace: '6:30–7:00' },
      { d: 'tue', date: '2026-10-06', type: 'EASY',    title: 'Easy 5 km + 6×100m strides',                  km: 5,  pace: '6:30–7:00', notes: 'Hydrate consistently. Eat normally.' },
      { d: 'wed', date: '2026-10-07', type: 'REST',    title: 'Rest or 25 min easy shakeout' },
      { d: 'thu', date: '2026-10-08', type: 'EASY',    title: 'Easy 4 km + 4×100m strides',                  km: 4,  pace: '6:30–7:00', notes: 'Pasta-style dinner. Normal sleep.' },
      { d: 'fri', date: '2026-10-09', type: 'REST',    title: 'Travel/rest · 20 min shakeout + bib pickup at FIL', notes: 'Lay out kit. Bib pickup at Sport Expo, FIL.' },
      { d: 'sat', date: '2026-10-10', type: 'RACE',    title: 'RACE DAY — 42.195 km · sub-4:00',             km: 42.195, pace: '5:41', notes: 'Wake 4:30 am. 80–100g carbs. 15 min jog + 4×100m strides 25 min before start. Pace plan: 5:45–5:50 for km 0–5, then 5:41 for km 5–32, hold or drift to 5:50 for km 32–42, open up only after km 38.' },
      { d: 'sun', date: '2026-10-11', type: 'REST',    title: 'Walk + celebrate',                             notes: 'You did it.' },
    ],
  },
];

export const PEAK_KM = 68;
