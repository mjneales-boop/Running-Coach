import { useEffect } from 'react';
import { TrendArrow } from './ui/TrendArrow';
import { readinessColor, readinessStatus, trendDir, readinessAdjustment } from '../lib/logic';
import { ATHLETE } from '../constants/plan';
import { useOura } from '../hooks/useOura';
import { useStrava } from '../hooks/useStrava';
import type { ReadinessEntry } from '../types';

interface ReadinessBandProps {
  latestEntry: ReadinessEntry;
  latestSleepDate: string | null;
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

function ghostBtn(extra?: React.CSSProperties): React.CSSProperties {
  return {
    fontFamily: 'var(--mono)',
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'lowercase',
    color: 'var(--text-muted)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, color 150ms ease',
    whiteSpace: 'nowrap',
    ...extra,
  };
}

export function ReadinessBand({ latestEntry, latestSleepDate, onOpenLog }: ReadinessBandProps) {
  const { connected, syncing, lastSynced, lastError, sync, connect, disconnect } = useOura();
  const {
    connected: stravaConnected,
    syncing: stravaSyncing,
    lastSynced: stravaLastSynced,
    lastError: stravaLastError,
    sync: stravaSync,
    connect: stravaConnect,
    disconnect: stravaDisconnect,
  } = useStrava();

  // Auto-sync both on mount when connected
  useEffect(() => {
    if (connected === true) {
      sync(7).catch(() => {});
    }
  }, [connected, sync]);

  useEffect(() => {
    if (stravaConnected === true) {
      const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
      if (!stravaLastSynced || stravaLastSynced.getTime() < fifteenMinAgo) {
        stravaSync(7).catch(() => {});
      }
    }
  }, [stravaConnected, stravaSync, stravaLastSynced]);

  const score = latestEntry.score;
  const color = readinessColor(score);
  const status = readinessStatus(score);
  const adjustment = readinessAdjustment(score);
  const todayStr = new Date().toISOString().slice(0, 10);
  const sleepIsStale = latestSleepDate != null && latestSleepDate < todayStr;

  const syncLabel = syncing ? 'syncing…' : 'sync now';

  const lastSyncedLabel = lastSynced
    ? `synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  const stravaSyncLabel = stravaSyncing ? 'syncing…' : 'sync now';
  const stravaLastSyncedLabel = stravaLastSynced
    ? `synced ${stravaLastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  const stravaButtons = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {stravaConnected === null && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>…</span>
      )}
      {stravaConnected === false && (
        <button
          onClick={stravaConnect}
          style={ghostBtn({ borderColor: 'rgba(252,76,2,0.4)', color: '#FC4C02' })}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#FC4C02';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(252,76,2,0.4)';
          }}
        >
          connect strava
        </button>
      )}
      {stravaConnected === true && (
        <>
          {stravaLastSyncedLabel && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              {stravaLastSyncedLabel}
            </span>
          )}
          <button
            onClick={() => stravaSync(30).catch(() => {})}
            disabled={stravaSyncing}
            style={ghostBtn({ opacity: stravaSyncing ? 0.5 : 1, cursor: stravaSyncing ? 'default' : 'pointer' })}
            onMouseEnter={(e) => {
              if (!stravaSyncing) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            {stravaSyncLabel}
          </button>
          <button
            onClick={stravaDisconnect}
            style={ghostBtn()}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            disconnect
          </button>
        </>
      )}
    </div>
  );

  const ouraButtons = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {connected === null && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
          …
        </span>
      )}
      {connected === false && (
        <button
          onClick={connect}
          style={ghostBtn()}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          connect oura
        </button>
      )}
      {connected === true && (
        <>
          {lastSyncedLabel && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              {lastSyncedLabel}
            </span>
          )}
          <button
            onClick={() => sync(30).catch(() => {})}
            disabled={syncing}
            style={ghostBtn({ opacity: syncing ? 0.5 : 1, cursor: syncing ? 'default' : 'pointer' })}
            onMouseEnter={(e) => {
              if (!syncing) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            {syncLabel}
          </button>
          <button
            onClick={disconnect}
            style={ghostBtn()}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            disconnect
          </button>
        </>
      )}
      <button
        onClick={onOpenLog}
        style={ghostBtn()}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
        }}
      >
        log
      </button>
    </div>
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 12,
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
            flexShrink: 0,
          }}
        >
          {'// readiness'}
        </span>
        {ouraButtons}
      </div>

      {/* Oura error banner */}
      {lastError && (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--danger)',
            marginBottom: 10,
            letterSpacing: '0.02em',
          }}
        >
          oura error: {lastError}
        </div>
      )}

      {/* Strava row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: stravaLastError ? 4 : 14,
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: stravaConnected ? '#FC4C02' : 'var(--text-muted)',
            textTransform: 'lowercase',
            flexShrink: 0,
          }}
        >
          {'// strava'}
        </span>
        {stravaButtons}
      </div>

      {/* Strava error banner */}
      {stravaLastError && (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--danger)',
            marginBottom: 14,
            letterSpacing: '0.02em',
          }}
        >
          strava error: {stravaLastError}
        </div>
      )}

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

          {score != null && (
            <div style={{ flex: 1, paddingBottom: 14 }}>
              <ReadinessScaleBar score={score} />
            </div>
          )}
        </div>

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

        <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 20px' }} />

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
        {sleepIsStale && (
          <div
            style={{
              marginTop: 14,
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              color: 'var(--text-muted)',
              letterSpacing: '0.03em',
            }}
          >
            sleep metrics from {latestSleepDate} · oura still processing last night · sync later to update
          </div>
        )}
      </div>
    </>
  );
}
