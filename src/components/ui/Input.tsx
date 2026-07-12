import type { ChangeEventHandler, FocusEventHandler } from 'react';

interface InputProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  unit?: string;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  align?: 'left' | 'right';
  className?: string;
}

export function Input({
  value,
  onChange,
  onFocus,
  onBlur,
  unit,
  placeholder,
  inputMode = 'text',
  align = 'left',
  className = '',
}: InputProps) {
  return (
    <div className={`flex min-w-0 items-baseline gap-2 rounded-[9px] border border-hairline-strong bg-field px-3 ${className}`}>
      <input
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        className={`min-w-0 flex-1 bg-transparent py-2.5 font-display text-base font-bold text-ink outline-none ${
          align === 'right' ? 'text-right' : ''
        }`}
      />
      {unit && <span className="font-mono text-[10px] tracking-[0.1em] text-faint">{unit}</span>}
    </div>
  );
}
