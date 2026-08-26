import type { SkillRollResult } from 'coc7-engine';
import type { Translations } from './i18n/translations';

export const LEVEL_TEXT: Record<SkillRollResult['level'], string> = {
  critical: 'text-brass',
  extreme: 'text-verdigris',
  hard: 'text-verdigris',
  regular: 'text-paper',
  failure: 'text-paper-dim',
  fumble: 'text-oxblood',
};

/**
 * The badge to show for a roll. `level` alone is the roll's intrinsic quality against the
 * skill (independent of what was demanded) — a roll that lands 'regular' still reads as a
 * plain "Success" even when the Keeper called for 'hard' and this roll didn't meet it. Key the
 * badge off `succeeded` (which already accounts for the demanded difficulty) instead, falling
 * back to the intrinsic level's own styling only when it's absolute (fumble/critical/failure)
 * or already met the demand.
 */
export function rollDisplay(result: SkillRollResult, t: Translations): { label: string; textClass: string } {
  const label = t.successLevel[result.level];
  const textClass = LEVEL_TEXT[result.level];
  if (result.succeeded || result.level === 'fumble' || result.level === 'critical' || result.level === 'failure') {
    return { label, textClass };
  }
  // A real success tier (regular/hard/extreme) that's simply below what was demanded —
  // a genuine 'failure' level never needs this qualifier since it never meets any difficulty.
  return {
    label: t.successLevel.needed(label, t.difficulty[result.difficulty]),
    textClass: LEVEL_TEXT.failure,
  };
}
