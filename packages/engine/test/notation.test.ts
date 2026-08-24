import { describe, it, expect } from 'vitest';
import { rollNotation, isValidNotation } from '../src/notation';
import { sequenceRng, seededRng } from '../src/rng';

describe('rollNotation', () => {
  it('rolls a single die', () => {
    const r = rollNotation('1d6', sequenceRng([4]));
    expect(r.total).toBe(4);
    expect(r.groups[0].rolls).toEqual([4]);
  });

  it('defaults an omitted count to 1', () => {
    expect(rollNotation('d8', sequenceRng([7])).total).toBe(7);
  });

  it('sums several dice', () => {
    expect(rollNotation('3d6', sequenceRng([1, 5, 6])).total).toBe(12);
  });

  it('handles addition of mixed dice, the classic damage line', () => {
    const r = rollNotation('1d6+1d4', sequenceRng([5, 3]));
    expect(r.total).toBe(8);
    expect(r.groups).toHaveLength(2);
  });

  it('handles flat modifiers and subtraction', () => {
    expect(rollNotation('2d10+4', sequenceRng([3, 3])).total).toBe(10);
    expect(rollNotation('1d6-2', sequenceRng([5])).total).toBe(3);
  });

  it('handles multiplication, as in 3d6*5 for percentile characteristics', () => {
    expect(rollNotation('3d6*5', sequenceRng([4, 4, 4])).total).toBe(60);
  });

  it('respects precedence and parentheses', () => {
    expect(rollNotation('1+2*3', seededRng(1)).total).toBe(7);
    expect(rollNotation('(1+2)*3', seededRng(1)).total).toBe(9);
  });

  it('truncates division toward zero, matching "round down" at the table', () => {
    expect(rollNotation('7/2', seededRng(1)).total).toBe(3);
    expect(rollNotation('1d6/2', sequenceRng([5])).total).toBe(2);
  });

  it('treats d% as d100', () => {
    const r = rollNotation('d%', sequenceRng([73]));
    expect(r.groups[0].sides).toBe(100);
    expect(r.total).toBe(73);
  });

  it('is case-insensitive', () => {
    expect(rollNotation('2D6+1', sequenceRng([2, 3])).total).toBe(6);
  });

  it('ignores whitespace', () => {
    expect(rollNotation('  2d6 + 3 ', sequenceRng([1, 1])).total).toBe(5);
  });

  it('keeps the highest N dice', () => {
    const r = rollNotation('4d6kh3', sequenceRng([6, 1, 4, 5]));
    expect(r.total).toBe(15);
    expect(r.groups[0].dropped).toEqual([1]);
  });

  it('keeps the lowest N dice', () => {
    const r = rollNotation('3d6kl1', sequenceRng([6, 2, 4]));
    expect(r.total).toBe(2);
    expect(r.groups[0].dropped).toEqual([0, 2]);
  });

  it('defaults keep count to 1', () => {
    expect(rollNotation('2d20kh', sequenceRng([3, 17])).total).toBe(17);
  });

  it('applies a leading unary minus', () => {
    expect(rollNotation('-1d4', sequenceRng([3])).total).toBe(-3);
  });

  it('reports every die it rolled for the log', () => {
    const r = rollNotation('2d6+1d4+1', sequenceRng([2, 3, 4]));
    expect(r.groups.map((g) => g.rolls)).toEqual([[2, 3], [4]]);
    expect(r.total).toBe(10);
  });

  it('rejects malformed input', () => {
    expect(() => rollNotation('')).toThrow(SyntaxError);
    expect(() => rollNotation('2d')).toThrow();
    expect(() => rollNotation('1d6+')).toThrow(SyntaxError);
    expect(() => rollNotation('(1d6')).toThrow(SyntaxError);
    expect(() => rollNotation('1d6)')).toThrow(SyntaxError);
    expect(() => rollNotation('1d6 & 2')).toThrow(SyntaxError);
    expect(() => rollNotation('1d0', seededRng(1))).toThrow(RangeError);
    expect(() => rollNotation('1d6/0', seededRng(1))).toThrow(RangeError);
  });

  it('refuses abusive dice counts rather than hanging the tab', () => {
    expect(() => rollNotation('99999d6', seededRng(1))).toThrow(RangeError);
    expect(() => rollNotation('1d99999999', seededRng(1))).toThrow(RangeError);
  });

  it('keeps every die within its own range over many rolls', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 5000; i++) {
      const r = rollNotation('1d3+2d8+3d10', rng);
      const [d3, d8, d10] = r.groups;
      expect(d3.rolls.every((v) => v >= 1 && v <= 3)).toBe(true);
      expect(d8.rolls.every((v) => v >= 1 && v <= 8)).toBe(true);
      expect(d10.rolls.every((v) => v >= 1 && v <= 10)).toBe(true);
      expect(r.total).toBe(d3.subtotal + d8.subtotal + d10.subtotal);
    }
  });
});

describe('isValidNotation', () => {
  it('accepts well-formed expressions', () => {
    for (const n of ['1d6', 'd%', '3d6*5', '2d10+4', '(1d6+2)*2', '4d6kh3']) {
      expect(isValidNotation(n)).toBe(true);
    }
  });

  it('rejects junk without throwing', () => {
    for (const n of ['', 'abc', '1d6+', 'd', '((1d6)']) {
      expect(isValidNotation(n)).toBe(false);
    }
  });
});
