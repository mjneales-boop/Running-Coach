import { useEffect, useMemo, useRef, useState } from 'react';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { MessageBubble } from '../components/coach/MessageBubble';
import { QuickPromptChips } from '../components/coach/QuickPromptChips';
import { ChatInput } from '../components/coach/ChatInput';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan } from '../hooks/usePlan';
import { usePlanConfig } from '../hooks/usePlanConfig';
import { useCompletion } from '../hooks/useCompletion';
import { useReadiness } from '../hooks/useReadiness';
import { useCoachMessages } from '../hooks/useCoachMessages';
import { useStrava } from '../hooks/useStrava';
import { useSwaps } from '../hooks/useSwaps';
import { useGymSchedule } from '../hooks/useGymSchedule';
import { useStorage } from '../hooks/useStorage';
import { applyPlanOverrides } from '../lib/logic';
import { buildCoachContext, coachGreeting } from '../lib/coachContext';
import { supabase } from '../lib/supabase';
import type { CoachMessage, StravaActivity } from '../types';

const QUICK_PROMPTS = ["Pace Saturday's long run?", 'Swap Tuesday?', 'How did my last run look?'];

/**
 * How stale the Strava cache may be before a question is worth delaying for a sync. The
 * background auto-sync only fires every 15 min, so a run that landed on Strava mid-session
 * was invisible to the coach — which is exactly when the athlete asks about it. Tighter
 * than that window, but not every message: a same-minute follow-up shouldn't re-hit Strava.
 */
const COACH_SYNC_STALE_MS = 3 * 60 * 1000;

interface CoachScreenProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function CoachScreen({ activeTab, onTabChange }: CoachScreenProps) {
  const today = useCurrentDate();
  const { currentWeek, currentPhase } = usePlan(today, 0);
  const rawPlan = usePlanConfig();
  const { completion } = useCompletion();
  const { latestEntry } = useReadiness();
  const { messages, setMessages } = useCoachMessages();
  const strava = useStrava();
  const { swaps } = useSwaps();
  const { gymOverrides } = useGymSchedule();
  // The coach must reason about the plan the athlete actually sees. Without this it reads
  // the raw generated plan, so on any swapped day it names the wrong session — and then
  // pairs "your long run" with whatever Strava run sat on the pre-swap date.
  const plan = useMemo(
    () => ({ ...rawPlan, weeks: applyPlanOverrides(rawPlan.weeks, swaps, gymOverrides) }),
    [rawPlan, swaps, gymOverrides],
  );
  const [stravaActivities] = useStorage<Record<string, StravaActivity>>('marathon-strava', {});
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  // Read through a ref: a sync mid-send auto-completes the sessions it just pulled, and the
  // `completion` captured by this render's closure would miss them (understating week km).
  const completionRef = useRef(completion);
  useEffect(() => {
    completionRef.current = completion;
  }, [completion]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  async function send(history: CoachMessage[]) {
    setThinking(true);
    try {
      // Pull straight from sync's return value rather than waiting for the storage event to
      // land in `stravaActivities` — this render's state won't have it yet. Cached data is
      // a fine fallback: a Strava hiccup should slow the answer, not block it.
      let activities = stravaActivities;
      const syncStale = !strava.lastSynced || Date.now() - strava.lastSynced.getTime() > COACH_SYNC_STALE_MS;
      if (strava.connected === true && syncStale && !strava.syncing) {
        try {
          activities = await strava.sync(7);
          // Yield one macrotask so React flushes the completion writes sync just made,
          // before completionRef is read below.
          await new Promise((resolve) => setTimeout(resolve, 0));
        } catch {
          /* keep the cached activities */
        }
      }
      const context = buildCoachContext(today, completionRef.current, latestEntry, activities, plan);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const r = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ context, messages: history }),
      });
      const data = (await r.json()) as { reply?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      await setMessages([...history, { role: 'assistant', content: data.reply ?? 'No reply.' }]);
    } catch (e) {
      await setMessages([
        ...history,
        { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.' },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    void setMessages(next);
    setInput('');
    void send(next);
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas">
      <div
        className="stride-rise border-b border-hairline px-[22px] pb-4"
        style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}
      >
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-muted">
          In context · wk {currentWeek.num} {currentPhase.short.toLowerCase()}
        </div>
        <h1
          className="mt-2.5 font-display text-[32px] font-extrabold uppercase leading-none tracking-[-0.01em]"
          style={{ fontVariationSettings: "'wdth' 120" }}
        >
          Coach
        </h1>
      </div>

      <div ref={transcriptRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-[22px] pb-2 pt-5">
        {messages.length === 0 && !thinking && <MessageBubble role="assistant" content={coachGreeting(today, plan)} />}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {thinking && (
          <div className="flex items-center gap-1.5 self-start px-0.5 py-1.5">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent" />
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent [animation-delay:0.2s]" />
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      <div className="border-t border-hairline bg-[rgba(10,12,14,0.6)] px-4 pb-[calc(92px+env(safe-area-inset-bottom)+12px)] pt-2.5">
        <QuickPromptChips prompts={QUICK_PROMPTS} onSelect={submit} disabled={thinking} />
        <ChatInput value={input} onChange={setInput} onSend={() => submit(input)} disabled={thinking} />
      </div>

      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  );
}
