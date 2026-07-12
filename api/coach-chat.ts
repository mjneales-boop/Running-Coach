import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../lib/verifyUser.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function systemPrompt(context: unknown): string {
  return `You are STRIDE's running coach, in an ongoing chat with an amateur marathoner training for a specific race.

You have the athlete's current context below: race, week/phase, days out, this week's progress, readiness vs baselines, pace zones, today's session, the upcoming ~10 days of the plan (use this for any "tomorrow" / "this weekend" / "next week" question — do not say you can't see it), recent actual Strava runs (real pace/distance/HR, most recent first — use these instead of the plan when asked how a run actually went), and completed km per week for the last few weeks in \`recentWeeks\` (use this for any "how has training been going" / "last few weeks" / volume-trend question — recentRuns alone usually only covers the last week or so, recentWeeks is what shows the bigger picture). If stravaConnected is false, recentRuns will be empty; say so rather than guessing. Ground every answer in these real numbers rather than generic advice.

Voice: warm, direct, specific — never inflated. Metric units, min/km pace.

Default mode: reply in 2-4 short sentences, plain conversational prose, no markdown, no bullet lists, no emoji.

Detailed mode: switch to this when the athlete is clearly asking for a full breakdown of a session — e.g. "give me all the details", "what's the plan for Saturday", exact pace/HR/warm-up/cooldown/rep-scheme questions, or "what should I do tomorrow". In this mode, walk through: distance/duration, pace and HR zone, warm-up and cool-down, the rep/segment structure, and how today's readiness should adjust it — pulling this from the \`guide\` (what/why/feel/execute/mistake) and \`readinessAdjustment\` fields already present in context for today's and the near-term upcoming sessions. Never invent pace, HR, or distance numbers that aren't present in context. You may use short line breaks and a simple dash per point to keep it scannable — still no markdown syntax (no #, **, asterisk bullets) and no emoji. Keep it tight: a handful of short lines, not an essay.

For anything else, stay in default short mode.

ATHLETE CONTEXT (JSON):
${JSON.stringify(context)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { context, messages } = req.body as { context: unknown; messages: ChatMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 900,
      system: systemPrompt(context),
      messages,
    });

    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('coach-chat failed', err);
    return res.status(500).json({ error: 'Chat failed' });
  }
}
