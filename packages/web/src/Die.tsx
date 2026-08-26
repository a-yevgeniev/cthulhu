import { useEffect, useState } from 'react';

const REDUCED_MOTION = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

// CLAUDE.md: "Keep animation under ~600ms with skip-on-tap, or it becomes unbearable by
// session three." Skip-on-tap is free here: a new spinKey mid-animation just cancels the
// pending timers in the effect cleanup and starts over.
export const ROLL_MS = 380;
export const LAND_MS = 240;
export const TOTAL_ANIMATION_MS = ROLL_MS + LAND_MS;

const SIZE_PX = {
  sm: { box: 42, font: 17 },
  md: { box: 58, font: 26 },
  lg: { box: 76, font: 34 },
};

export type DieSize = keyof typeof SIZE_PX;

/** 'tens'/'units' mirror the engine's d100 breakdown (a shared units die, one tens die per
 * bonus/penalty candidate); 'plain' is any other die (Dice Tray, weapon damage, notation). */
export type DieVariant = 'plain' | 'tens' | 'units';

function randomFace(variant: DieVariant, sides: number): number {
  if (variant === 'tens') return Math.floor(Math.random() * 10) * 10;
  if (variant === 'units') return Math.floor(Math.random() * 10);
  return 1 + Math.floor(Math.random() * Math.max(1, sides));
}

function formatFace(variant: DieVariant, n: number): string {
  if (variant === 'tens') return n === 0 ? '00' : String(n);
  return String(n);
}

interface DieProps {
  /** Final value to land on (raw — e.g. a tens die's value is already ×10, per the engine). */
  value: number;
  /** Number of sides — only used to bound the random faces shown mid-roll for 'plain' dice. */
  sides?: number;
  /** Bump this to trigger a new roll animation; 0 (or unchanged) renders statically. */
  spinKey: number;
  variant?: DieVariant;
  size?: DieSize;
  /** Small caps label beneath the die, e.g. "tens" / "units". */
  kind?: string;
  /** Highlighted as the chosen candidate among bonus/penalty alternates. */
  kept?: boolean;
  /** Dropped by a kh/kl spec, or a non-chosen bonus/penalty candidate — dimmed, desaturated. */
  discarded?: boolean;
}

export default function Die({
  value,
  sides = 10,
  spinKey,
  variant = 'plain',
  size = 'md',
  kind,
  kept = false,
  discarded = false,
}: DieProps) {
  const [display, setDisplay] = useState(value);
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'settled'>('idle');

  useEffect(() => {
    // spinKey 0 means "render statically" (initial mount, or a historical Roll Log entry
    // that should never animate) — the dependency array already guarantees this effect only
    // re-runs when spinKey actually changes, so no extra ref-based guard is needed here (a
    // ref that persists "have I already handled this spinKey" across React StrictMode's
    // dev-only mount->cleanup->remount cycle caused exactly that bug: the remount would see
    // its own guard already tripped and skip starting the animation, leaving the die frozen
    // on a mid-roll random face while the rest of the UI had already revealed the real result).
    if (spinKey === 0) {
      setDisplay(value);
      return;
    }

    if (REDUCED_MOTION?.matches) {
      setDisplay(value);
      return;
    }

    setPhase('rolling');
    const interval = window.setInterval(() => {
      setDisplay(randomFace(variant, sides));
    }, 55);
    const settle = window.setTimeout(() => {
      window.clearInterval(interval);
      setDisplay(value);
      setPhase('settled');
    }, ROLL_MS);
    const rest = window.setTimeout(() => setPhase('idle'), TOTAL_ANIMATION_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(settle);
      window.clearTimeout(rest);
    };
  }, [spinKey, value, sides, variant]);

  const { box, font } = SIZE_PX[size];

  return (
    <div
      className={`die ${phase === 'rolling' ? 'tumbling' : ''} ${phase === 'settled' ? 'settled' : ''} ${
        kept ? 'kept' : ''
      } ${discarded ? 'discarded' : ''}`}
      style={{ width: box, height: box }}
    >
      <div className="die-face" />
      <span className="die-digit tabular-nums" style={{ fontSize: font, paddingTop: font * 0.2 }}>
        {formatFace(variant, display)}
      </span>
      {kind && <span className="die-kind">{kind}</span>}
    </div>
  );
}
