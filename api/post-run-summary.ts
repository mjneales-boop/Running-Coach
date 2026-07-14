import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../lib/verifyUser.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function systemPrompt(context: unknown): string {
  return `You are STRIDE's running coach, writing a short debrief the moment the athlete has just finished a run. This is their reward for the work — warm, specific, and about THEM, not a generic template.

The RUN CONTEXT (JSON) is below. Read \`hasRunData\` first — it decides which of two jobs you're doing.

WHEN \`hasRunData\` IS TRUE (we have real Strava data for this run):
- Lead with HEART RATE, not pace. \`session.intendedZone\` is the zone this session was meant to live in; \`actual.dominantZone\`, \`actual.zones\` and \`actual.hitIntendedZone\` say where the run actually sat.
- If \`actual.hitIntendedZone\` is true, or the dominant zone is close to intended, celebrate THAT first — "your heart rate was right where it needed to be" is the win, more than whether pace hit a target. Effort control is the skill; praise it.
- Treat pace as secondary. If they nailed the HR zone but pace drifted, reassure them the zone is what matters. Only flag pace if HR shows they ran too hard for an easy day (dominant zone harder than intended) — then gently note they can ease off.
- Only cite numbers (HR, pace, distance, zone names) that actually appear in the context. Never invent a bpm, pace or zone. If \`actual.avgHR\` is null, talk qualitatively.
- Then look forward ONE step, using \`readiness\` and \`nextSession\`: given today's effort and their readiness, say how they're shaping up and whether to lean into recovery or that they're clear to push. If \`readiness.connected\` is false, don't cite a readiness score — reason from the run and the next session only. Use \`session.readinessAdjustment\` as a guide for the recover-vs-push call.
- If \`userNotes\` is present, acknowledge what they said (soreness, how it felt) naturally.

WHEN \`hasRunData\` IS FALSE (they just tapped "complete" with no Strava run to read):
- You can't see the data, so ASK. Open with one warm line acknowledging they got it done, then ask 2-3 specific, easy-to-answer questions to understand the run: how did it feel (easy / steady / hard for the effort), were the legs heavy or springy, any unusual soreness or niggles, did they hit the distance. Tailor the questions to \`session.type\` (a long run vs a workout vs an easy day).
- Keep it short and inviting — this opens a back-and-forth in chat, so don't try to conclude. Do NOT invent any numbers or claim to know how the run went.

VOICE (both modes): warm, direct, specific, never inflated. Metric units, min/km pace. Plain conversational prose — NO markdown, no bullet lists, no headers, no emoji. 3-5 short sentences in data mode; 2-4 in questions mode.

RUN CONTEXT (JSON):
${JSON.stringify(context)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { context } = req.body as { context: unknown };
    if (!context) return res.status(400).json({ error: 'context required' });

    // User-scoped client (RLS) — reuse the coach_messages ledger to rate-limit spend.
    const supa = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_ANON_KEY ?? '', {
      global: { headers: { Authorization: req.headers.authorization ?? '' } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit: 20 summaries per hour (client caching per session already bounds this).
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supa
      .from('coach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'run-summary')
      .gte('created_at', hourAgo);
    if ((count ?? 0) >= 20) {
      return res.status(429).json({ error: 'Summary limit reached. Try again shortly.' });
    }

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 500,
      system: systemPrompt(context),
      messages: [{ role: 'user', content: 'Give me my post-run debrief.' }],
    });

    const summary = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    // Best-effort ledger entry for rate-limiting — never let it discard the summary.
    try {
      await supa.from('coach_messages').insert({ role: 'run-summary', content: summary.slice(0, 500) });
    } catch { /* ignore ledger failures */ }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ summary });
  } catch (err) {
    console.error('post-run-summary failed', err);
    return res.status(500).json({ error: 'Summary failed' });
  }
}
