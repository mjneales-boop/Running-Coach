interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-hairline-strong bg-surface py-1.5 pl-4 pr-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="Ask your coach…"
        disabled={disabled}
        className="flex-1 bg-transparent font-display text-[15px] text-ink outline-none placeholder:text-faint"
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-accent disabled:opacity-40"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-ink)" strokeWidth={2.4}>
          <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
