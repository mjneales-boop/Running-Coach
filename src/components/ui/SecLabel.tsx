import type { ReactNode } from 'react';

interface SecLabelProps {
  children: ReactNode;
  action?: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function SecLabel({ children, action, style, className }: SecLabelProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: action ? 'space-between' : undefined,
        gap: 8,
        marginBottom: 14,
        fontFamily: 'var(--mono)',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: 'var(--text-muted)',
        textTransform: 'lowercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span>{'// ' + children}</span>
      {action}
    </div>
  );
}
