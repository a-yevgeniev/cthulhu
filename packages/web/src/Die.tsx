import { useEffect, useState } from 'react';

const REDUCED_MOTION = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

// CLAUDE.md: "Keep animation under ~600ms with skip-on-tap, or it becomes unbearable by
// session three." Skip-on-tap is free here: a new spinKey mid-animation just cancels the
// pending timers in the effect cleanup and starts over.
export const ROLL_MS = 350;
export const LAND_MS = 220;
export const TOTAL_ANIMATION_MS = ROLL_MS + LAND_MS;

const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-sm rounded-lg',
  md: 'h-14 w-14 text-xl rounded-xl',
  lg: 'h-24 w-24 text-4xl rounded-2xl',
} as const;

export type DieSize = keyof typeof SIZE_CLASSES;

interface DieProps {
  /** Final value to land on. */
  value: number;
  /** Number of sides — only used to bound the random faces shown mid-roll. */
  sides: number;
  /** Bump this to trigger a new roll animation; 0 (or unchanged) renders statically. */
  spinKey: number;
  size?: DieSize;
  /** Dropped by a kh/kl spec, or a non-chosen bonus/penalty candidate — shown muted, struck through. */
  dimmed?: boolean;
}

export default function Die({ value, sides, spinKey, size = 'md', dimmed = false }: DieProps) {
  const [display, setDisplay] = useState(value);
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'landing'>('idle');

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
      setDisplay(1 + Math.floor(Math.random() * Math.max(1, sides)));
    }, 65);
    const settle = window.setTimeout(() => {
      window.clearInterval(interval);
      setDisplay(value);
      setPhase('landing');
    }, ROLL_MS);
    const rest = window.setTimeout(() => setPhase('idle'), TOTAL_ANIMATION_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(settle);
      window.clearTimeout(rest);
    };
  }, [spinKey, value, sides]);

  return (
    <div
      className={`grid shrink-0 place-items-center border font-black tabular-nums shadow-inner transition-colors duration-200 ${SIZE_CLASSES[size]} ${
        dimmed
          ? 'border-zinc-800 bg-zinc-900 text-zinc-600 line-through opacity-60'
          : 'border-violet-400/30 bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-50'
      } ${phase === 'rolling' ? 'die-rolling' : ''} ${phase === 'landing' ? 'die-landing' : ''}`}
    >
      {display}
    </div>
  );
}
