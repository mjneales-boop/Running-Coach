import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../lib/verifyUser.js';
import { generatedPlanSchema, CANONICAL_ZONES, type GeneratedPlan } from '../lib/planSchema.js';
import { buildSessionGuide } from '../src/lib/sessionGuides.js';
import type { Week } from '../src/types/index.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Plan generation streams a large JSON payload — allow up to 5 minutes.
export const config = { maxDuration: 300 };

interface ProfileRow {
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  sex: string | null;
  experience: string | null;
  weekly_km_current: number | null;
  days_per_week: number | null;
  injury_history: string | null;
  recent_race_times: { distance: string; time: string }[] | null;
  include_strength: boolean | null;
  strength_days: number | null;
  race_name: string | null;
  race_date: string | null;
  race_time: string | null;
  goal_time: string | null;
}

function guideReferenceText(): string {
  const guide = buildSessionGuide({}); // neutral, de-personalized
  return Object.values(guide)
    .map(
      (g) =>
        `### ${g.label}\nWHAT: ${g.what}\nWHY: ${g.why}\nFEEL: ${g.feel}\nEXECUTE: ${g.execute.join(' | ')}\nMISTAKE: ${g.mistake}`,
    )
    .join('\n\n');
}

// Monday of the CURRENT calendar week, so today falls inside week 1 of the plan
// (Mon→Sun). Starting on next Monday left a dead gap where today had no session.
function currentWeekMonday(from: Date): string {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const diff = day === 0 ? -6 : 1 - day; // days back to this week's Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function systemPrompt(mode: 'race' | 'general', strengthDays: number): string {
  return `You are STRIDE's head coach, generating a personalized running training plan. You follow Magness-style training principles:

- Build a large aerobic base. The majority of weekly volume is genuinely easy, conversational running.
- Easy means easy: if in doubt, slower. Hard days are hard because easy days are easy.
- Sub-threshold volume is the primary quality workhorse: intervals just below the redline, controlled, repeatable.
- True threshold work is used deliberately and kept controlled — never a race.
- VO2/CV work is used sparingly and only late in a build, to sharpen an existing base.
- Strides and hill sprints develop economy and power at very low injury cost; sprinkle them onto easy days.
- Every 3rd or 4th week is a cutback week (volume reduced ~20-30%) to absorb training.
- Ramp rate: weekly volume grows no more than ~10% per week from the athlete's stated current volume.
- Long runs progress steadily; in race builds, later long runs finish with goal-pace segments.
- Race mode ends with a 2-3 week taper into race day.
- Respect the athlete's available days per week exactly — all other days are REST.
- Respect injury history: if the athlete is injury-prone, be conservative with volume and impact; an easy bike (type BIKE) can substitute for an easy run.
- Account for the athlete's age: masters runners (40+) recover more slowly — use a gentler volume ramp, more recovery/easy days between quality, and cap high-intensity (VO2/threshold) frequency; for 55+ be more conservative still. Younger athletes (under ~30) tolerate a steeper progression and more frequent quality.
${strengthDays > 0 ? `- The athlete wants EXACTLY ${strengthDays} gym/strength session${strengthDays > 1 ? 's' : ''} per week: schedule exactly ${strengthDays} per week on easy or rest days using the "gym" (display name) + "workoutId" fields. Valid workoutId values: "chestback", "shouldersarms", "legs". Include "legs" at least once${strengthDays > 1 ? ' each week' : ''}. Never schedule more or fewer than ${strengthDays}.` : '- The athlete does NOT want gym days: never set the gym or workoutId fields.'}

## Session-guide reference (the coach's voice — your sessions MUST be consistent with these definitions)

${guideReferenceText()}

## Output format

Respond with ONLY a JSON object — no markdown fences, no commentary. Shape:

{
  "weeks": [ { "id": "w1", "label": "Week 1 · Base", "num": "1", "phase": 1, "dateStart": "YYYY-MM-DD", "dateEnd": "YYYY-MM-DD", "targetKm": 30, "cutback": false, "days": [ { "d": "mon", "date": "YYYY-MM-DD", "type": "EASY", "title": "Easy 6 km + 4×100m strides", "km": 6, "pace": "6:30–7:00", "strides": "4×100m", "notes": "..." }, ... exactly 7 entries mon→sun ... ] } ],
  "zones": [ { "name": "...", "pace": "m:ss–m:ss", "hr": "..." } ],
  "phases": [ { "num": 1, "name": "...", "short": "...", "weeks": "1-4", "color": "#2C7CB0", "blurb": "..." } ],
  "goalPace": "m:ss",
  "suggestedGoalTime": "H:MM:SS",
  "planNotes": "..."
}

Hard rules:
- Weeks run Monday→Sunday. Every week has exactly 7 day entries in order mon,tue,wed,thu,fri,sat,sun. Rest days are type REST with title "Rest".
- Day types: LONG (long run), WORKOUT (quality session), EASY, BIKE, REST${mode === 'race' ? ', RACE (race day only)' : ''}.
- WORKOUT titles MUST name the session kind explicitly using one of: "Sub-T", "Threshold", "CV", "Steady", "Hill sprints" (e.g. "Sub-T 5×6min @ 5:10"). LONG runs with goal-pace segments must include "MP" in the title.
- zones: exactly these 7 names in this order: ${CANONICAL_ZONES.join(', ')}. Mark the race-pace zone with "hero": true. Derive paces from the athlete's recent race times when given; otherwise estimate conservatively from experience and current volume.
- goalPace: the athlete's target race pace in min/km (m:ss)${mode === 'general' ? ' — in general mode, set it to a realistic current marathon-effort pace to anchor the zones' : ''}.
- For the main quality session of each week, include "chartPace": {"category": "subThreshold"|"threshold"|"marathonPace"|"intro", "secPerKm": N} so progress charts can plot workout pace.
- targetKm is the planned weekly running volume in km; it must match the sum of the running distances that week (±2km).
- phases: give each phase a distinct hex color from this palette: #2E6E75, #2C7CB0, #2497CE, #16B9DC, #00D9FF.
${
  mode === 'race'
    ? `- Race mode: periodize from the start date to race day. Structure: base → strength/threshold → race-specific (MP work) → taper. The final week has "race": true and race day is type RACE. Mark the biggest-volume week "peak": true. Minimum ~8 weeks, maximum 20; if the race is closer than 8 weeks, produce a safe compressed build and say so in planNotes.`
    : `- General fitness mode: generate exactly 4 weeks (one rolling block). Use a single phase {num: 1}. Focus on consistency: aerobic volume, one sub-T quality session per week, strides. No RACE day.`
}
- If the athlete asked you to suggest a goal time, set suggestedGoalTime; otherwise omit it.`;
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
}

