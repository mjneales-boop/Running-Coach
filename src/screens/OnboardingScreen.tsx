import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { updateProfile } from '../lib/db';
import { supabase } from '../lib/supabase';

type Step = 0 | 1 | 2 | 3;

interface RaceTime {
  distance: string;
  time: string;
}

interface FormState {
  weight: string;
  height: string;
  sex: 'male' | 'female' | 'other';
  experience: 'beginner' | 'intermediate' | 'advanced';
  weeklyKm: string;
  daysPerWeek: string;
  injuryHistory: string;
  raceTimes: RaceTime[];
  goal: 'race' | 'general';
  raceName: string;
  raceDate: string;
  goalTime: string;
  suggestGoal: boolean;
  includeStrength: boolean;
}

const INITIAL: FormState = {
  weight: '',
  height: '',
  sex: 'male',
  experience: 'intermediate',
  weeklyKm: '',
  daysPerWeek: '4',
  injuryHistory: '',
  raceTimes: [],
  goal: 'race',
  raceName: '',
  raceDate: '',
  goalTime: '',
  suggestGoal: false,
  includeStrength: false,
};

const inputClass =
  'w-full rounded-[9px] border border-hairline-strong bg-field px-3 py-2.5 font-display text-base font-bold text-ink outline-none placeholder:text-faint focus:border-accent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canContinue = (): boolean => {
    if (step === 1) return Number(form.weeklyKm) > 0 && Number(form.daysPerWeek) >= 2;
    if (step === 2 && form.goal === 'race') return form.raceName.trim() !== '' && form.raceDate !== '';
    return true;
  };

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      await updateProfile({
        weight_kg: form.weight ? Number(form.weight) : null,
        height_cm: form.height ? Number(form.height) : null,
        sex: form.sex,
        experience: form.experience,
        weekly_km_current: Number(form.weeklyKm),
        days_per_week: Number(form.daysPerWeek),
        injury_history: form.injuryHistory.trim() || null,
        recent_race_times: form.raceTimes.filter((r) => r.time.trim()),
        include_strength: form.includeStrength,
        race_name: form.goal === 'race' ? form.raceName.trim() : null,
        race_date: form.goal === 'race' ? form.raceDate : null,
        goal_time: form.goal === 'race' && !form.suggestGoal && form.goalTime.trim() ? form.goalTime.trim() : null,
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const r = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      window.location.reload();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string })?.message ?? 'Something went wrong — please try again.';
      setError(msg);
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex items-center gap-1.5">
          <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-accent" />
          <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-accent [animation-delay:0.2s]" />
          <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-accent [animation-delay:0.4s]" />
        </div>
        <div className="font-display text-lg font-black uppercase tracking-[0.1em] text-ink">
          Building your plan
        </div>
        <p className="max-w-[36ch] text-sm leading-relaxed text-muted">
          The coach is writing a training block around your fitness, schedule and goal. This takes a
          minute or two — hang tight.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-5 pb-16 pt-10">
      <Eyebrow>Set up · step {step + 1} of 4</Eyebrow>
      <h1
        className="mb-7 mt-3 font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[-0.01em]"
        style={{ fontVariationSettings: "'wdth' 116" }}
      >
        {step === 0 && 'About you'}
        {step === 1 && 'Your running'}
        {step === 2 && 'Your goal'}
        {step === 3 && 'Last bits'}
      </h1>

      <div className="stride-rise rounded-card border border-hairline bg-surface p-5">
        {step === 0 && (
          <>
            <Field label="Weight (kg)">
              <input inputMode="decimal" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="70" className={inputClass} />
            </Field>
            <Field label="Height (cm)">
              <input inputMode="decimal" value={form.height} onChange={(e) => set('height', e.target.value)} placeholder="175" className={inputClass} />
            </Field>
            <Field label="Sex">
              <SegmentedControl
                value={form.sex}
                onChange={(sex) => set('sex', sex)}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Experience">
              <SegmentedControl
                value={form.experience}
                onChange={(experience) => set('experience', experience)}
                options={[
                  { value: 'beginner', label: 'New-ish' },
                  { value: 'intermediate', label: 'Regular' },
                  { value: 'advanced', label: 'Seasoned' },
                ]}
              />
            </Field>
            <Field label="Current weekly volume (km)">
              <input inputMode="decimal" value={form.weeklyKm} onChange={(e) => set('weeklyKm', e.target.value)} placeholder="25" className={inputClass} />
            </Field>
            <Field label="Days you can run per week">
              <SegmentedControl
                value={form.daysPerWeek}
                onChange={(d) => set('daysPerWeek', d)}
                options={['2', '3', '4', '5', '6', '7'].map((v) => ({ value: v, label: v }))}
              />
            </Field>
            <Field label="Injury history (optional)">
              <textarea
                value={form.injuryHistory}
                onChange={(e) => set('injuryHistory', e.target.value)}
                placeholder="e.g. shin splints last year, occasional ITB tightness"
                rows={3}
                className={`${inputClass} resize-none font-normal`}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="What are you training for?">
              <SegmentedControl
                value={form.goal}
                onChange={(goal) => set('goal', goal)}
                options={[
                  { value: 'race', label: 'A race' },
                  { value: 'general', label: 'General fitness' },
                ]}
              />
            </Field>
            {form.goal === 'race' ? (
              <>
                <Field label="Race name">
                  <input value={form.raceName} onChange={(e) => set('raceName', e.target.value)} placeholder="Berlin Marathon 2027" className={inputClass} />
                </Field>
                <Field label="Race date">
                  <input type="date" value={form.raceDate} onChange={(e) => set('raceDate', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Goal time">
                  <input
                    value={form.goalTime}
                    onChange={(e) => set('goalTime', e.target.value)}
                    placeholder="3:59:59"
                    disabled={form.suggestGoal}
                    className={`${inputClass} ${form.suggestGoal ? 'opacity-40' : ''}`}
                  />
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[13px] text-muted">Suggest a realistic goal for me</span>
                    <ToggleSwitch checked={form.suggestGoal} onChange={(v) => set('suggestGoal', v)} />
                  </div>
                </Field>
              </>
            ) : (
              <p className="text-[13.5px] leading-relaxed text-muted">
                You'll get rolling 4-week blocks focused on consistent aerobic building — and when
                you near the end of a block, the next one is generated from what you actually ran.
              </p>
            )}
            <Field label="Recent race times (optional — helps set your paces)">
              {form.raceTimes.map((rt, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <select
                    value={rt.distance}
                    onChange={(e) =>
                      set('raceTimes', form.raceTimes.map((x, j) => (j === i ? { ...x, distance: e.target.value } : x)))
                    }
                    className={`${inputClass} w-32`}
                  >
                    {['5K', '10K', 'Half', 'Marathon'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    value={rt.time}
                    onChange={(e) =>
                      set('raceTimes', form.raceTimes.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))
                    }
                    placeholder="e.g. 52:30"
                    className={inputClass}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('raceTimes', [...form.raceTimes, { distance: '10K', time: '' }])}
                className="mt-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent"
              >
                + Add a race time
              </button>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mb-5 flex items-center justify-between gap-3.5">
              <div>
                <div className="text-[15.5px] font-semibold">Include gym days</div>
                <div className="mt-1 max-w-[26ch] font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  2-3 strength sessions a week alongside the running
                </div>
              </div>
              <ToggleSwitch checked={form.includeStrength} onChange={(v) => set('includeStrength', v)} />
            </div>
            <p className="text-[13.5px] leading-relaxed text-muted">
              That's everything. The coach will build{' '}
              {form.goal === 'race' ? 'a periodized plan ending on race day' : 'your first 4-week block'} from
              what you've told us — easy volume as the base, quality work layered in at ~
              {form.weeklyKm || '—'} km/week to start.
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-[9px] border border-warning/40 bg-warning/10 px-3 py-2.5 text-[13px] leading-snug text-warning">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button variant="ghost" className="flex-1" onClick={() => setStep((s) => (s - 1) as Step)}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button className="flex-1" disabled={!canContinue()} onClick={() => setStep((s) => (s + 1) as Step)}>
            Continue
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => void generate()}>
            Build my plan
          </Button>
        )}
      </div>
    </div>
  );
}
