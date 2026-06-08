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

export const SESSION_GUIDE: Record<string, GuideEntry> = {
  easy: {
    key: 'easy',
    label: 'easy run',
    oneLiner: 'Conversational-pace aerobic running — the foundation everything else is built on.',
    what: 'Relaxed aerobic running at 6:30–7:00/km, heart rate under 155. The bulk of your weekly volume lives here.',
    why: 'Easy running builds the aerobic engine — more capillaries, more mitochondria, better fat-burning, a stronger heart — without digging a fatigue hole. Magness\'s core principle: the majority of your running should be genuinely easy so the hard days can be truly hard. Easy days are not "junk" — they are where most of your aerobic adaptation happens.',
    feel: 'You can hold a full conversation in complete sentences. Nose-breathing should be possible. It should feel almost too slow — like you are holding back. RPE 3–4 out of 10.',
    execute: [
      'Start slower than feels natural for the first km.',
      'If you are unsure whether it is easy enough, slow down.',
      'Let heart rate be the guardrail — stay under 155 even if pace feels slow.',
      'In heat, ignore pace entirely and run by feel / HR cap.',
    ],
    mistake: 'Running easy days too fast. This is the #1 amateur error — grey-zone running that is too hard to recover from but too slow to build real fitness. Discipline on easy days is what makes you fast.',
  },

  recovery: {
    key: 'recovery',
    label: 'recovery run',
    oneLiner: 'The easiest run on the schedule — pure active recovery.',
    what: 'Very gentle running at 7:00–7:30/km, heart rate under 140. Shorter than an easy run.',
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
    what: 'Moderate aerobic running at 6:00–6:20/km, heart rate 155–165.',
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
    what: 'Your longest run of the week, building from 14 km up to 32 km at peak. Most are easy pace; later ones finish with marathon-pace segments.',
    why: 'The long run develops everything the marathon demands: aerobic endurance, the ability to run on tired legs, fuel efficiency, and the mental resilience to keep going when it gets hard. Time on feet is the single biggest predictor of marathon readiness.',
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
    what: 'A long run where the final segment(s) are run at marathon pace (5:41/km) after a large easy-pace base.',
    why: 'Teaches your body and mind exactly what goal pace feels like when already fatigued — which is precisely the challenge of the back half of a marathon. This is where fitness becomes race-ready.',
    feel: 'The easy portion should feel relaxed. When you shift to MP, it should feel controlled and rhythmic, not a struggle — early in training it may feel like work; by peak weeks it should feel smooth.',
    execute: [
      'Run the easy base genuinely easy so you have something left for the MP segment.',
      'Lock into 5:41 by feel and rhythm, not just by staring at the watch.',
      'Use these to rehearse fueling at race pace.',
      'In heat, run MP effort (HR 165–175) rather than forcing the exact pace.',
    ],
    mistake: 'Running the MP segment too fast. Goal pace is the goal — faster is not better here and just costs you recovery.',
  },

  fasted: {
    key: 'fasted',
    label: 'fasted long run',
    oneLiner: 'Long run with no fuel — trains your body to burn fat efficiently.',
    what: 'A long run done on water and electrolytes only, no carbohydrate gels.',
    why: 'Trains fat metabolism and metabolic flexibility, teaching the body to spare its limited glycogen stores — a useful endurance adaptation for the marathon.',
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
    why: 'Hill sprints build power and strength and recruit fast-twitch muscle fibres — like strength training, but specific to running. The hill caps your speed and softens the impact, making them remarkably safe. For someone with a shin-splint history, this is a low-risk way to build strength and resilience.',
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
    what: 'Sustained running or long intervals at lactate threshold, ~4:50–5:00/km, heart rate 185–190.',
    why: 'Threshold work raises the pace at which lactate starts to accumulate — effectively lifting the ceiling on the speed you can hold for a long time. It is arguably the single most valuable workout type for marathon performance, and a cornerstone of the Magness approach.',
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
    what: 'Intervals slightly easier than threshold, ~5:00–5:15/km, heart rate 175–185, often in longer or more numerous reps.',
    why: 'Running just under the threshold "redline" lets you accumulate a large volume of quality work while keeping fatigue low — a Magness signature for steady, sustainable improvement without burning out. You get most of the threshold benefit at a fraction of the cost.',
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
    what: 'Hard intervals at ~4:25–4:35/km, heart rate 190+, in short reps with full recovery.',
    why: 'Develops VO2max and running economy at speed. Used in small doses later in the plan to add a top-end sharpness on top of the aerobic base.',
    feel: 'Hard. Breathing heavy and rhythmic. RPE 8 out of 10.',
    execute: [
      'Hit the prescribed pace but stay relaxed and smooth.',
      'Take full recoveries so you can hit each rep with quality.',
    ],
    mistake: 'Doing too much of this. VO2 work sharpens an existing base — it is a small part of marathon training, not the main event.',
  },

  bike: {
    key: 'bike',
    label: 'easy bike',
    oneLiner: 'Aerobic volume and active recovery with zero running impact.',
    what: 'Easy aerobic spin of 40–60 minutes, heart rate under 140.',
    why: 'Adds aerobic volume and aids recovery while sparing your shins and feet from impact — especially valuable given your injury history. It builds the engine without the pounding.',
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
    why: 'Training breaks the body down; rest is when it rebuilds stronger. Skipping rest is how you stall progress and pick up injuries — and with a shin-splint history, these days are non-negotiable insurance.',
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
    what: 'The marathon. 42.195 km at goal pace 5:41/km for a sub-4:00 finish.',
    why: 'Everything in the plan points here. The race rewards discipline in the first half and toughness in the last 10 km.',
    feel: 'The first half should feel almost too easy — that restraint is what banks the energy for the finish. The final 10 km is where it gets hard and where your training pays off.',
    execute: [
      'Wake 4:30 am, 80–100g carbs, then a 15-min jog with 4×100m strides ~25 min before start.',
      'km 0–5: hold back at 5:45–5:50 — resist the adrenaline.',
      'km 5–32: lock into 5:41 and stay smooth.',
      'km 32–42: hold goal pace or let it drift to 5:50 if needed.',
      'Only open up after km 38, once you know you will finish strong.',
      'Fuel every 25–30 min from km 8; take electrolytes throughout.',
    ],
    mistake: 'Going out too fast on fresh legs and adrenaline. Almost every blow-up in a marathon is paid for with an over-eager first 10 km.',
  },
};

export const EFFORT_GUIDE: Record<string, string> = {
  Recovery: 'Easiest gear. Flush fatigue, promote blood flow. You should finish fresher than you started.',
  Easy: 'Conversational. The foundation pace — most of your running lives here. If unsure, go slower.',
  Steady: 'Comfortably moderate. Short phrases, not full sentences. Controlled, never hard.',
  'Marathon (MP)': 'Goal race pace, 5:41/km. Should feel controlled and rhythmic. Rehearse fueling here.',
  'Sub-T': 'Just under the redline. Moderately hard but you finish reps wanting more. Accumulate quality cheaply.',
  Threshold: 'Comfortably hard — "could I hold this for an hour?" The most valuable workout pace.',
  'VO2 / CV': 'Hard and fast. Heavy breathing. Used sparingly to sharpen late in the plan.',
};
