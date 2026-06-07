interface CheckProps {
  size?: number;
  color?: string;
}

export function Check({ size = 13, color = 'var(--accent)' }: CheckProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 7.5L6 11l5.5-7.5" />
    </svg>
  );
}
