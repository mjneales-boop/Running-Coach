import { useEffect, useRef, useState } from 'react';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { MessageBubble } from '../components/coach/MessageBubble';
import { QuickPromptChips } from '../components/coach/QuickPromptChips';
import { ChatInput } from '../components/coach/ChatInput';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { usePlan } from '../hooks/usePlan';
import { useCompletion } from '../hooks/useCompletion';
import { useReadiness } from '../hooks/useReadiness';
import { useCoachMessages } from '../hooks/useCoachMessages';
import { buildCoachContext, coachGreeting } from '../lib/coachContext';
import type { CoachMessage } from '../types';

const QUICK_PROMPTS = ["Pace Saturday's long run?", 'Swap Tuesday?', 'How did my last run look?'];

interface CoachScreenProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function CoachScreen({ activeTab, onTabChange }: CoachScreenProps) {
  const today = useCurrentDate();
  const { currentWeek, currentPhase } = usePlan(today, 0);
  const { completion } = useCompletion();
  const { latestEntry } = useReadiness();
  const { messages, setMessages } = useCoachMessages();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  async function send(history: CoachMessage[]) {
    setThinking(true);
    try {
      const context = buildCoachContext(today, completion, latestEntry);
      const r = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <div className="stride-rise border-b border-hairline px-[22px] pb-4 pt-2">
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
        {messages.length === 0 && !thinking && <MessageBubble role="assistant" content={coachGreeting(today)} />}
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
