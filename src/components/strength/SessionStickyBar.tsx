import { useEffect, useState } from 'react';
import { ProgressRing } from '../ui/ProgressRing';
import { formatTonnage } from '../../lib/format';

interface SessionStickyBarProps {
  title: string;
  committed: number;
  planned: number;
  tonnage: number;
  /** Y offset past which the bar appears — normally the header's height. */
  showAfter: number;
}

/**
 * Condensed header that takes over once the real one scrolls away, so the
 * session's state stays on screen while the athlete works down the card list.
 * Mirrors the TabBar's translucent treatment.
 */
export function SessionStickyBar({ title, committed, planned, tonnage, showAfter }: SessionStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfter]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-20 flex h-[52px] items-center gap-3 border-b border-hairline bg-[rgba(10,12,14,0.82)] px-[22px] backdrop-blur-xl"
      // Own compositor layer, matching TabBar — stops iOS Safari drifting a
      // fixed backdrop-blurred bar during momentum scroll.
      style={{ transform: 'translateZ(0)', willChange: 'transform' }}
    >
      {planned > 0 && (
        <ProgressRing value={committed / planned} size={28} label={`${committed} of ${planned} sets logged`} />
      )}
      <span className="min-w-0 flex-1 truncate font-display text-[13px] font-bold uppercase tracking-[0.02em]">
        {title}
      </span>
      {tonnage > 0 && (
        <span className="stride-num flex-none font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {formatTonnage(tonnage)}
        </span>
      )}
    </div>
  );
}
