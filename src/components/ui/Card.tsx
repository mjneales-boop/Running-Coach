import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  dashed?: boolean;
}

export function Card({ children, className = '', style, onClick, dashed = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-[18px] border bg-surface p-5 ${
        dashed ? 'border-dashed border-hairline-strong' : 'border-hairline'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
