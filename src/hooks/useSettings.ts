import { useStorage } from './useStorage';

export interface StrideSettings {
  weight: string;
  height: string;
  sex: 'male' | 'female' | 'other';
  units: 'km' | 'mi';
  notifDaily: boolean;
  notifCoach: boolean;
  /** Buzz when the rest timer expires. No sound, ever. */
  hapticRest: boolean;
  /**
   * Easy-pace range, as "m:ss" bounds, overriding the zone-derived one on the Easy
   * running chart. Empty strings mean "derive it from my training zones".
   *
   * Exists because the zone table's Easy band is computed from an *estimated* threshold
   * when an athlete has no recent race times, and that estimate is often conservative —
   * leaving the athlete's real easy running classified as Steady and excluded from the
   * chart. This lets them state the range they actually run without shifting every other
   * zone (and with it their workout and race paces), which recalibrating threshold would.
   */
  easyPaceFast: string;
  easyPaceSlow: string;
}

const DEFAULT_SETTINGS: StrideSettings = {
  weight: '74',
  height: '178',
  sex: 'male',
  units: 'km',
  notifDaily: true,
  notifCoach: true,
  hapticRest: true,
  easyPaceFast: '',
  easyPaceSlow: '',
};

export function useSettings() {
  const [stored, write] = useStorage<StrideSettings>('stride-settings', DEFAULT_SETTINGS);

  // useStorage replaces the value wholesale, so a blob written before a field existed
  // comes back missing that field — and every caller reading it as a string crashes the
  // screen. Merge over the defaults so newly added settings are always present.
  const settings: StrideSettings = { ...DEFAULT_SETTINGS, ...stored };

  const update = (patch: Partial<StrideSettings>) => write({ ...settings, ...patch });

  return { settings, update };
}
