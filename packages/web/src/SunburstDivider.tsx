/** A small brass sunburst mark flanked by hairlines — a section divider with more presence than
 * a plain border, for the boundaries between a Character Sheet's major sections. Original
 * artwork; see CompassRose's docstring and CLAUDE.md's Legal note. */
export default function SunburstDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-hidden="true">
      <span className="h-px flex-1 bg-ink-line" />
      <svg width={16} height={16} viewBox="0 0 40 40" className="shrink-0 text-brass">
        <g stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1={20} y1={4} x2={20} y2={36} />
          <line x1={4} y1={20} x2={36} y2={20} />
          <line x1={9} y1={9} x2={31} y2={31} />
          <line x1={31} y1={9} x2={9} y2={31} />
        </g>
        <circle cx={20} cy={20} r={5} className="fill-ink-raised" stroke="currentColor" strokeWidth={2} />
      </svg>
      <span className="h-px flex-1 bg-ink-line" />
    </div>
  );
}
