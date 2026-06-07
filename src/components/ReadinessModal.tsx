import { useEffect, useState } from 'react';
import type { ReadinessEntry } from '../types';

interface ReadinessModalProps {
  dateKey: string;
  existing: ReadinessEntry;
  onSave: (dateKey: string, entry: ReadinessEntry) => Promise<void>;
  onClose: () => void;
}

interface FieldConfig {
  key: keyof ReadinessEntry;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  placeholder: string;
}

const FIELDS: FieldConfig[] = [
  { key: 'score', label: 'Readiness Score', unit: '/100', min: 0, max: 100, step: 1, placeholder: '0–100' },
  { key: 'hrv',   label: 'HRV',             unit: 'ms',   min: 0, max: 300, step: 1, placeholder: 'e.g. 103' },
  { key: 'rhr',   label: 'Resting HR',      unit: 'bpm',  min: 0, max: 120, step: 1, placeholder: 'e.g. 42' },
  { key: 'sleep', label: 'Sleep',           unit: 'h',    min: 0, max: 16,  step: 0.1, placeholder: 'e.g. 7.5' },
];

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 15,
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  padding: '12px 14px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 150ms ease',
  fontVariantNumeric: 'tabular-nums',
};

export function ReadinessModal({ dateKey, existing, onSave, onClose }: ReadinessModalProps) {
  const [values, setValues] = useState<Partial<Record<keyof ReadinessEntry, string>>>({
    score: existing.score != null ? String(existing.score) : '',
    hrv:   existing.hrv   != null ? String(existing.hrv)   : '',
    rhr:   existing.rhr   != null ? String(existing.rhr)   : '',
    sleep: existing.sleep != null ? String(existing.sleep) : '',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    const entry: ReadinessEntry = {};
    for (const f of FIELDS) {
      const raw = values[f.key];
      if (raw && raw.trim() !== '') {
        const num = parseFloat(raw);
        if (!isNaN(num)) (entry as Record<string, number>)[f.key] = num;
      }
    }
    await onSave(dateKey, entry);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 420,
          padding: 28,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 4,
                letterSpacing: '0.02em',
              }}
            >
              {'// readiness'}
            </div>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 800,
                fontSize: 20,
                color: 'var(--text)',
              }}
            >
              Log Today's Data
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
              {dateKey}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {f.label}
                </label>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  {f.unit}
                </span>
              </div>
              <input
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                placeholder={f.placeholder}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                style={inputStyle}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
              />
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: 8,
            padding: '14px 22px',
            cursor: 'pointer',
            border: '1px solid var(--accent)',
            background: 'var(--accent)',
            color: '#04222A',
            transition: 'background 150ms ease',
            width: '100%',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#38E2FF'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
