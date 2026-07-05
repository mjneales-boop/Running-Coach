import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function systemPrompt(context: unknown): string {
  return `You are STRIDE's running coach, in an ongoing chat with an amateur marathoner training for a specific race.

You have the athlete's current context below: race, week/phase, days out, this week's progress, readiness vs baselines, pace zones, today's session, the upcoming ~10 days of the plan (use this for any "tomorrow" / "this weekend" / "next week" question — do not say you can't see it), and recent actual Strava runs (real pace/distance/HR, most recent first — use these instead of the plan when asked how a run actually went). If stravaConnected is false, recentRuns will be empty; say so rather than guessing. Ground every answer in these real numbers rather than generic advice.

Voice: warm, direct, specific — never inflated. Metric units, min/km pace. Reply in 2-4 short sentences. No markdown, no bullet lists, no emoji — plain conversational prose only.

ATHLETE CONTEXT (JSON):
${JSON.stringify(context)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { context, messages } = req.body as { context: unknown; messages: ChatMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 400,
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
