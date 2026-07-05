import type { ReactNode } from 'react';
import { SettingsHeader } from '../components/ui/ScreenHeader';
import { Eyebrow } from '../components/ui/Eyebrow';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { Input } from '../components/ui/Input';
import { useOura } from '../hooks/useOura';
import { useStrava } from '../hooks/useStrava';
import { useSettings } from '../hooks/useSettings';
import { ATHLETE, RACE_NAME, RACE_DATE, GOAL_TIME, GOAL_PACE } from '../constants/plan';
import { WEEKS } from '../hooks/usePlan';

function raceShortName() {
  return RACE_NAME.replace(/^EDP\s+/i, '').replace(/\s+\d{4}$/, '');
}

function formatRaceDateEU(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

function formatGoalTime(hms: string) {
  const [h, m] = hms.split(':');
  return `${Number(h)}:${m}`;
}

function Chevron() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth={2}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-[26px]">
      <Eyebrow className="mb-3">{title}</Eyebrow>
      <div className="rounded-2xl border border-hairline bg-surface px-5">{children}</div>
    </div>
  );
}

function SettingsRow({ label, value, onClick }: { label: string; value: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between gap-3.5 border-t border-hairline py-[17px] first:border-t-0 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className="text-[15.5px] font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        {value}
        <Chevron />
      </span>
    </div>
  );
}

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ConnectionRow({
  icon,
  name,
  subtitle,
  connected,
  onToggle,
  onSync,
  syncing,
  lastSynced,
}: {
  icon: ReactNode;
  name: string;
  subtitle: string;
  connected: boolean | null;
  onToggle: () => void;
  onSync?: () => void;
  syncing?: boolean;
  lastSynced?: Date | null;
}) {
  return (
    <div className="border-t border-hairline py-[17px] first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border border-hairline bg-field">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[15.5px] font-semibold">{name}</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">{subtitle}</div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`flex-none whitespace-nowrap rounded-[9px] px-[15px] py-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors ${
            connected
              ? 'border border-[rgba(0,217,255,0.4)] bg-accent-tint text-accent'
              : 'border border-hairline-strong text-ink'
          }`}
        >
          {connected ? 'Connected' : 'Connect'}
        </button>
      </div>
      {connected && onSync && (
        <div className="mt-3 flex items-center justify-between pl-[54px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
            {syncing ? 'Syncing…' : lastSynced ? `Synced ${timeAgo(lastSynced)}` : 'Not yet synced'}
          </span>
          <button
            onClick={onSync}
            disabled={syncing}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent disabled:opacity-40"
          >
            Sync now
          </button>
        </div>
      )}
    </div>
  );
}

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const oura = useOura();
  const strava = useStrava();
  const { settings, update } = useSettings();

  const planWeeks = WEEKS.filter((w) => w.phase !== 0).length;

  return (
    <div className="min-h-screen bg-canvas px-[22px] pb-[60px] pt-1.5">
      <SettingsHeader onBack={onBack} />
      <h1
        className="mb-[26px] font-display text-[40px] font-extrabold uppercase leading-[0.94] tracking-[-0.01em]"
        style={{ fontVariationSettings: "'wdth' 118" }}
      >
        Settings
      </h1>

      {/* Profile */}
      <div className="mb-[26px] flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-full border border-hairline-strong bg-gradient-to-br from-[#1c2228] to-[#0e1114] font-mono text-base text-muted">
          MX
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold">{ATHLETE.name}</div>
          <div className="mt-1 truncate font-mono text-[11px] text-muted">mjneales@icloud.com</div>
        </div>
        <Chevron />
      </div>

      <SettingsSection title="Connections">
        <ConnectionRow
          name="Strava"
          subtitle="Runs & activities"
          connected={strava.connected}
          onToggle={strava.connected ? strava.disconnect : strava.connect}
          onSync={strava.connected ? () => strava.sync(90) : undefined}
          syncing={strava.syncing}
          lastSynced={strava.lastSynced}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth={1.9}>
              <path d="M4 13h4l2.5-7 4 14L18 13h2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <ConnectionRow
          name="Oura Ring"
          subtitle="Readiness & sleep"
          connected={oura.connected}
          onToggle={oura.connected ? oura.disconnect : oura.connect}
          onSync={oura.connected ? () => oura.sync(30) : undefined}
          syncing={oura.syncing}
          lastSynced={oura.lastSynced}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth={1.9}>
              <circle cx="12" cy="12" r="7" />
            </svg>
          }
        />
      </SettingsSection>

      <SettingsSection title="Marathon plan">
        <SettingsRow label="Goal race" value={<span className="font-semibold text-muted">{raceShortName()}</span>} />
        <SettingsRow label="Race date" value={<span className="font-semibold text-muted">{formatRaceDateEU(RACE_DATE)}</span>} />
        <SettingsRow
          label="Time goal"
          value={<span className="font-bold text-accent">Sub-{formatGoalTime(GOAL_TIME)} · MP {GOAL_PACE}</span>}
        />
        <SettingsRow label="Plan length" value={<span className="font-semibold text-muted">{planWeeks} weeks · base → race</span>} />
      </SettingsSection>

      <SettingsSection title="Body">
        <div className="flex items-center justify-between gap-3.5 py-[14px]">
          <span className="text-[15.5px] font-semibold">Weight</span>
          <div className="w-[110px]">
            <Input
              value={settings.weight}
              onChange={(e) => update({ weight: e.target.value })}
              unit="KG"
              align="right"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3.5 border-t border-hairline py-[14px]">
          <span className="text-[15.5px] font-semibold">Height</span>
          <div className="w-[110px]">
            <Input
              value={settings.height}
              onChange={(e) => update({ height: e.target.value })}
              unit="CM"
              align="right"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="border-t border-hairline py-4">
          <div className="mb-3 text-[15.5px] font-semibold">Sex</div>
          <SegmentedControl
            value={settings.sex}
            onChange={(sex) => update({ sex })}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
        <div className="border-t border-hairline py-4">
          <div className="mb-3 text-[15.5px] font-semibold">Units</div>
          <SegmentedControl
            value={settings.units}
            onChange={(units) => update({ units })}
            options={[
              { value: 'km', label: 'Kilometres' },
              { value: 'mi', label: 'Miles' },
            ]}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <div className="flex items-center justify-between gap-3.5 py-4">
          <div>
            <div className="text-[15.5px] font-semibold">Daily reminder</div>
            <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
              Nudge to check today
            </div>
          </div>
          <ToggleSwitch checked={settings.notifDaily} onChange={(v) => update({ notifDaily: v })} />
        </div>
        <div className="flex items-center justify-between gap-3.5 border-t border-hairline py-4">
          <div>
            <div className="text-[15.5px] font-semibold">Coach nudges</div>
            <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
              Pacing & recovery tips
            </div>
          </div>
          <ToggleSwitch checked={settings.notifCoach} onChange={(v) => update({ notifCoach: v })} />
        </div>
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow label="Subscription" value={<span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent">STRIDE Pro</span>} />
        <SettingsRow label="Privacy & data" value={null} />
        <SettingsRow label="Help & support" value={null} />
      </SettingsSection>

      <div className="mb-4 flex items-center justify-center rounded-2xl border border-[rgba(229,103,92,0.3)] py-4">
        <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-warning">Sign out</span>
      </div>
      <div className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#3a424b]">
        STRIDE · v1.0 · build 2026.10
      </div>
    </div>
  );
}
