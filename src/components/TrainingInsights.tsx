import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { buildSummary } from '../lib/trainingMetrics';
import type { StravaActivity } from '../types';

interface TrainingInsightsProps {
  stravaActivities: Record<string, StravaActivity>;
}

export function TrainingInsights({ stravaActivities }: TrainingInsightsProps) {
  const acts = useMemo(() => Object.values(stravaActivities), [stravaActivities]);
  const summary = useMemo(() => buildSummary(acts), [acts]);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setAnalysis('');
    setError(null);
    try {
      const r = await fetch('/api/analyze-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      const data = (await r.json()) as { analysis?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setAnalysis(data.analysis ?? 'No analysis returned.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    { label: 'Goal pace', value: summary.goalPace, unit: '/km' },
    { label: 'Longest run', value: `${summary.longestRunKm}`, unit: 'km' },
    { label: 'Peak week', value: `${summary.peakWeekKm}`, unit: 'km' },
    { label: 'Weeks to Lisbon', value: `${summary.weeksToRace}`, unit: '' },
  ];

  return (
    <div>
      {/* Section header */}
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: 'var(--text-muted)',
          textTransform: 'lowercase',
          marginBottom: 20,
        }}
      >
        {'// insights · strava'}
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {s.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--sans)',
                  fontWeight: 900,
                  fontSize: 30,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.value}
              </span>
              {s.unit && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                  {s.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly volume bar chart */}
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 16px 12px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11.5,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Weekly volume (km) · 13 weeks
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.weeks} barSize={18}>
              <XAxis
                dataKey="week"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--mono)' }}
                tickFormatter={(w: string) => w.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--mono)' }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--text)',
                }}
                formatter={(val) => [`${val ?? 0} km`, 'Volume']}
                labelFormatter={(w) => `Week of ${w}`}
              />
              <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                {summary.weeks.map((w, i) => (
                  <Cell key={i} fill={w.runs === 0 ? 'rgba(239,68,68,0.7)' : 'var(--accent)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>ran</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239,68,68,0.7)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>gap</span>
          </div>
        </div>
      </div>

      {/* Analyse button */}
      <button
        onClick={runAnalysis}
        disabled={loading}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'lowercase',
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: loading ? 'var(--bg-2)' : 'var(--accent)',
          color: loading ? 'var(--text-muted)' : '#0B0D0F',
          cursor: loading ? 'default' : 'pointer',
          transition: 'background 150ms, color 150ms',
        }}
      >
        {loading ? 'analysing…' : 'analyse my training'}
      </button>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 14,
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--danger)',
            letterSpacing: '0.02em',
          }}
        >
          {error}
        </div>
      )}

      {/* Opus analysis */}
      {analysis && (
        <div
          style={{
            marginTop: 24,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '24px 28px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              letterSpacing: '0.08em',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            // coach · opus 4.8
          </div>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 15,
              lineHeight: 1.75,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}
