function spikePath(cx: number, cy: number, angleDeg: number, cardinal: boolean): string {
  const angle = (angleDeg * Math.PI) / 180;
  const tipR = cardinal ? 88 : 52;
  const baseR = 8;
  const halfW = cardinal ? 5 : 3;
  const dirX = Math.sin(angle);
  const dirY = -Math.cos(angle);
  const perpX = Math.cos(angle);
  const perpY = Math.sin(angle);
  const tipX = cx + tipR * dirX;
  const tipY = cy + tipR * dirY;
  const b1x = cx + baseR * dirX + halfW * perpX;
  const b1y = cy + baseR * dirY + halfW * perpY;
  const b2x = cx + baseR * dirX - halfW * perpX;
  const b2y = cy + baseR * dirY - halfW * perpY;
  return `M ${tipX} ${tipY} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`;
}

const SPIKES = Array.from({ length: 8 }, (_, i) => {
  const angle = i * 45;
  const cardinal = i % 2 === 0;
  return { key: angle, cardinal, d: spikePath(100, 100, angle, cardinal) };
});

/** A hand-drawn brass compass rose — a navigation-instrument watermark for empty/atmospheric
 * screens. Original artwork (computed from angles and radii, not traced from any scan), so it
 * carries none of the licensing weight the Chaosium sheet art does — see CLAUDE.md's Legal note.
 * Color comes from `currentColor`, so wrap it in a text-color class (e.g. text-brass). */
export default function CompassRose({
  size = 220,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <circle cx={100} cy={100} r={94} fill="none" stroke="currentColor" strokeWidth={0.75} opacity={0.5} />
      <circle cx={100} cy={100} r={4} fill="currentColor" />
      {SPIKES.map((s) => (
        <path key={s.key} d={s.d} fill="currentColor" opacity={s.cardinal ? 0.95 : 0.6} />
      ))}
    </svg>
  );
}
