import { useStorage } from './useStorage';
import type { CoachMessage } from '../types';

export function useCoachMessages() {
  const [messages, write, loading] = useStorage<CoachMessage[]>('stride-coach-messages', []);
  return { messages, loading, setMessages: write };
}
