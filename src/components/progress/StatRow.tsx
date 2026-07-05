interface Stat {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}

interface StatRowProps {
  stats: Stat[];
}

export function StatRow({ stats }: StatRowProps) {
  return (
    <div className="stride-rise mb-7 grid grid-cols-3 gap-0.5">
      {stats.map((s, i) => (
        <div key={s.label} className={`px-1 ${i > 0 ? 'border-l border-hairline pl-2' : 'pr-1'}`}>
          <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{s.label}</div>
          <div className={`font-display text-[26px] font-extrabold ${s.accent ? 'text-accent' : ''}`}>
            {s.value}
            {s.unit && <span className="ml-0.5 text-xs font-medium text-muted">{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
