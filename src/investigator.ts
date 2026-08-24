/**
 * Derived investigator statistics and between-scenario development.
 */

import { DerivedStats } from './types';
import { Rng, cryptoRng } from './rng';
import { rollNotation } from './notation';
import { skillRoll } from './skill';

export interface Characteristics {
  STR: number;
  CON: number;
  SIZ: number;
  DEX: number;
  APP: number;
  INT: number;
  POW: number;
  EDU: number;
}

/** Build and damage bonus bands, keyed on STR + SIZ. */
const BUILD_TABLE: Array<{ max: number; build: number; damageBonus: string }> = [
  { max: 64, build: -2, damageBonus: '-2' },
  { max: 84, build: -1, damageBonus: '-1' },
  { max: 124, build: 0, damageBonus: '0' },
  { max: 164, build: 1, damageBonus: '1d4' },
  { max: 204, build: 2, damageBonus: '1d6' },
  { max: 284, build: 3, damageBonus: '2d6' },
  { max: 364, build: 4, damageBonus: '3d6' },
  { max: 444, build: 5, damageBonus: '4d6' },
];

/**
 * Above 444, every additional 80 points adds +1 Build and another D6.
 * (Only Mythos entities get up here, but the table should not simply stop.)
 */
export function buildAndDamageBonus(str: number, siz: number): {
  build: number;
  damageBonus: string;
} {
  const total = Math.max(0, Math.floor(str) + Math.floor(siz));
  for (const band of BUILD_TABLE) {
    if (total <= band.max) return { build: band.build, damageBonus: band.damageBonus };
  }
  const stepsAbove = Math.floor((total - 445) / 80) + 1;
  const dice = 4 + stepsAbove;
  return { build: 5 + stepsAbove, damageBonus: `${dice}d6` };
}

/** Roll the damage bonus for an attack. Flat penalties are returned as-is. */
export function rollDamageBonus(damageBonus: string, rng: Rng = cryptoRng): number {
  const db = damageBonus.trim();
  if (db === '' || db === '0' || db === 'none') return 0;
  if (/^-?\d+$/.test(db)) return parseInt(db, 10);
  return rollNotation(db, rng).total;
}

/**
 * MOV from the relationship between DEX, STR and SIZ, with the standard age
 * penalty (-1 per full decade from 40 onward, floored at 1).
 */
export function moveRate(dex: number, str: number, siz: number, age = 30): number {
  let mov: number;
  if (dex < siz && str < siz) mov = 7;
  else if (dex > siz && str > siz) mov = 9;
  else mov = 8;

  if (age >= 40) mov -= Math.floor(age / 10) - 3;
  return Math.max(1, mov);
}

export function derivedStats(chars: Characteristics, age = 30): DerivedStats {
  const { build, damageBonus } = buildAndDamageBonus(chars.STR, chars.SIZ);
  return {
    hitPoints: Math.floor((chars.CON + chars.SIZ) / 10),
    magicPoints: Math.floor(chars.POW / 5),
    build,
    damageBonus,
    move: moveRate(chars.DEX, chars.STR, chars.SIZ, age),
  };
}

/** Major wound threshold: half maximum hit points, rounded down. */
export function majorWoundThreshold(maxHitPoints: number): number {
  return Math.floor(maxHitPoints / 2);
}

/**
 * Between-scenario skill improvement. A skill flagged as used rolls d100; if
 * the result exceeds the current value (or is 96+), it gains 1D10 points.
 */
export interface ImprovementResult {
  skill: string;
  before: number;
  roll: number;
  improved: boolean;
  gain: number;
  after: number;
}

export function improvementCheck(
  skillName: string,
  value: number,
  rng: Rng = cryptoRng,
): ImprovementResult {
  const check = skillRoll(value, { rng });
  const improved = check.roll > value || check.roll >= 96;
  const gain = improved ? rollNotation('1d10', rng).total : 0;
  return {
    skill: skillName,
    before: value,
    roll: check.roll,
    improved,
    gain,
    after: Math.min(99, value + gain),
  };
}
