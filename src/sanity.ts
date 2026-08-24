/**
 * Sanity: checks, loss expressions and the three flavours of insanity.
 */

import { DiceRollResult, SanityRollResult } from './types';
import { Rng, cryptoRng } from './rng';
import { rollNotation, isValidNotation } from './notation';
import { skillRoll } from './skill';

/** A parsed "success/failure" loss expression such as "1/1D6" or "0/1D4+1". */
export interface SanityLossSpec {
  onSuccess: string;
  onFailure: string;
}

/**
 * Parse the printed form, e.g. "1/1D6", "0/1", "1D3/1D20", "none/1D2".
 * A single term with no slash is treated as applying to a failure only.
 */
export function parseSanityLoss(text: string): SanityLossSpec {
  const raw = text.trim();
  if (raw === '') throw new SyntaxError('Empty Sanity loss expression');

  const parts = raw.split('/').map((p) => p.trim());
  if (parts.length > 2) {
    throw new SyntaxError(`Sanity loss must have at most one '/': "${text}"`);
  }

  const normalise = (p: string): string => {
    const v = p.toLowerCase();
    if (v === '' || v === 'none' || v === '-' || v === '0') return '0';
    if (!isValidNotation(p)) throw new SyntaxError(`Unparseable Sanity loss term: "${p}"`);
    return p;
  };

  if (parts.length === 1) return { onSuccess: '0', onFailure: normalise(parts[0]) };
  return { onSuccess: normalise(parts[0]), onFailure: normalise(parts[1]) };
}

export interface SanityCheckOptions {
  /** Current Sanity points. */
  sanity: number;
  /** Starting Sanity for this investigator, used for the indefinite-insanity test. */
  startingSanity?: number;
  /** SAN already lost this game session, used for the indefinite-insanity test. */
  lostThisSession?: number;
  /** e.g. "1/1D6". */
  loss: string | SanityLossSpec;
  /** Bonus/penalty dice on the check itself. Rare, but the Keeper may call it. */
  modifierDice?: number;
  rng?: Rng;
}

/**
 * Roll a Sanity check and resolve the loss.
 *
 * Insanity outcomes:
 *  - Temporary: 5 or more points lost from a single check.
 *  - Indefinite: a fifth or more of starting Sanity lost within one session.
 *  - Permanent: Sanity reduced to 0.
 *
 * Luck may never be spent on a Sanity check, so this returns no Luck affordance.
 */
export function sanityCheck(options: SanityCheckOptions): SanityRollResult {
  const {
    sanity,
    startingSanity = sanity,
    lostThisSession = 0,
    loss,
    modifierDice = 0,
    rng = cryptoRng,
  } = options;

  if (!Number.isInteger(sanity) || sanity < 0) {
    throw new RangeError(`Sanity must be a non-negative integer, got ${sanity}`);
  }

  const spec = typeof loss === 'string' ? parseSanityLoss(loss) : loss;
  const check = skillRoll(sanity, { modifierDice, rng });
  const expression = check.succeeded ? spec.onSuccess : spec.onFailure;

  let lossRoll: DiceRollResult | undefined;
  let amount = 0;
  if (expression !== '0') {
    lossRoll = rollNotation(expression, rng);
    amount = Math.max(0, lossRoll.total);
  }

  const sanityAfter = Math.max(0, sanity - amount);
  const actualLoss = sanity - sanityAfter;
  const sessionTotal = lostThisSession + actualLoss;

  return {
    check,
    loss: actualLoss,
    lossRoll,
    sanityBefore: sanity,
    sanityAfter,
    temporaryInsanity: actualLoss >= 5 && sanityAfter > 0,
    permanentInsanity: sanityAfter === 0,
    indefiniteInsanity:
      startingSanity > 0 && sessionTotal >= Math.ceil(startingSanity / 5) && sanityAfter > 0,
  };
}

/** Maximum Sanity is 99 minus Cthulhu Mythos skill. */
export function maxSanity(cthulhuMythos: number): number {
  return Math.max(0, 99 - Math.max(0, Math.floor(cthulhuMythos)));
}

/** Duration of a bout of temporary insanity: 1D10 rounds. */
export function temporaryInsanityDuration(rng: Rng = cryptoRng): DiceRollResult {
  return rollNotation('1d10', rng);
}

/** Duration of indefinite insanity: 1D10 months of real-world game time. */
export function indefiniteInsanityDuration(rng: Rng = cryptoRng): DiceRollResult {
  return rollNotation('1d10', rng);
}
