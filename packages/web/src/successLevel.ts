import type { SkillRollResult } from 'coc7-engine';
import type { Translations } from './i18n/translations';

export const LEVEL_CLASSES: Record<SkillRollResult['level'], string> = {
  critical: 'bg-amber-400 text-amber-950',
  extreme: 'bg-emerald-400 text-emerald-950',
  hard: 'bg-emerald-500/80 text-emerald-950',
  regular: 'bg-emerald-600/70 text-emerald-50',
  failure: 'bg-zinc-700 text-zinc-200',
  fumble: 'bg-red-700 text-red-50',
};

/**
 * The badge to show for a roll. `level` alone is the roll's intrinsic quality against the
 * skill (independent of what was demanded) — a roll that lands 'regular' still reads as a
 * plain "Success" even when the Keeper called for 'hard' and this roll didn't meet it. Key the
 * badge off `succeeded` (which already accounts for the demanded difficulty) instead, falling
 * back to the intrinsic level's own styling only when it's absolute (fumble/critical/failure)
 * or already met the demand.
 */
export function rollDisplay(result: SkillRollResult, t: Translations): { label: string; classes: string } {
  const label = t.successLevel[result.level];
  const classes = LEVEL_CLASSES[result.level];
  if (result.succeeded || result.level === 'fumble' || result.level === 'critical' || result.level === 'failure') {
    return { label, classes };
  }
  // A real success tier (regular/hard/extreme) that's simply below what was demanded —
  // a genuine 'failure' level never needs this qualifier since it never meets any difficulty.
  return {
    label: t.successLevel.needed(label, t.difficulty[result.difficulty]),
    classes: LEVEL_CLASSES.failure,
  };
}
