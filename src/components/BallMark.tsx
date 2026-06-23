interface Props {
  size?: number;
  className?: string;
}

// Ballhog basketball mark — shares the favicon geometry (circle + seams + two
// side arcs) but uses theme variables so it adapts to light/dark. The center
// pip echoes the brand lockup from the reference hero.
export default function BallMark({ size = 64, className }: Props) {
  return (
    <svg
      className={className ? `ball-mark ${className}` : "ball-mark"}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="28.16" fill="var(--orange)" stroke="var(--ink)" strokeWidth="3.2" />
      <line x1="32" y1="3.84" x2="32" y2="60.16" stroke="var(--ink)" strokeWidth="3.2" />
      <line x1="3.84" y1="32" x2="60.16" y2="32" stroke="var(--ink)" strokeWidth="3.2" />
      <path d="M 14.54 9.75 A 30.98 30.98 0 0 1 14.54 54.25" fill="none" stroke="var(--ink)" strokeWidth="3.2" />
      <path d="M 49.46 9.75 A 30.98 30.98 0 0 0 49.46 54.25" fill="none" stroke="var(--ink)" strokeWidth="3.2" />
      <circle cx="32" cy="32" r="6.4" fill="var(--cream)" stroke="var(--ink)" strokeWidth="2.4" />
    </svg>
  );
}
