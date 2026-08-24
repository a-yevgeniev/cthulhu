import { describe, it, expect } from 'vitest';
import {
  buildAndDamageBonus,
  rollDamageBonus,
  moveRate,
  derivedStats,
  majorWoundThreshold,
  improvementCheck,
} from '../src/investigator';
import { sequenceRng, seededRng } from '../src/rng';

describe('buildAndDamageBonus', () => {
  it('matches the printed table at every band edge', () => {
    const cases: Array<[number, number, string]> = [
      [2, -2, '-2'],
      [64, -2, '-2'],
      [65, -1, '-1'],
      [84, -1, '-1'],
      [85, 0, '0'],
      [124, 0, '0'],
      [125, 1, '1d4'],
      [164, 1, '1d4'],
      [165, 2, '1d6'],
      [204, 2, '1d6'],
      [205, 3, '2d6'],
      [284, 3, '2d6'],
      [285, 4, '3d6'],
      [364, 4, '3d6'],
      [365, 5, '4d6'],
      [444, 5, '4d6'],
    ];
    for (const [total, build, damageBonus] of cases) {
      expect(buildAndDamageBonus(total, 0)).toEqual({ build, damageBonus });
    }
  });

  it('extends past the table at +1 die per 80 points', () => {
    expect(buildAndDamageBonus(445, 0)).toEqual({ build: 6, damageBonus: '5d6' });
    expect(buildAndDamageBonus(524, 0)).toEqual({ build: 6, damageBonus: '5d6' });
    expect(buildAndDamageBonus(525, 0)).toEqual({ build: 7, damageBonus: '6d6' });
  });

  it('adds STR and SIZ rather than taking either alone', () => {
    expect(buildAndDamageBonus(60, 70)).toEqual(buildAndDamageBonus(130, 0));
  });
});

describe('rollDamageBonus', () => {
  it('returns flat penalties without rolling', () => {
    expect(rollDamageBonus('-2')).toBe(-2);
    expect(rollDamageBonus('-1')).toBe(-1);
    expect(rollDamageBonus('0')).toBe(0);
  });

  it('rolls dice bonuses', () => {
    expect(rollDamageBonus('1d4', sequenceRng([3]))).toBe(3);
    expect(rollDamageBonus('2d6', sequenceRng([4, 5]))).toBe(9);
  });
});

describe('moveRate', () => {
  it('is 7 when both DEX and STR trail SIZ', () => {
    expect(moveRate(40, 40, 70)).toBe(7);
  });

  it('is 9 when both exceed SIZ', () => {
    expect(moveRate(80, 80, 50)).toBe(9);
  });

  it('is 8 in the mixed and equal cases', () => {
    expect(moveRate(80, 40, 50)).toBe(8);
    expect(moveRate(50, 50, 50)).toBe(8);
  });

  it('applies the age penalty from 40 onward, never below 1', () => {
    expect(moveRate(80, 80, 50, 39)).toBe(9);
    expect(moveRate(80, 80, 50, 40)).toBe(8);
    expect(moveRate(80, 80, 50, 50)).toBe(7);
    expect(moveRate(40, 40, 70, 89)).toBe(2); // 7 base, -5 for the eighties
    expect(moveRate(40, 40, 70, 130)).toBe(1); // floored, never zero or negative
  });
});

describe('derivedStats', () => {
  it('computes HP, MP, build, damage bonus and MOV together', () => {
    const stats = derivedStats(
      { STR: 60, CON: 70, SIZ: 65, DEX: 55, APP: 50, INT: 70, POW: 60, EDU: 80 },
      35,
    );
    expect(stats.hitPoints).toBe(13); // (70 + 65) / 10, rounded down
    expect(stats.magicPoints).toBe(12); // 60 / 5
    expect(stats.build).toBe(1); // STR + SIZ = 125
    expect(stats.damageBonus).toBe('1d4');
    expect(stats.move).toBe(7); // DEX and STR both under SIZ
  });
});

describe('majorWoundThreshold', () => {
  it('is half of maximum hit points, rounded down', () => {
    expect(majorWoundThreshold(13)).toBe(6);
    expect(majorWoundThreshold(10)).toBe(5);
  });
});

describe('improvementCheck', () => {
  it('grants 1D10 when the roll beats the skill', () => {
    // d100 -> units 5, tens 80 = 85, beats 60. Then 1d10 shows 7.
    const r = improvementCheck('Spot Hidden', 60, sequenceRng([5, 8, 7]));
    expect(r.improved).toBe(true);
    expect(r.gain).toBe(7);
    expect(r.after).toBe(67);
  });

  it('grants nothing when the roll is at or under the skill', () => {
    const r = improvementCheck('Spot Hidden', 60, sequenceRng([1, 2])); // 21
    expect(r.improved).toBe(false);
    expect(r.gain).toBe(0);
    expect(r.after).toBe(60);
  });

  it('always improves on 96+ even for a high skill', () => {
    const r = improvementCheck('Occult', 98, sequenceRng([7, 9, 3])); // 97
    expect(r.improved).toBe(true);
    expect(r.after).toBe(99); // capped
  });

  it('never pushes a skill past 99', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 2000; i++) {
      expect(improvementCheck('Dodge', 95, rng).after).toBeLessThanOrEqual(99);
    }
  });
});
