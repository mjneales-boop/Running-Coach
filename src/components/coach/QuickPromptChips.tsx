interface QuickPromptChipsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickPromptChips({ prompts, onSelect, disabled }: QuickPromptChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2.5">
      {prompts.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          disabled={disabled}
          className="flex-none whitespace-nowrap rounded-full border border-hairline-strong px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted disabled:opacity-40"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
