/**
 * Randomness. Everything in the engine funnels through this interface so tests
 * can be deterministic and so the production source is auditable in one place.
 */

export interface Rng {
  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

/**
 * Default RNG: crypto.getRandomValues with rejection sampling.
 *
 * The naive `value % max` introduces modulo bias when 2^32 is not divisible by
 * max — which is the case for d3, d6, d100 and most dice we care about. We
 * discard values in the biased tail and redraw. Expected redraws are far below
 * one per call for any realistic die size.
 */
export const cryptoRng: Rng = {
  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError(`nextInt requires a positive integer, got ${maxExclusive}`);
    }
    if (maxExclusive === 1) return 0;

    const RANGE = 0x1_0000_0000; // 2^32
    const limit = RANGE - (RANGE % maxExclusive);
    const buf = new Uint32Array(1);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      globalThis.crypto.getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % maxExclusive;
    }
  },
};

/**
 * Seeded RNG (mulberry32). Deterministic and fast. Use for replaying a session,
 * property-based tests, or offline demos — not as a substitute for cryptoRng
 * at a live table, since the sequence is predictable from the seed.
 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  const nextFloat = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(`nextInt requires a positive integer, got ${maxExclusive}`);
      }
      return Math.floor(nextFloat() * maxExclusive);
    },
  };
}

/**
 * Test double: replays a fixed list of *die faces* (1-based, as a player would
 * read them). Throws if the sequence runs dry, which keeps tests honest about
 * how many dice they expect to be rolled.
 *
 * For a tens die on a d100, supply the face as 1..10 where 10 means "0".
 */
export function sequenceRng(faces: number[]): Rng {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (i >= faces.length) {
        throw new Error(`sequenceRng exhausted after ${faces.length} draws`);
      }
      const face = faces[i++];
      if (face < 1 || face > maxExclusive) {
        throw new Error(
          `sequenceRng: face ${face} at index ${i - 1} is out of range for d${maxExclusive}`,
        );
      }
      return face - 1;
    },
  };
}

/** Roll a single die with `sides` faces, returning 1..sides. */
export function rollDie(sides: number, rng: Rng = cryptoRng): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new RangeError(`Invalid die size: d${sides}`);
  }
  return rng.nextInt(sides) + 1;
}
