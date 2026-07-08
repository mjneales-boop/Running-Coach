import { lazy, Suspense, useState } from 'react';
import { decodePolyline } from '../../lib/polyline';

const RouteMapModal = lazy(() => import('./RouteMapModal').then((m) => ({ default: m.RouteMapModal })));

const WIDTH = 300;
const HEIGHT = 90;
const PAD = 6;

interface RouteLineProps {
  polyline?: string;
  fullPolyline?: string;
}

export function RouteLine({ polyline, fullPolyline }: RouteLineProps) {
  const [expanded, setExpanded] = useState(false);

  if (!polyline) return null;

  let points: [number, number][];
  try {
    points = decodePolyline(polyline);
  } catch {
    return null;
  }
  if (points.length < 2) return null;

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  // Preserve aspect ratio within the viewBox rather than stretching to fill it.
  const scale = Math.min((WIDTH - PAD * 2) / lngRange, (HEIGHT - PAD * 2) / latRange);
  const drawWidth = lngRange * scale;
  const drawHeight = latRange * scale;
  const offsetX = (WIDTH - drawWidth) / 2;
  const offsetY = (HEIGHT - drawHeight) / 2;

  const svgPoints = points
    .map(([lat, lng]) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = offsetY + (maxLat - lat) * scale; // flip so north is up
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <button
        onClick={() => setExpanded(true)}
        className="group relative block w-full"
        aria-label="Expand route map"
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[90px] w-full">
          <polyline
            points={svgPoints}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute bottom-0 right-0 flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint">
          Tap to expand
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth={2}>
            <path d="M9 3H3v6M15 21h6v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {expanded && (
        <Suspense fallback={null}>
          <RouteMapModal polyline={fullPolyline || polyline} onClose={() => setExpanded(false)} />
        </Suspense>
      )}
    </div>
  );
}
