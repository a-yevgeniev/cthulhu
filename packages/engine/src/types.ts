/**
 * Core types for the Call of Cthulhu 7e rules engine.
 */

/** Outcome tiers of a d100 skill roll, ordered worst -> best. */
export type SuccessLevel =
  | 'fumble'
  | 'failure'
  | 'regular'
  | 'hard'
  | 'extreme'
  | 'critical';

/** Numeric ranking so levels can be compared (opposed rolls, UI sorting). */
export const LEVEL_RANK: Record<SuccessLevel, number> = {
  fumble: 0,
  failure: 1,
  regular: 2,
  hard: 3,
  extreme: 4,
  critical: 5,
};

export function isSuccess(level: SuccessLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK.regular;
}

/** The three difficulty bands a Keeper can call for. */
export type Difficulty = 'regular' | 'hard' | 'extreme';

/** Thresholds derived from a skill value. */
export interface Thresholds {
  regular: number;
  hard: number;
  extreme: number;
}

/** A single d100 skill/characteristic roll result. */
export interface SkillRollResult {
  /** Final 1-100 value after bonus/penalty selection. */
  roll: number;
  /** Skill/characteristic value tested against. */
  skill: number;
  /** Difficulty the Keeper demanded. */
  difficulty: Difficulty;
  /** Best level the roll achieved, ignoring the demanded difficulty. */
  level: SuccessLevel;
  /** Whether `level` meets or beats `difficulty`. */
  succeeded: boolean;
  thresholds: Thresholds;
  /** Net bonus (+) / penalty (-) dice applied. */
  modifierDice: number;
  /** Every candidate total considered, in roll order. First is the "natural" roll. */
  candidates: number[];
  /** Raw dice as rolled: the shared units die and each tens die (already x10). */
  raw: { units: number; tens: number[] };
  /** True if this was a re-roll of an earlier failure. */
  pushed: boolean;
  /** Luck points spent to improve the result, if any. */
  luckSpent: number;
}

/** Result of one dice-notation evaluation, e.g. "2d6+3". */
export interface DiceRollResult {
  notation: string;
  total: number;
  /** Every die rolled, grouped by the dice term that produced it. */
  groups: DiceGroup[];
}

export interface DiceGroup {
  /** e.g. "3d6kh2" */
  spec: string;
  sides: number;
  rolls: number[];
  /** Indices into `rolls` that were discarded by keep-highest/keep-lowest. */
  dropped: number[];
  subtotal: number;
}

/** Sanity check result. */
export interface SanityRollResult {
  check: SkillRollResult;
  /** Points actually deducted. */
  loss: number;
  /** How the loss was rolled, if it was rolled. */
  lossRoll?: DiceRollResult;
  sanityBefore: number;
  sanityAfter: number;
  /** Lost 5+ SAN from a single source -> temporary insanity. */
  temporaryInsanity: boolean;
  /** Fell to 0 SAN. */
  permanentInsanity: boolean;
  /** Lost >= 20% of starting SAN over the campaign -> indefinite insanity check. */
  indefiniteInsanity: boolean;
}

/** Opposed roll outcome. */
export interface OpposedRollResult {
  a: SkillRollResult;
  b: SkillRollResult;
  winner: 'a' | 'b' | 'tie';
  reason: 'level' | 'skill' | 'both-failed' | 'dead-heat';
}

/** Derived investigator statistics. */
export interface DerivedStats {
  hitPoints: number;
  magicPoints: number;
  build: number;
  damageBonus: string;
  move: number;
}
