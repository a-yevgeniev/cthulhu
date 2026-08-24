/**
 * The heart of the engine: d100 skill rolls, success levels, bonus/penalty
 * dice, pushed rolls and Luck expenditure.
 */

import {
  type Difficulty,
  LEVEL_RANK,
  type SkillRollResult,
  type SuccessLevel,
  type Thresholds,
  isSuccess,
} from './types';
import { type Rng, cryptoRng, rollDie } from './rng';

export interface SkillRollOptions {
  /** Net bonus (positive) or penalty (negative) dice. Clamped to +/-3. */
  modifierDice?: number;
  /** Difficulty the Keeper is demanding. Defaults to 'regular'. */
  difficulty?: Difficulty;
  /** Mark this as a pushed roll (affects fumble consequences, not the maths). */
  pushed?: boolean;
  rng?: Rng;
}

/** Most tables cap stacking at three dice either way. */
export const MAX_MODIFIER_DICE = 3;

/** Hard = half skill, Extreme = one fifth, both rounded down. */
export function thresholdsFor(skill: number): Thresholds {
  const s = clampSkill(skill);
  return {
    regular: s,
    hard: Math.floor(s / 2),
    extreme: Math.floor(s / 5),
  };
}

function clampSkill(skill: number): number {
  if (!Number.isFinite(skill)) throw new RangeError(`Skill must be a number, got ${skill}`);
  return Math.max(0, Math.floor(skill));
}

/**
 * Classify a 1-100 roll against a skill value.
 *
 * Rules applied (CoC 7e):
 *  - 01 is always a critical success.
 *  - 100 is always a fumble.
 *  - If the skill is below 50, 96-99 also fumble.
 *  - Otherwise the roll is graded against the regular/hard/extreme thresholds.
 *
 * Note the ordering: the fumble band is only reachable on a failed roll, so a
 * skill of 96+ can never fumble on 96-99 (it would have succeeded anyway), and
 * the sub-50 fumble range is checked before generic failure.
 */
export function classify(roll: number, skill: number): SuccessLevel {
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    throw new RangeError(`Roll must be an integer 1-100, got ${roll}`);
  }
  const s = clampSkill(skill);
  const t = thresholdsFor(s);

  if (roll === 1) return 'critical';
  if (roll === 100) return 'fumble';
  if (roll > s) {
    return s < 50 && roll >= 96 ? 'fumble' : 'failure';
  }
  if (roll <= t.extreme) return 'extreme';
  if (roll <= t.hard) return 'hard';
  return 'regular';
}

/** Does `level` satisfy a demanded `difficulty`? */
export function meets(level: SuccessLevel, difficulty: Difficulty): boolean {
  if (!isSuccess(level)) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[difficulty];
}

/**
 * Roll d100 with bonus/penalty dice.
 *
 * Procedure: roll ONE units die (0-9) and (1 + |n|) tens dice (00-90). Pair the
 * shared units die with each tens die to build candidate totals, then take the
 * lowest (bonus) or highest (penalty).
 *
 * The trap: tens 0 + units 0 reads as 100, not 0. Comparing tens digits alone
 * gets this wrong roughly 1 roll in 100 — always compare completed totals.
 */
export function rollD100(
  modifierDice = 0,
  rng: Rng = cryptoRng,
): { roll: number; candidates: number[]; raw: { units: number; tens: number[] } } {
  const mod = clampModifier(modifierDice);
  const dice = Math.abs(mod) + 1;

  // rollDie returns 1..10; face 10 represents the "0" face on a d10.
  const units = rollDie(10, rng) % 10; // 0-9
  const tens: number[] = [];
  for (let i = 0; i < dice; i++) tens.push((rollDie(10, rng) % 10) * 10); // 0,10,...,90

  const candidates = tens.map((t) => {
    const total = t + units;
    return total === 0 ? 100 : total;
  });

  const roll = mod >= 0 ? Math.min(...candidates) : Math.max(...candidates);
  return { roll, candidates, raw: { units, tens } };
}

function clampModifier(mod: number): number {
  if (!Number.isFinite(mod)) return 0;
  const m = Math.trunc(mod);
  return Math.max(-MAX_MODIFIER_DICE, Math.min(MAX_MODIFIER_DICE, m));
}

/** Perform a complete skill or characteristic roll. */
export function skillRoll(skill: number, options: SkillRollOptions = {}): SkillRollResult {
  const {
    modifierDice = 0,
    difficulty = 'regular',
    pushed = false,
    rng = cryptoRng,
  } = options;

  const s = clampSkill(skill);
  const mod = clampModifier(modifierDice);
  const { roll, candidates, raw } = rollD100(mod, rng);
  const level = classify(roll, s);

  return {
    roll,
    skill: s,
    difficulty,
    level,
    succeeded: meets(level, difficulty),
    thresholds: thresholdsFor(s),
    modifierDice: mod,
    candidates,
    raw,
    pushed,
    luckSpent: 0,
  };
}

/**
 * Re-roll a failed attempt. Only failures may be pushed, and a pushed roll
 * cannot itself be pushed again — the engine enforces both.
 */
export function pushRoll(previous: SkillRollResult, rng: Rng = cryptoRng): SkillRollResult {
  if (previous.succeeded) {
    throw new Error('Only a failed roll may be pushed.');
  }
  if (previous.pushed) {
    throw new Error('A pushed roll cannot be pushed a second time.');
  }
  return skillRoll(previous.skill, {
    modifierDice: previous.modifierDice,
    difficulty: previous.difficulty,
    pushed: true,
    rng,
  });
}

/**
 * Luck points needed to drag a roll down to `target`.
 * Returns null if the spend is not legal.
 *
 * Restrictions enforced here: cannot buy a critical (01), cannot improve a
 * roll of 100, cannot spend on a roll that already succeeded at the demanded
 * difficulty, cannot raise a roll.
 *
 * Not enforced here (caller's job, because it depends on roll *type*): Luck may
 * not be spent on Sanity checks, Luck rolls, damage rolls, or pushed rolls.
 */
export function luckCost(result: SkillRollResult, target: number): number | null {
  if (!Number.isInteger(target) || target < 2 || target > 100) return null;
  if (result.roll === 100) return null;
  if (target >= result.roll) return null;
  if (result.succeeded) return null;
  return result.roll - target;
}

/**
 * Cheapest Luck spend that reaches `difficulty`, or null if impossible /
 * unaffordable. Returns the target roll and its cost.
 */
export function cheapestLuckSpend(
  result: SkillRollResult,
  available: number,
  difficulty: Difficulty = result.difficulty,
): { target: number; cost: number } | null {
  const target = result.thresholds[difficulty];
  if (target < 2) return null; // can't reach it without buying a critical
  const cost = luckCost(result, target);
  if (cost === null || cost > available) return null;
  return { target, cost };
}

/** Apply a Luck spend, returning a new result. Does not mutate the original. */
export function spendLuck(result: SkillRollResult, points: number): SkillRollResult {
  if (!Number.isInteger(points) || points < 1) {
    throw new RangeError('Luck spend must be a positive whole number.');
  }
  const target = result.roll - points;
  if (luckCost(result, target) === null) {
    throw new Error(`Cannot spend ${points} Luck on a roll of ${result.roll}.`);
  }
  const level = classify(target, result.skill);
  return {
    ...result,
    roll: target,
    level,
    succeeded: meets(level, result.difficulty),
    luckSpent: result.luckSpent + points,
  };
}
