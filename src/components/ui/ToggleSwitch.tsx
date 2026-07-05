interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 flex-none items-center rounded-full p-[3px] transition-colors ${
        checked ? 'justify-end bg-accent' : 'justify-start bg-surface-2'
      }`}
    >
      <span className="h-[22px] w-[22px] rounded-full bg-white" />
    </button>
  );
}
