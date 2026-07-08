import type { CoachMessage } from '../../types';

export function MessageBubble({ role, content }: CoachMessage) {
  if (role === 'user') {
    return (
      <div className="max-w-[84%] self-end whitespace-pre-wrap rounded-[15px_15px_4px_15px] border border-[rgba(0,217,255,0.28)] bg-accent-tint px-4 py-3 text-[14.5px] leading-relaxed text-ink">
        {content}
      </div>
    );
  }

  return (
    <div className="max-w-[84%] self-start">
      <div className="mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-accent">Coach</div>
      <div className="whitespace-pre-wrap rounded-[4px_15px_15px_15px] border border-hairline bg-surface px-4 py-3.5 text-[14.5px] leading-relaxed text-[#E4E9EE]">
        {content}
      </div>
    </div>
  );
}
