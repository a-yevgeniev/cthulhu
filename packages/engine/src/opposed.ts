/**
 * Opposed rolls.
 *
 * Resolution order (CoC 7e):
 *  1. Both sides roll against their own skill.
 *  2. The higher success level wins.
 *  3. On a level tie, the higher skill value wins.
 *  4. If skills are also equal, it is a dead heat — re-roll or let the Keeper call it.
 *  5. If both fail, nothing happens; the status quo holds.
 */

import { LEVEL_RANK, type OpposedRollResult, type SkillRollResult, isSuccess } from './types';
import { type Rng, cryptoRng } from './rng';
import { skillRoll } from './skill';

export interface OpposedSide {
  skill: number;
  modifierDice?: number;
}

export function opposedRoll(
  a: OpposedSide,
  b: OpposedSide,
  rng: Rng = cryptoRng,
): OpposedRollResult {
  const rollA = skillRoll(a.skill, { modifierDice: a.modifierDice ?? 0, rng });
  const rollB = skillRoll(b.skill, { modifierDice: b.modifierDice ?? 0, rng });
  return resolveOpposed(rollA, rollB);
}

/** Resolve two rolls that have already been made (e.g. arrived over the wire). */
export function resolveOpposed(a: SkillRollResult, b: SkillRollResult): OpposedRollResult {
  const aWon = isSuccess(a.level);
  const bWon = isSuccess(b.level);

  if (!aWon && !bWon) return { a, b, winner: 'tie', reason: 'both-failed' };
  if (aWon && !bWon) return { a, b, winner: 'a', reason: 'level' };
  if (bWon && !aWon) return { a, b, winner: 'b', reason: 'level' };

  const rankA = LEVEL_RANK[a.level];
  const rankB = LEVEL_RANK[b.level];
  if (rankA !== rankB) {
    return { a, b, winner: rankA > rankB ? 'a' : 'b', reason: 'level' };
  }
  if (a.skill !== b.skill) {
    return { a, b, winner: a.skill > b.skill ? 'a' : 'b', reason: 'skill' };
  }
  return { a, b, winner: 'tie', reason: 'dead-heat' };
}
