import type { SkillRollResult } from 'coc7-engine';

export const LEVEL_STYLE: Record<SkillRollResult['level'], { label: string; classes: string }> = {
  critical: { label: 'Critical', classes: 'bg-amber-400 text-amber-950' },
  extreme: { label: 'Extreme success', classes: 'bg-emerald-400 text-emerald-950' },
  hard: { label: 'Hard success', classes: 'bg-emerald-500/80 text-emerald-950' },
  regular: { label: 'Success', classes: 'bg-emerald-600/70 text-emerald-50' },
  failure: { label: 'Failure', classes: 'bg-zinc-700 text-zinc-200' },
  fumble: { label: 'Fumble', classes: 'bg-red-700 text-red-50' },
};

const DIFFICULTY_LABEL: Record<SkillRollResult['difficulty'], string> = {
  regular: 'Regular',
  hard: 'Hard',
  extreme: 'Extreme',
};

/**
 * The badge to show for a roll. `level` alone is the roll's intrinsic quality against the
 * skill (independent of what was demanded) — a roll that lands 'regular' still reads as
 * LEVEL_STYLE.regular ("Success") even when the Keeper called for 'hard' and this roll didn't
 * meet it. Key the badge off `succeeded` (which already accounts for the demanded difficulty)
 * instead, falling back to the intrinsic level's own styling only when it's absolute
 * (fumble/critical) or already met the demand.
 */
export function rollDisplay(result: SkillRollResult): { label: string; classes: string } {
  const base = LEVEL_STYLE[result.level];
  if (result.succeeded || result.level === 'fumble' || result.level === 'critical' || result.level === 'failure') {
    return base;
  }
  // A real success tier (regular/hard/extreme) that's simply below what was demanded —
  // a genuine 'failure' level never needs this qualifier since it never meets any difficulty.
  return {
    label: `${base.label} (needed ${DIFFICULTY_LABEL[result.difficulty]})`,
    classes: LEVEL_STYLE.failure.classes,
  };
}
