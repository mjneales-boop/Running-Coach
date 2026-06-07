import { SecLabel } from './ui/SecLabel';
import { ZONES } from '../constants/plan';

export function PacingZones() {
  return (
    <>
      <SecLabel>pacing zones</SecLabel>
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '6px 0',
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr',
            padding: '15px 26px',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          <span>Zone</span>
          <span style={{ textAlign: 'right' }}>Pace /km</span>
          <span style={{ textAlign: 'right' }}>Heart Rate</span>
        </div>

        {/* Data rows */}
        {ZONES.map((z) => (
          <div
            key={z.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr',
              padding: '16px 26px',
              alignItems: 'center',
              borderTop: '1px solid var(--border)',
              background: z.hero ? 'rgba(0,217,255,0.05)' : 'transparent',
              boxShadow: z.hero ? 'inset 2px 0 0 var(--accent)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 15,
                fontWeight: 600,
                color: z.hero ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {z.name}{z.hero ? ' · MP' : ''}
            </span>
            <span
              style={{
                textAlign: 'right',
                fontFamily: 'var(--mono)',
                fontSize: 15,
                color: z.hero ? 'var(--accent)' : 'var(--text-dim)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {z.pace}
            </span>
            <span
              style={{
                textAlign: 'right',
                fontFamily: 'var(--mono)',
                fontSize: 15,
                color: z.hero ? 'var(--accent)' : 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {z.hr}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
