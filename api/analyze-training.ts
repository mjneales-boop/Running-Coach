import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a sharp, honest endurance running coach analysing an amateur marathoner's training data.

The athlete's goal: sub-4:00 at the EDP Lisbon Marathon on 10 October 2026. Sub-4:00 requires averaging 5:41/km for the full 42.2km.

Your job: read the supplied training summary (weekly volume, long-run progression, pace distribution, key stats) and give a tight, specific, honest assessment. Cover, in order:
1. Whether the underlying speed/engine is there relative to goal pace.
2. Consistency — call out volume gaps (illness, travel) bluntly; a marathon build wants a steady upward staircase.
3. The long run — current longest vs the ~30–32km a confident sub-4 wants, and whether the runway is enough.
4. One clear verdict on whether sub-4 is realistic on the current trajectory, and the single biggest thing to fix.

Rules: be direct and encouraging but never inflate. Use metric units and min/km pace. No bullet-point spam — write in clear prose, 4–6 short paragraphs. Don't pad with disclaimers. Don't restate every number; interpret them.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const summary = req.body;

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is my training summary as JSON. Give me your read.\n\n${JSON.stringify(summary)}`,
        },
      ],
    });

    const analysis = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ analysis });
  } catch (err) {
    console.error('analyze-training failed', err);
    return res.status(500).json({ error: 'Analysis failed' });
  }
}
