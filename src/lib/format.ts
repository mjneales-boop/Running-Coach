export function formatPaceMinKm(avgPaceMinKm: number): string {
  const totalSec = Math.round(avgPaceMinKm * 60);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

/**
 * Session tonnage for display: `4.28 t` above a tonne, `840 kg` below it.
 * Early sessions rarely clear a tonne, and "0.84 t" reads as nothing at all.
 */
export function formatTonnage(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2).replace(/\.?0+$/, '')} t`;
  return `${Math.round(kg)} kg`;
}
