import { useMemo, useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { buildSummary } from '../lib/trainingMetrics';
import type { StravaActivity } from '../types';

interface TrainingInsightsProps {
  stravaActivities: Record<string, StravaActivity>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function TrainingInsights({ stravaActivities }: TrainingInsightsProps) {
  const acts = useMemo(() => Object.values(stravaActivities), [stravaActivities]);
  const summary = useMemo(() => buildSummary(acts), [acts]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(history: ChatMessage[]) {
    setLoading(true);
    try {
      const r = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, messages: history }),
      });
      const data = (await r.json()) as { reply?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setMessages([...history, { role: 'assistant', content: data.reply ?? 'No reply.' }]);
    } catch (e) {
      setMessages([
        ...history,
        { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function start() {
    const seed: ChatMessage[] = [
      { role: 'user', content: 'Give me your honest read on where my training stands for sub-4 at Lisbon.' },
    ];
    setMessages(seed);
    void send(seed);
  }

  function submit() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    void send(next);
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

      {/* Chat */}
      {messages.length === 0 ? (
        <button
          onClick={start}
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
      ) : (
        <div>
          {/* Transcript */}
          <div
            ref={transcriptRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              maxHeight: 480,
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                    textTransform: 'lowercase',
                  }}
                >
                  {m.role === 'user' ? 'you' : '// coach · opus 4.8'}
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.75,
                    fontSize: 15,
                    fontFamily: 'var(--sans)',
                    background: m.role === 'user' ? 'var(--bg-2)' : 'transparent',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    color: 'var(--text)',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                coach is thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="ask a follow-up — e.g. what should my long run be this week?"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={submit}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-2)',
                color: input.trim() && !loading ? '#0B0D0F' : 'var(--text-muted)',
                border: 'none',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                fontWeight: 600,
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                transition: 'background 150ms, color 150ms',
              }}
            >
              send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
