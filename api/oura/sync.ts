import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureValidToken } from '../../lib/oura-refresh.js';

interface DailyReadinessDoc {
  day: string;
  score: number | null;
}

interface SleepDoc {
  day: string;
  average_hrv: number | null;
  lowest_heart_rate: number | null;
  total_sleep_duration: number | null; // seconds
}

interface OuraCollectionResponse<T> {
  data: T[];
}

type ReadinessEntry = { score?: number; hrv?: number; rhr?: number; sleep?: number };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = await ensureValidToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not connected' });

  const days = Math.min(90, Math.max(1, Number(req.query.days ?? 30)));
  const end = new Date();
  const endWithBuffer = new Date(end.getTime() + 86_400_000);
  const start = new Date(end.getTime() - days * 86_400_000);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = endWithBuffer.toISOString().slice(0, 10);

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [readinessRes, sleepRes] = await Promise.all([
      fetch(
        `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startStr}&end_date=${endStr}`,
        { headers },
      ),
      fetch(
        `https://api.ouraring.com/v2/usercollection/sleep?start_date=${startStr}&end_date=${endStr}`,
        { headers },
      ),
    ]);

    if (!readinessRes.ok || !sleepRes.ok) {
      return res.status(502).json({
        error: 'Oura API error',
        readiness: readinessRes.status,
        sleep: sleepRes.status,
      });
    }

    const readinessData = (await readinessRes.json()) as OuraCollectionResponse<DailyReadinessDoc>;
    const sleepData = (await sleepRes.json()) as OuraCollectionResponse<SleepDoc>;

    const result: Record<string, ReadinessEntry> = {};

    for (const doc of readinessData.data) {
      if (doc.score != null) {
        if (!result[doc.day]) result[doc.day] = {};
        result[doc.day].score = doc.score;
      }
    }

    // Pick the longest sleep per day (ignores naps). Oura uses the wake date as day key,
    // same convention as daily_readiness, so no offset needed.
    const sleepByDay = new Map<string, SleepDoc>();
    for (const doc of sleepData.data) {
      const existing = sleepByDay.get(doc.day);
      if (!existing || (doc.total_sleep_duration ?? 0) > (existing.total_sleep_duration ?? 0)) {
        sleepByDay.set(doc.day, doc);
      }
    }

    for (const [day, doc] of sleepByDay) {
      if (!result[day]) result[day] = {};
      if (doc.average_hrv != null) result[day].hrv = doc.average_hrv;
      if (doc.lowest_heart_rate != null) result[day].rhr = doc.lowest_heart_rate;
      if (doc.total_sleep_duration != null) {
        result[day].sleep = +(doc.total_sleep_duration / 3600).toFixed(1);
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: result, range: { start: startStr, end: endStr } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
