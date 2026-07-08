export function formatPaceMinKm(avgPaceMinKm: number): string {
  const totalSec = Math.round(avgPaceMinKm * 60);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}
