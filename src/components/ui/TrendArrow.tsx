interface TrendArrowProps {
  dir: 'good-up' | 'good-down' | 'flat';
}

export function TrendArrow({ dir }: TrendArrowProps) {
  if (dir === 'flat') return null;
  const pointsUp = dir === 'good-up';

  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      stroke="var(--success)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: pointsUp ? 'none' : 'rotate(180deg)' }}
    >
      <path d="M5 8.5V2M2 4.5L5 1.5l3 3" />
    </svg>
  );
}
