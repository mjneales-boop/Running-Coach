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
}

const DEFAULT_SETTINGS: StrideSettings = {
  weight: '74',
  height: '178',
  sex: 'male',
  units: 'km',
  notifDaily: true,
  notifCoach: true,
  hapticRest: true,
};

export function useSettings() {
  const [settings, write] = useStorage<StrideSettings>('stride-settings', DEFAULT_SETTINGS);

  const update = (patch: Partial<StrideSettings>) => write({ ...settings, ...patch });

  return { settings, update };
}
