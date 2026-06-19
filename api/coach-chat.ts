import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function systemPrompt(summary: unknown): string {
  return `You are a sharp, honest endurance running coach in an ongoing conversation with an amateur marathoner.

Goal: sub-4:00 at the EDP Lisbon Marathon on 10 October 2026. Sub-4:00 = averaging 5:41/km for 42.2km.

You have the athlete's current training summary below. Use it to ground every answer — reference their real numbers (weekly volume, long-run progression, pace mix, weeks remaining) rather than generic advice.

Voice: direct, specific, encouraging but never inflating. Metric units, min/km pace. Prose, not bullet spam. Keep replies as short as the question allows — a one-line question gets a few sentences, a planning question gets a short paragraph or two. Don't restate all the data; interpret what's relevant to what was asked.

CURRENT TRAINING SUMMARY (JSON):
${JSON.stringify(summary)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { summary, messages } = req.body as { summary: unknown; messages: ChatMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      system: systemPrompt(summary),
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
