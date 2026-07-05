interface ScreenHeaderProps {
  onAvatarClick: () => void;
  initials?: string;
}

export function ScreenHeader({ onAvatarClick, initials = 'MX' }: ScreenHeaderProps) {
  return (
    <div className="flex items-center justify-between py-0.5 pb-5">
      <div
        className="font-display text-[19px] font-black tracking-[0.34em]"
        style={{ fontVariationSettings: "'wdth' 118" }}
      >
        STRIDE
      </div>
      <button
        onClick={onAvatarClick}
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-hairline-strong bg-gradient-to-br from-[#1c2228] to-[#0e1114] font-mono text-xs text-muted"
      >
        {initials}
      </button>
    </div>
  );
}

interface SettingsHeaderProps {
  onBack: () => void;
}

export function SettingsHeader({ onBack }: SettingsHeaderProps) {
  return (
    <div className="flex items-center gap-3.5 pb-[18px] pt-0.5">
      <button
        onClick={onBack}
        className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border border-hairline-strong"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth={2}>
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-muted">Account</div>
    </div>
  );
}
