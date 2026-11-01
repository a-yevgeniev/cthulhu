const LABEL = 'text-[10px] uppercase tracking-widest text-paper-dim';
const GHOST_BTN = 'border border-ink-line text-paper-dim transition-colors hover:border-brass hover:text-paper';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** A current/max counter with − and + buttons — HP, MP, SAN, Luck. Shared by the character sheet
 * and the Table room, so both show and change the same numbers the same way. */
export default function ResourceTracker({
  label,
  current,
  max,
  onChange,
}: {
  label: string;
  current: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 border border-ink-line px-2 py-3">
      <span className={LABEL}>{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} −1`}
          onClick={() => onChange(clamp(current - 1, 0, max ?? Infinity))}
          className={`grid h-9 w-9 place-items-center ${GHOST_BTN}`}
        >
          −
        </button>
        <span className="w-12 text-center font-display text-lg tabular-nums text-paper">
          {current}
          {max !== undefined && <span className="text-xs text-paper-dim">/{max}</span>}
        </span>
        <button
          type="button"
          aria-label={`${label} +1`}
          onClick={() => onChange(clamp(current + 1, 0, max ?? Infinity))}
          className={`grid h-9 w-9 place-items-center ${GHOST_BTN}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
