// Session guides: the what/why/feel/execute/mistake coaching content, written
// once in the coach's (Magness-style) voice and templated per athlete. Paces
// and HR caps fill from the athlete's zones, race-day numbers from their goal,
// and injury framing appears only when they reported an injury history.
// Called with an empty config it produces neutral, de-personalized text — the
// plan generator embeds that version as reference material in its prompt.

// .js extension: this module is shared with the server bundle (api/generate-plan),
// whose node16 module resolution requires explicit extensions.
import type { Zone } from '../types/index.js';

export interface GuideEntry {
  key: string;
  label: string;
  oneLiner: string;
  what: string;
  why: string;
  feel: string;
  execute: string[];
  mistake: string;
}

export interface GuideConfig {
  zones?: Zone[];
  goalPace?: string;   // 'm:ss' per km
  goalTime?: string;   // 'H:MM:SS'
  raceStart?: string;  // 'HH:MM'
  injuryHistory?: string;
}

// ---------- pace/time helpers ----------

function parsePaceSec(pace: string): number | null {
  const m = /^(\d+):(\d{2})$/.exec(pace.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function fmtPaceSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** goalPace shifted by `delta` seconds, or null when goalPace is unusable. */
function shiftPace(goalPace: string | undefined, delta: number): string | null {
  if (!goalPace) return null;
  const sec = parsePaceSec(goalPace);
  return sec == null ? null : fmtPaceSec(sec + delta);
}

/** '<140' → 'under 140' · '140–155' → '140–155' · '190+' → '190+' */
function hrPhrase(hr: string): string {
  const trimmed = hr.trim();
  if (trimmed.startsWith('<')) return `under ${trimmed.slice(1)}`;
  return trimmed;
}

function fmtGoalTimeShort(goalTime: string | undefined): string | null {
  if (!goalTime) return null;
  const parts = goalTime.split(':');
  if (parts.length < 2) return null;
  return `${Number(parts[0])}:${parts[1]}`;
}

/** Race start 'HH:MM' minus ~3.5h → 'h:mm am/pm' wake-up call. */
function wakeTime(raceStart: string | undefined): string | null {
  if (!raceStart) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(raceStart.trim());
  if (!m) return null;
  let minutes = Number(m[1]) * 60 + Number(m[2]) - 210;
  if (minutes < 0) minutes += 24 * 60;
  const h24 = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, '0');
  const suffix = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix}`;
}

// ---------- guide builder ----------

export function buildSessionGuide(cfg: GuideConfig = {}): Record<string, GuideEntry> {
  const zone = (name: string): Zone | undefined => cfg.zones?.find((z) => z.name === name);

  // Zone-driven phrases with neutral fallbacks for when zones are absent
  // (e.g. the generator prompt) or a generated plan lacks a named zone.
  const easyZ = zone('Easy');
  const easyAt = easyZ ? `at ${easyZ.pace}/km, heart rate ${hrPhrase(easyZ.hr)}` : 'in your easy zone — conversational pace';
  const easyHrCap = easyZ ? `stay ${hrPhrase(easyZ.hr).startsWith('under') ? hrPhrase(easyZ.hr) : `in ${easyZ.hr}`}` : 'keep it conversational';

  const recZ = zone('Recovery');
  const recAt = recZ ? `at ${recZ.pace}/km, heart rate ${hrPhrase(recZ.hr)}` : 'in your recovery zone — the easiest gear you have';

  const steadyZ = zone('Steady');
  const steadyAt = steadyZ ? `at ${steadyZ.pace}/km, heart rate ${steadyZ.hr}` : 'in your steady zone, a controlled notch above easy';

  const thrZ = zone('Threshold');
  const thrAt = thrZ ? `~${thrZ.pace}/km, heart rate ${thrZ.hr}` : 'at your threshold pace';

  const subTZ = zone('Sub-T');
  const subTAt = subTZ ? `~${subTZ.pace}/km, heart rate ${subTZ.hr}` : 'slightly easier than threshold';

  const vo2Z = zone('VO2 / CV');
  const vo2At = vo2Z ? `~${vo2Z.pace}/km, heart rate ${vo2Z.hr}` : 'at your VO2 / critical-velocity pace';

  const mpZ = zone('Marathon (MP)');
  const mpEffort = mpZ ? `(HR ${mpZ.hr})` : '(goal-pace effort)';

  const goalPace = cfg.goalPace || null;
  const goalPaceAt = goalPace ? `(${goalPace}/km)` : '';
  const goalShort = fmtGoalTimeShort(cfg.goalTime);
  const hasInjury = !!cfg.injuryHistory?.trim();

  // Race-day pacing derived from goal pace: patient opening, locked middle, small permitted drift.
  const openLo = shiftPace(goalPace ?? undefined, 4);
  const openHi = shiftPace(goalPace ?? undefined, 9);
  const drift = shiftPace(goalPace ?? undefined, 9);
  const wake = wakeTime(cfg.raceStart);

  return {
    easy: {
      key: 'easy',
      label: 'easy run',
      oneLiner: 'Conversational-pace aerobic running — the foundation everything else is built on.',
      what: `Relaxed aerobic running ${easyAt}. The bulk of your weekly volume lives here.`,
      why: "Easy running builds the aerobic engine — more capillaries, more mitochondria, better fat-burning, a stronger heart — without digging a fatigue hole. The core principle: the majority of your running should be genuinely easy so the hard days can be truly hard. Easy days are not \"junk\" — they are where most of your aerobic adaptation happens.",
      feel: 'You can hold a full conversation in complete sentences. Nose-breathing should be possible. It should feel almost too slow — like you are holding back. RPE 3–4 out of 10.',
      execute: [
        'Start slower than feels natural for the first km.',
        'If you are unsure whether it is easy enough, slow down.',
        `Let heart rate be the guardrail — ${easyHrCap} even if pace feels slow.`,
        'In heat, ignore pace entirely and run by feel / HR cap.',
      ],
      mistake: 'Running easy days too fast. This is the #1 amateur error — grey-zone running that is too hard to recover from but too slow to build real fitness. Discipline on easy days is what makes you fast.',
    },

    recovery: {
      key: 'recovery',
      label: 'recovery run',
      oneLiner: 'The easiest run on the schedule — pure active recovery.',
      what: `Very gentle running ${recAt}. Shorter than an easy run.`,
      why: 'Promotes blood flow to flush fatigue and aid recovery between hard sessions, while adding a little aerobic volume at almost no cost.',
      feel: 'Embarrassingly slow. Totally relaxed. You should finish feeling fresher than you started. RPE 2–3 out of 10.',
      execute: [
        'Leave the ego at home — slow is the point.',
        'Walk breaks are completely fine.',
        'If you feel beat up, cut it short or swap for rest.',
      ],
      mistake: 'Turning a recovery run into an easy run. It defeats the purpose.',
    },

    steady: {
      key: 'steady',
      label: 'steady run',
      oneLiner: 'A controlled notch above easy — comfortably moderate.',
      what: `Moderate aerobic running ${steadyAt}.`,
      why: 'Bridges easy running and threshold work. Builds aerobic strength and trains you to hold a controlled effort without it tipping into hard.',
      feel: 'Comfortably moderate. You can speak in short phrases but not full sentences. RPE 5–6 out of 10.',
      execute: [
        'Settle into a rhythm you could sustain for a long time.',
        'Finish feeling like you had more in the tank.',
      ],
      mistake: 'Letting it drift up toward threshold. Steady is steady — keep it controlled.',
    },

    long: {
      key: 'long',
      label: 'long run',
      oneLiner: 'The cornerstone session — builds endurance, fatigue resistance, and mental toughness.',
      what: 'Your longest run of the week. Most are run at easy pace; in a race build, the later ones finish with goal-pace segments.',
      why: 'The long run develops everything endurance racing demands: aerobic endurance, the ability to run on tired legs, fuel efficiency, and the mental resilience to keep going when it gets hard. Time on feet is the single biggest predictor of endurance readiness.',
      feel: 'Starts genuinely easy and conversational. The early kilometres should feel almost too comfortable. The value comes in the later kilometres when you are tired but still running controlled.',
      execute: [
        'Start slow — the most common long-run mistake is going out too fast.',
        'Fuel before and during (1 gel every 30–40 min) unless it is a fasted run.',
        'Drink to thirst, take electrolytes, especially in heat.',
        'Aim to finish as strong or stronger than you started (negative split when you can).',
        'Practice your race-day breakfast before the longest runs.',
      ],
      mistake: 'Racing your long run. Going out too hard turns a controlled endurance session into a survival slog and wrecks the following days.',
    },

    longMP: {
      key: 'longMP',
      label: 'marathon-pace long run',
      oneLiner: 'The most race-specific session — long run finishing at goal pace on tired legs.',
      what: `A long run where the final segment(s) are run at marathon pace ${goalPaceAt} after a large easy-pace base.`.replace('  ', ' '),
      why: 'Teaches your body and mind exactly what goal pace feels like when already fatigued — which is precisely the challenge of the back half of a marathon. This is where fitness becomes race-ready.',
      feel: 'The easy portion should feel relaxed. When you shift to MP, it should feel controlled and rhythmic, not a struggle — early in training it may feel like work; by peak weeks it should feel smooth.',
      execute: [
        'Run the easy base genuinely easy so you have something left for the MP segment.',
        goalPace
          ? `Lock into ${goalPace} by feel and rhythm, not just by staring at the watch.`
          : 'Lock into goal pace by feel and rhythm, not just by staring at the watch.',
        'Use these to rehearse fueling at race pace.',
        `In heat, run MP effort ${mpEffort} rather than forcing the exact pace.`,
      ],
      mistake: 'Running the MP segment too fast. Goal pace is the goal — faster is not better here and just costs you recovery.',
    },

    fasted: {
      key: 'fasted',
      label: 'fasted long run',
      oneLiner: 'Long run with no fuel — trains your body to burn fat efficiently.',
      what: 'A long run done on water and electrolytes only, no carbohydrate gels.',
      why: 'Trains fat metabolism and metabolic flexibility, teaching the body to spare its limited glycogen stores — a useful endurance adaptation.',
      feel: 'Fine early, potentially harder in the later stages as glycogen drops. These must be run SLOWER than fueled long runs.',
      execute: [
        'Easy pace only — never combine fasted with fast.',
        'Carry electrolytes and water.',
        'If you feel a genuine bonk coming (lightheaded, legs gone, foggy), take a gel and end the depletion experiment — pushing through a real bonk is not productive.',
      ],
      mistake: 'Going too hard, or being macho about pushing through a true bonk. The goal is a metabolic stimulus, not suffering.',
    },

    strides: {
      key: 'strides',
      label: 'strides',
      oneLiner: 'Short, smooth accelerations that sharpen your legs and improve form — not sprints.',
      what: 'Controlled accelerations over ~100m: build up smoothly to about 90–95% of top speed, hold relaxed for a moment, then float down. Usually 4–8 reps after an easy run, with full recovery between.',
      why: 'Strides improve running economy, leg turnover, neuromuscular coordination, and form. They bridge slow easy running and fast workout running, keeping your legs "sharp" without adding fatigue. They also gently prepare the body for faster work later in the plan.',
      feel: 'Fast but relaxed — the feeling of "fast and smooth," never strained. Think effortless speed, not maximal sprinting.',
      execute: [
        'Run on flat ground or a very slight downhill, on a forgiving surface.',
        'Accelerate gradually over the first 40–50m, hold relaxed speed briefly, then decelerate.',
        'Focus on staying relaxed: loose jaw, dropped shoulders, soft hands, quick light feet.',
        'Take FULL recovery between reps — walk back or stand, 45–60 seconds.',
        'Never go to true all-out max.',
      ],
      mistake: 'Sprinting flat-out and skimping on recovery. Strides done as max sprints with short rest become a fatiguing workout instead of a sharpening tool.',
    },

    hillSprints: {
      key: 'hillSprints',
      label: 'hill sprints',
      oneLiner: 'Short maximal uphill bursts — running-specific power and strength, with low injury risk.',
      what: 'Explosive 8–12 second efforts up a steep hill, with a full walking recovery back down (2–3 min).',
      why: `Hill sprints build power and strength and recruit fast-twitch muscle fibres — like strength training, but specific to running. The hill caps your speed and softens the impact, making them remarkably safe.${
        hasInjury ? ' Given your injury history, this is a low-risk way to build strength and resilience.' : ''
      }`,
      feel: 'Powerful and explosive but brief — each rep is near-maximal effort, but short enough that you are never gasping. You should feel strong, not gassed.',
      execute: [
        'Find a steep hill — steeper than you would normally run.',
        'Drive hard up the hill for 8–12 seconds with powerful arms and good posture.',
        'Walk ALL the way back down for full recovery before the next rep.',
        'Stop a rep or two short if form starts breaking down.',
      ],
      mistake: 'Using a hill that is too shallow or making reps too long — both turn a neuromuscular power session into anaerobic suffering. Keep them short, steep, and fully recovered.',
    },

    threshold: {
      key: 'threshold',
      label: 'threshold / tempo',
      oneLiner: 'Comfortably-hard running that raises the pace you can sustain — the most important workout type.',
      what: `Sustained running or long intervals at lactate threshold, ${thrAt}.`,
      why: 'Threshold work raises the pace at which lactate starts to accumulate — effectively lifting the ceiling on the speed you can hold for a long time. It is arguably the single most valuable workout type for endurance performance, and a cornerstone of this approach.',
      feel: 'Comfortably hard. You can say a few words but not hold a conversation. Controlled, sustainable discomfort — the classic test is "could I hold this for about an hour if I absolutely had to?" RPE 7 out of 10.',
      execute: [
        'Hold an even, controlled effort — you are not racing.',
        'Resist the urge to push the pace; even effort across all reps is the win.',
        'Take the prescribed recovery jogs honestly.',
      ],
      mistake: 'Running threshold too fast. Pushing into VO2 territory defeats the entire purpose and leaves you too wrecked to absorb the work.',
    },

    subThreshold: {
      key: 'subThreshold',
      label: 'sub-threshold (sub-T)',
      oneLiner: 'Just below threshold — a lot of quality work for a fraction of the fatigue.',
      what: `Intervals slightly easier than threshold, ${subTAt}, often in longer or more numerous reps.`,
      why: 'Running just under the threshold "redline" lets you accumulate a large volume of quality work while keeping fatigue low — a signature of this approach for steady, sustainable improvement without burning out. You get most of the threshold benefit at a fraction of the cost.',
      feel: 'Moderately hard and very controlled. You finish each rep feeling you could have done another. RPE 6–7 out of 10.',
      execute: [
        'Deliberately hold back — staying just under the redline is the whole point.',
        'Keep effort even across all reps.',
      ],
      mistake: 'Creeping up into true threshold pace. If the reps feel genuinely hard, you are going too fast.',
    },

    vo2: {
      key: 'vo2',
      label: 'VO2 / critical velocity',
      oneLiner: 'Faster, shorter intervals used sparingly to sharpen late in the plan.',
      what: `Hard intervals ${vo2At}, in short reps with full recovery.`,
      why: 'Develops VO2max and running economy at speed. Used in small doses later in the plan to add a top-end sharpness on top of the aerobic base.',
      feel: 'Hard. Breathing heavy and rhythmic. RPE 8 out of 10.',
      execute: [
        'Hit the prescribed pace but stay relaxed and smooth.',
        'Take full recoveries so you can hit each rep with quality.',
      ],
      mistake: 'Doing too much of this. VO2 work sharpens an existing base — it is a small part of endurance training, not the main event.',
    },

    bike: {
      key: 'bike',
      label: 'easy bike',
      oneLiner: 'Aerobic volume and active recovery with zero running impact.',
      what: 'Easy aerobic spin of 40–60 minutes, heart rate well below your easy-run cap.',
      why: `Adds aerobic volume and aids recovery while sparing your legs and feet from impact${
        hasInjury ? ' — especially valuable given your injury history' : ''
      }. It builds the engine without the pounding.`,
      feel: 'Easy and conversational throughout. This is not a workout — it is recovery and bonus aerobic time.',
      execute: [
        'Keep it genuinely easy — resist turning it into intervals.',
        'Spin a comfortable cadence; legs should feel looser afterward.',
      ],
      mistake: 'Hammering the bike. It is meant to support your running, not compete with it for recovery.',
    },

    rest: {
      key: 'rest',
      label: 'rest day',
      oneLiner: 'Where the adaptation actually happens — protect it.',
      what: 'A full day off running, or optional gentle mobility and core work.',
      why: `Training breaks the body down; rest is when it rebuilds stronger. Skipping rest is how you stall progress and pick up injuries${
        hasInjury ? ' — and with your injury history, these days are non-negotiable insurance' : ''
      }.`,
      feel: 'Restful. You should wake the next day feeling fresher.',
      execute: [
        'Actually rest: prioritise sleep, hydration, and good food.',
        'Optional light mobility or core is fine — nothing taxing.',
        'No sneaky "junk miles."',
      ],
      mistake: 'Feeling guilty and adding training. Rest is part of the plan, not a gap in it.',
    },

    race: {
      key: 'race',
      label: 'race day',
      oneLiner: 'Execute the plan you have rehearsed — patience first, courage last.',
      what: goalPace && goalShort
        ? `The marathon. 42.195 km at goal pace ${goalPace}/km for a sub-${goalShort} finish.`
        : 'Race day. The distance you trained for, at the goal pace you rehearsed.',
      why: 'Everything in the plan points here. The race rewards discipline in the first half and toughness in the final stretch.',
      feel: 'The first half should feel almost too easy — that restraint is what banks the energy for the finish. The closing kilometres are where it gets hard and where your training pays off.',
      execute: [
        `Wake ${wake ?? 'about 3½ hours before the start'}, 80–100g carbs, then a 15-min jog with 4×100m strides ~25 min before start.`,
        openLo && openHi
          ? `km 0–5: hold back at ${openLo}–${openHi} — resist the adrenaline.`
          : 'km 0–5: hold back a touch slower than goal pace — resist the adrenaline.',
        goalPace
          ? `km 5–32: lock into ${goalPace} and stay smooth.`
          : 'The long middle: lock into goal pace and stay smooth.',
        drift
          ? `km 32–42: hold goal pace or let it drift to ${drift} if needed.`
          : 'The final stretch: hold goal pace, allowing only a small drift if needed.',
        'Only open up in the last few km, once you know you will finish strong.',
        'Fuel every 25–30 min from early on; take electrolytes throughout.',
      ],
      mistake: 'Going out too fast on fresh legs and adrenaline. Almost every blow-up is paid for with an over-eager first 10 km.',
    },
  };
}
