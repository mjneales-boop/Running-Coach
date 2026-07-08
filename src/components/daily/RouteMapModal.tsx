import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Tag } from '../ui/Tag';
import { decodePolyline } from '../../lib/polyline';

interface RouteMapModalProps {
  polyline: string;
  onClose: () => void;
}

function dotIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid var(--color-canvas);box-shadow:0 0 0 1px var(--color-hairline-strong);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export function RouteMapModal({ polyline, onClose }: RouteMapModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!containerRef.current) return;

    let points: [number, number][];
    try {
      points = decodePolyline(polyline);
    } catch {
      onClose();
      return;
    }
    if (points.length < 2) {
      onClose();
      return;
    }

    const map = L.map(containerRef.current, { zoomControl: false });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const line = L.polyline(points, {
      color: 'var(--color-accent)',
      weight: 4,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    L.marker(points[0], { icon: dotIcon('var(--color-accent)') }).addTo(map);
    L.marker(points[points.length - 1], { icon: dotIcon('var(--color-muted)') }).addTo(map);

    map.fitBounds(line.getBounds(), { padding: [32, 32] });

    return () => { map.remove(); };
  }, [polyline, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-canvas"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ paddingTop: 'calc(14px + env(safe-area-inset-top))' }}
        className="flex flex-none items-center justify-between gap-3 border-b border-hairline px-[22px] pb-4"
      >
        <Tag tone="accent">Route</Tag>
        <button
          onClick={onClose}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-hairline-strong text-xl leading-none text-muted"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