async function generateOnce(system: string, messages: Anthropic.MessageParam[]): Promise<string> {
  const stream = anthropic.messages.stream({
    // Sonnet 5 (not the coach's Opus): a full 18-week plan is ~15k tokens of
    // JSON, which Opus streams for 4+ minutes — past the function limit once a
    // validation retry is needed. Sonnet generates it in ~1 minute.
    model: 'claude-sonnet-5',
    max_tokens: 64000,
    thinking: { type: 'adaptive' },
    system,
    messages,
  });
  const final = await stream.finalMessage();
  if (final.stop_reason === 'max_tokens') {
    throw new Error('generation truncated (max_tokens)');
  }
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // User-scoped client: RLS applies, user_id columns default to auth.uid().
  const supabase = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_ANON_KEY ?? '', {
    global: { headers: { Authorization: req.headers.authorization ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { extend } = (req.body ?? {}) as { extend?: boolean };

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select(
        'age, weight_kg, height_cm, sex, experience, weekly_km_current, days_per_week, injury_history, recent_race_times, include_strength, strength_days, race_name, race_date, race_time, goal_time',
      )
      .maybeSingle<ProfileRow>();
    if (profErr) throw profErr;
    if (!profile) return res.status(400).json({ error: 'No profile — complete onboarding first' });

    // Rate limit: 3 plan generations per user per day (guards the LLM spend).
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: plansToday } = await supabase
      .from('plans')
      .select('id', { count: 'exact', head: true })
      .gte('generated_at', startOfDay.toISOString());
    if ((plansToday ?? 0) >= 3) {
      return res.status(429).json({ error: 'Daily plan limit reached (3 per day). Try again tomorrow.' });
    }

    // Prefer the explicit count; fall back to the legacy boolean (→ 3/week).
    const strengthDays = profile.strength_days ?? (profile.include_strength ? 3 : 0);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const startDate = currentWeekMonday(today);

    let mode: 'race' | 'general' = profile.race_name && profile.race_date ? 'race' : 'general';
    let previousWeeks: Week[] = [];
    let userContext: Record<string, unknown> = {
      today: todayStr,
      planStartDate: startDate,
      athlete: {
        age: profile.age,
        weightKg: profile.weight_kg,
        heightCm: profile.height_cm,
        sex: profile.sex,
        experience: profile.experience,
        currentWeeklyKm: profile.weekly_km_current,
        daysAvailablePerWeek: profile.days_per_week,
        injuryHistory: profile.injury_history || 'none reported',
        recentRaceTimes: profile.recent_race_times ?? [],
        strengthDaysPerWeek: strengthDays,
      },
    };

    if (mode === 'race' && !extend) {
      userContext = {
        ...userContext,
        race: {
          name: profile.race_name,
          date: profile.race_date,
          startTime: profile.race_time ?? '08:00',
          goalTime: profile.goal_time || 'not set — please suggest one (suggestedGoalTime)',
        },
      };
    }

    if (extend) {
      // Rolling general-fitness block: append 4 more weeks to the active plan.
      const { data: activePlan, error: planErr } = await supabase
        .from('plans')
        .select('id, mode, weeks, zones, phases')
        .eq('active', true)
        .maybeSingle();
      if (planErr) throw planErr;
      if (!activePlan || activePlan.mode !== 'general') {
        return res.status(400).json({ error: 'extend requires an active general-fitness plan' });
      }
      previousWeeks = activePlan.weeks as Week[];
      const lastWeek = previousWeeks[previousWeeks.length - 1];
      const daysLeft = Math.ceil((new Date(`${lastWeek.dateEnd}T23:59:59`).getTime() - today.getTime()) / 86400000);
      if (daysLeft > 10) {
        return res.status(409).json({ error: 'current block still has more than 10 days left' });
      }
      mode = 'general';

      const { data: completionRows, error: compErr } = await supabase.from('completions').select('entry');
      if (compErr) throw compErr;
      const completion = new Map<string, { done?: boolean; actualKm?: number; actualPace?: string }>();
      for (const row of completionRows ?? []) {
        const entry = row.entry as { weekId: string; day: string; done?: boolean; actualKm?: number; actualPace?: string };
        completion.set(`${entry.weekId}-${entry.day}`, entry);
      }
      const recentWeeks = previousWeeks.slice(-4).map((w) => ({
        id: w.id,
        targetKm: w.targetKm,
        completedKm: w.days.reduce((sum, d) => {
          const e = completion.get(`${w.id}-${d.d}`);
          return e?.done ? sum + (e.actualKm ?? d.km ?? 0) : sum;
        }, 0),
        actualPaces: w.days
          .map((d) => completion.get(`${w.id}-${d.d}`)?.actualPace)
          .filter(Boolean),
      }));

      userContext = {
        ...userContext,
        extension: {
          instruction:
            'Generate the NEXT 4-week block continuing this athlete\'s plan. Base volume on their ACTUAL completed volume below, not the previous targets. Continue week ids/nums sequentially after the last existing week. The new block starts the Monday after the last existing week ends.',
          lastExistingWeek: { id: lastWeek.id, num: lastWeek.num, dateEnd: lastWeek.dateEnd },
          recentPerformance: recentWeeks,
        },
      };
    }

    const system = systemPrompt(mode, strengthDays);
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: `ATHLETE (JSON):\n${JSON.stringify(userContext)}` },
    ];

    // First attempt, then one retry with the validation error fed back.
    let plan: GeneratedPlan | null = null;
    let lastError = '';
    let lastRaw = '';
    for (let attempt = 0; attempt < 2 && !plan; attempt++) {
      if (attempt > 0) {
        messages.push(
          { role: 'assistant', content: lastRaw || '(no output)' },
          {
            role: 'user',
            content: `Your previous output failed validation:\n${lastError}\nRespond again with ONLY the corrected JSON object.`,
          },
        );
      }
      lastRaw = await generateOnce(system, messages);
      try {
        const parsed = generatedPlanSchema.safeParse(JSON.parse(stripFences(lastRaw)));
        if (parsed.success) {
          plan = parsed.data;
        } else {
          lastError = JSON.stringify(parsed.error.issues.slice(0, 12));
        }
      } catch (e) {
        lastError = `not valid JSON: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (!plan) {
      console.error('generate-plan validation failed twice', lastError.slice(0, 500));
      return res.status(422).json({ error: 'Plan generation failed validation — please try again', detail: lastError.slice(0, 500) });
    }

    const weeks: Week[] = extend ? [...previousWeeks, ...(plan.weeks as Week[])] : (plan.weeks as Week[]);

    // Persist: profile pace/goal updates, deactivate old plan, insert new active plan.
    const profilePatch: Record<string, unknown> = { goal_pace: plan.goalPace };
    if (mode === 'race' && !profile.goal_time && plan.suggestedGoalTime) {
      profilePatch.goal_time = plan.suggestedGoalTime;
    }
    if (mode === 'race' && !profile.race_time) profilePatch.race_time = '08:00';
    const { error: patchErr } = await supabase.from('profiles').update(profilePatch).eq('id', user.id);
    if (patchErr) throw patchErr;

    const { error: deactErr } = await supabase.from('plans').update({ active: false }).eq('active', true);
    if (deactErr) throw deactErr;

    const { error: insErr } = await supabase.from('plans').insert({
      mode,
      weeks,
      zones: plan.zones,
      phases: plan.phases,
      active: true,
    });
    if (insErr) throw insErr;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      mode,
      weekCount: weeks.length,
      planNotes: plan.planNotes ?? null,
    });
  } catch (err) {
    console.error('generate-plan failed', err);
    return res.status(500).json({ error: 'Plan generation failed' });
  }
}
