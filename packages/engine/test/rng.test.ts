import { describe, it, expect } from 'vitest';
import { cryptoRng, seededRng, sequenceRng, rollDie } from '../src/rng';

describe('cryptoRng', () => {
  it('stays in range', () => {
    for (let i = 0; i < 10000; i++) {
      const v = cryptoRng.nextInt(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('handles the degenerate single-outcome case', () => {
    expect(cryptoRng.nextInt(1)).toBe(0);
  });

  it('rejects invalid bounds', () => {
    expect(() => cryptoRng.nextInt(0)).toThrow(RangeError);
    expect(() => cryptoRng.nextInt(-3)).toThrow(RangeError);
    expect(() => cryptoRng.nextInt(2.5)).toThrow(RangeError);
  });

  it('shows no obvious modulo bias on d6 over a large sample', () => {
    const counts = new Array(6).fill(0);
    const n = 600000;
    for (let i = 0; i < n; i++) counts[cryptoRng.nextInt(6)]++;
    const expected = n / 6;
    // Chi-square with 5 d.o.f.; 20.5 is well past the 0.001 critical value.
    const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(20.5);
  });
});

describe('seededRng', () => {
  it('is reproducible from the same seed', () => {
    const a = seededRng(12345);
    const b = seededRng(12345);
    const seqA = Array.from({ length: 50 }, () => a.nextInt(100));
    const seqB = Array.from({ length: 50 }, () => b.nextInt(100));
    expect(seqA).toEqual(seqB);
  });

  it('diverges between seeds', () => {
    const a = Array.from({ length: 50 }, (_, i) => seededRng(1).nextInt(100) + i);
    const b = Array.from({ length: 50 }, (_, i) => seededRng(2).nextInt(100) + i);
    expect(a).not.toEqual(b);
  });
});

describe('sequenceRng', () => {
  it('replays faces in order', () => {
    expect(rollDie(6, sequenceRng([3, 1, 6]))).toBe(3);
  });

  it('throws when exhausted, so tests cannot silently over-roll', () => {
    const rng = sequenceRng([1]);
    rollDie(6, rng);
    expect(() => rollDie(6, rng)).toThrow(/exhausted/);
  });

  it('throws when a scripted face cannot exist on the die requested', () => {
    expect(() => rollDie(6, sequenceRng([9]))).toThrow(/out of range/);
  });
});

describe('rollDie', () => {
  it('returns 1..sides', () => {
    for (let i = 0; i < 5000; i++) {
      const v = rollDie(10);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('rejects nonsense die sizes', () => {
    expect(() => rollDie(0)).toThrow(RangeError);
    expect(() => rollDie(-4)).toThrow(RangeError);
    expect(() => rollDie(3.7)).toThrow(RangeError);
  });
});
