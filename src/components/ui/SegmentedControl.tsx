interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-1.5 rounded-xl border border-hairline bg-field p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg py-2.5 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
              active ? 'bg-accent text-accent-ink' : 'text-muted'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
