const ARM_COUNT = 5;
const STEPS = 20;
const THETA_MAX = (200 * Math.PI) / 180;
const R0 = 5;
const GROWTH = 9.5;

function tentaclePath(cx: number, cy: number, baseAngleDeg: number): string {
  const base = (baseAngleDeg * Math.PI) / 180;
  const points: string[] = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    const theta = t * THETA_MAX;
    const r = R0 + GROWTH * theta;
    const angle = base + theta; // same-handed curl on every arm, for a vortex rather than a starburst
    const x = cx + r * Math.sin(angle);
    const y = cy - r * Math.cos(angle);
    points.push(`${s === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(' ');
}

const ARMS = Array.from({ length: ARM_COUNT }, (_, i) => ({
  key: i,
  d: tentaclePath(50, 50, (360 / ARM_COUNT) * i),
}));

/**
 * A five-armed spiral vortex, all arms curling the same direction — an original mark inspired
 * by "The Call of Cthulhu" (non-Euclidean R'lyeh geometry, a cephalopod-tentacled Old One),
 * not a depiction of any specific published illustration. Reserved for Fumble: the game's own
 * worst result gets a glyph that reads as "something looked back," not just red text — see
 * CLAUDE.md Phase 2: "a distinct fumble treatment (something worse than just red)."
 * Color comes from `currentColor` (used at text-oxblood everywhere it appears).
 */
export default function EldritchMark({
  size = 96,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-hidden="true"
      className={className}
    >
      {ARMS.map((arm) => (
        <path
          key={arm.key}
          d={arm.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      ))}
      <circle cx={50} cy={50} r={3.5} className="fill-ink" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
