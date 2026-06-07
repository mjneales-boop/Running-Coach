import { TrendArrow } from './ui/TrendArrow';
import { readinessColor, readinessStatus, trendDir, readinessAdjustment } from '../lib/logic';
import { ATHLETE } from '../constants/plan';
import type { ReadinessEntry } from '../types';

interface ReadinessBandProps {
  latestEntry: ReadinessEntry;
  onOpenLog: () => void;
}

function ReadinessScaleBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, ((score - 40) / 60) * 100));
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'relative',
          height: 8,
          borderRadius: 4,
          overflow: 'visible',
          display: 'flex',
        }}
      >
        <div style={{ width: '33.3%', height: '100%', background: 'rgba(239,68,68,0.55)', borderRadius: '4px 0 0 4px' }} />
        <div style={{ width: '16.7%', height: '100%', background: 'rgba(245,158,11,0.55)' }} />
        <div style={{ width: '25%', height: '100%', background: 'rgba(0,217,255,0.55)' }} />
        <div style={{ width: '25%', height: '100%', background: 'rgba(16,185,129,0.55)', borderRadius: '0 4px 4px 0' }} />
        {/* marker */}
        <div
          style={{
            position: 'absolute',
            top: -3,
            bottom: -3,
            left: `calc(${pct}% - 1px)`,
            width: 2,
            background: '#fff',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
            borderRadius: 1,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 7,
          fontFamily: 'var(--mono)',
          fontSize: 11.5,
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
        }}
      >
        <span>RED</span>
        <span>COMPROMISED</span>
        <span>GOOD</span>
        <span>EXCELLENT</span>
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: number | undefined;
  unit: string;
  baseline: number;
  higherIsBetter: boolean;
  isFirst?: boolean;
}

function MetricBig({ label, value, unit, baseline, higherIsBetter, isFirst }: MetricProps) {
  const dir = trendDir(value, baseline, higherIsBetter);
  const displayValue = value != null ? String(value) : '—';

  return (
    <div
      style={{
        paddingLeft: isFirst ? 0 : 28,
        borderLeft: isFirst ? 'none' : '1px solid var(--border)',
        marginLeft: isFirst ? 0 : 28,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 11,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 38,
            lineHeight: 0.9,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayValue}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13.5, color: 'var(--text-muted)' }}>
          {unit}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
        <TrendArrow dir={dir} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-muted)' }}>
          baseline {baseline}{unit}
        </span>
      </div>
    </div>
  );
}

export function ReadinessBand({ latestEntry, onOpenLog }: ReadinessBandProps) {
  const score = latestEntry.score;
  const color = readinessColor(score);
  const status = readinessStatus(score);
  const adjustment = readinessAdjustment(score);

  const logButton = (
    <button
      onClick={onOpenLog}
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '6px 12px',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, color 150ms ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
      }}
    >
      Log
    </button>
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: 'var(--text-muted)',
            textTransform: 'lowercase',
          }}
        >
          {'// readiness'}
        </span>
        {logButton}
      </div>

      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '30px 32px',
        }}
      >
        {/* Hero zone */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <span
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 900,
                fontSize: 120,
                lineHeight: 0.82,
                letterSpacing: '-0.04em',
                color,
                fontVariantNumeric: 'tabular-nums',
                transition: 'color 150ms ease',
              }}
            >
              {score ?? '—'}
            </span>
            <div style={{ paddingBottom: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  letterSpacing: '0.14em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                readiness
              </div>
              <div
                style={{
                  fontFamily: 'var(--sans)',
                  fontWeight: 800,
                  fontSize: 26,
                  letterSpacing: '-0.01em',
                  color,
                  transition: 'color 150ms ease',
                }}
              >
                {status}
              </div>
            </div>
          </div>

          {/* Scale bar */}
          {score != null && (
            <div style={{ flex: 1, paddingBottom: 14 }}>
              <ReadinessScaleBar score={score} />
            </div>
          )}
        </div>

        {/* Adjustment suggestion */}
        {adjustment && (
          <div
            style={{
              marginTop: 16,
              fontFamily: 'var(--mono)',
              fontSize: 12.5,
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}
          >
            {adjustment}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 20px' }} />

        {/* Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <MetricBig
            label="HRV"
            value={latestEntry.hrv}
            unit="ms"
            baseline={ATHLETE.baselineHRV}
            higherIsBetter={true}
            isFirst={true}
          />
          <MetricBig
            label="RHR"
            value={latestEntry.rhr}
            unit="bpm"
            baseline={ATHLETE.baselineRHR}
            higherIsBetter={false}
          />
          <MetricBig
            label="Sleep"
            value={latestEntry.sleep}
            unit="h"
            baseline={ATHLETE.baselineSleep}
            higherIsBetter={true}
          />
        </div>
      </div>
    </>
  );
}
