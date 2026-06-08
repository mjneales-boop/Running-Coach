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
  const start = new Date(end.getTime() - days * 86_400_000);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

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

    // Oura sleep sessions are keyed by the night-start date (e.g. a Jun 7→8 overnight sleep
    // has day="2026-06-07"). Advance by 1 day so it aligns with the daily_readiness "wake date".
    const sleepByDay = new Map<string, SleepDoc>();
    for (const doc of sleepData.data) {
      const wakeDate = new Date(doc.day + 'T12:00:00Z');
      wakeDate.setUTCDate(wakeDate.getUTCDate() + 1);
      const wakeDay = wakeDate.toISOString().slice(0, 10);
      const existing = sleepByDay.get(wakeDay);
      if (!existing || (doc.total_sleep_duration ?? 0) > (existing.total_sleep_duration ?? 0)) {
        sleepByDay.set(wakeDay, doc);
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

    res.json({ data: result, range: { start: startStr, end: endStr } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
