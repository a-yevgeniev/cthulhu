import { describe, it, expect } from 'vitest';
import { parseSanityLoss, sanityCheck, maxSanity } from '../src/sanity';
import { sequenceRng, seededRng } from '../src/rng';

describe('parseSanityLoss', () => {
  it('splits the printed success/failure form', () => {
    expect(parseSanityLoss('1/1D6')).toEqual({ onSuccess: '1', onFailure: '1D6' });
    expect(parseSanityLoss('1D3/1D20')).toEqual({ onSuccess: '1D3', onFailure: '1D20' });
  });

  it('normalises zero-loss terms', () => {
    expect(parseSanityLoss('0/1D4')).toEqual({ onSuccess: '0', onFailure: '1D4' });
    expect(parseSanityLoss('none/1D2').onSuccess).toBe('0');
    expect(parseSanityLoss('/1D2').onSuccess).toBe('0');
  });

  it('treats a lone term as failure-only loss', () => {
    expect(parseSanityLoss('1D6')).toEqual({ onSuccess: '0', onFailure: '1D6' });
  });

  it('rejects nonsense', () => {
    expect(() => parseSanityLoss('')).toThrow(SyntaxError);
    expect(() => parseSanityLoss('1/2/3')).toThrow(SyntaxError);
    expect(() => parseSanityLoss('1/banana')).toThrow(SyntaxError);
  });
});

describe('sanityCheck', () => {
  it('applies the success loss on a passed check', () => {
    // check: units 1, tens 10 -> 11, passes SAN 60. Then flat loss of 1, no dice.
    const r = sanityCheck({ sanity: 60, loss: '1/1D6', rng: sequenceRng([1, 1]) });
    expect(r.check.succeeded).toBe(true);
    expect(r.loss).toBe(1);
    expect(r.sanityAfter).toBe(59);
    expect(r.lossRoll?.groups).toEqual([]);
  });

  it('rolls the failure loss on a failed check', () => {
    // check: units 5, tens 80 -> 85, fails SAN 60. Then 1d6 showing 4.
    const r = sanityCheck({ sanity: 60, loss: '1/1D6', rng: sequenceRng([5, 8, 4]) });
    expect(r.check.succeeded).toBe(false);
    expect(r.loss).toBe(4);
    expect(r.sanityAfter).toBe(56);
  });

  it('flags temporary insanity at 5+ points from one source', () => {
    const four = sanityCheck({ sanity: 60, loss: '0/1D6', rng: sequenceRng([5, 8, 4]) });
    expect(four.temporaryInsanity).toBe(false);
    const five = sanityCheck({ sanity: 60, loss: '0/1D6', rng: sequenceRng([5, 8, 5]) });
    expect(five.temporaryInsanity).toBe(true);
  });

  it('flags permanent insanity at zero and never goes negative', () => {
    const r = sanityCheck({ sanity: 3, loss: '0/1D20', rng: sequenceRng([5, 8, 18]) });
    expect(r.sanityAfter).toBe(0);
    expect(r.loss).toBe(3); // only the points actually available are lost
    expect(r.permanentInsanity).toBe(true);
    expect(r.temporaryInsanity).toBe(false); // superseded by the worse outcome
  });

  it('flags indefinite insanity at a fifth of starting Sanity in one session', () => {
    const below = sanityCheck({
      sanity: 60,
      startingSanity: 60,
      lostThisSession: 6,
      loss: '0/1D6',
      rng: sequenceRng([5, 8, 5]),
    });
    expect(below.indefiniteInsanity).toBe(false); // 6 + 5 = 11, needs 12

    const at = sanityCheck({
      sanity: 60,
      startingSanity: 60,
      lostThisSession: 7,
      loss: '0/1D6',
      rng: sequenceRng([5, 8, 5]),
    });
    expect(at.indefiniteInsanity).toBe(true); // 7 + 5 = 12
  });

  it('never loses Sanity when the expression is 0', () => {
    const r = sanityCheck({ sanity: 60, loss: '0/0', rng: sequenceRng([5, 8]) });
    expect(r.loss).toBe(0);
    expect(r.sanityAfter).toBe(60);
    expect(r.lossRoll).toBeUndefined();
  });

  it('rejects a negative or fractional Sanity score', () => {
    expect(() => sanityCheck({ sanity: -1, loss: '1/1D6' })).toThrow(RangeError);
    expect(() => sanityCheck({ sanity: 4.5, loss: '1/1D6' })).toThrow(RangeError);
  });

  it('stays consistent over many random checks', () => {
    const rng = seededRng(2024);
    for (let i = 0; i < 5000; i++) {
      const r = sanityCheck({ sanity: 55, loss: '1/1D10', rng });
      expect(r.sanityAfter).toBe(r.sanityBefore - r.loss);
      expect(r.sanityAfter).toBeGreaterThanOrEqual(0);
      expect(r.permanentInsanity).toBe(r.sanityAfter === 0);
    }
  });
});

describe('maxSanity', () => {
  it('is 99 minus Cthulhu Mythos', () => {
    expect(maxSanity(0)).toBe(99);
    expect(maxSanity(15)).toBe(84);
    expect(maxSanity(120)).toBe(0);
  });
});
