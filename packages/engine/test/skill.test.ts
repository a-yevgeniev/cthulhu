import { describe, it, expect } from 'vitest';
import {
  classify,
  thresholdsFor,
  meets,
  rollD100,
  skillRoll,
  pushRoll,
  luckCost,
  spendLuck,
  cheapestLuckSpend,
} from '../src/skill';
import { sequenceRng, seededRng } from '../src/rng';

// sequenceRng takes die FACES as a player reads them: 1..9, and 10 for the "0" face.
// So [4, 8] means a units die showing 4 and a tens die showing 8 -> 84.

describe('thresholdsFor', () => {
  it('halves and fifths, rounding down', () => {
    expect(thresholdsFor(60)).toEqual({ regular: 60, hard: 30, extreme: 12 });
    expect(thresholdsFor(45)).toEqual({ regular: 45, hard: 22, extreme: 9 });
    expect(thresholdsFor(1)).toEqual({ regular: 1, hard: 0, extreme: 0 });
    expect(thresholdsFor(0)).toEqual({ regular: 0, hard: 0, extreme: 0 });
  });

  it('floors fractional and negative skill values', () => {
    expect(thresholdsFor(60.9).regular).toBe(60);
    expect(thresholdsFor(-10).regular).toBe(0);
  });
});

describe('classify', () => {
  it('grades a skill of 60 across every band', () => {
    expect(classify(1, 60)).toBe('critical');
    expect(classify(12, 60)).toBe('extreme');
    expect(classify(13, 60)).toBe('hard');
    expect(classify(30, 60)).toBe('hard');
    expect(classify(31, 60)).toBe('regular');
    expect(classify(60, 60)).toBe('regular');
    expect(classify(61, 60)).toBe('failure');
    expect(classify(99, 60)).toBe('failure');
    expect(classify(100, 60)).toBe('fumble');
  });

  it('opens the 96-99 fumble band only below skill 50', () => {
    expect(classify(96, 49)).toBe('fumble');
    expect(classify(99, 49)).toBe('fumble');
    expect(classify(95, 49)).toBe('failure');
    expect(classify(96, 50)).toBe('failure');
    expect(classify(99, 50)).toBe('failure');
  });

  it('always fumbles on 100, whatever the skill', () => {
    for (const skill of [0, 1, 49, 50, 90, 99]) {
      expect(classify(100, skill)).toBe('fumble');
    }
  });

  it('always crits on 01, whatever the skill', () => {
    for (const skill of [0, 1, 50, 99]) {
      expect(classify(1, skill)).toBe('critical');
    }
  });

  it('rejects out-of-range rolls', () => {
    expect(() => classify(0, 50)).toThrow(RangeError);
    expect(() => classify(101, 50)).toThrow(RangeError);
    expect(() => classify(50.5, 50)).toThrow(RangeError);
  });

  it('never succeeds at skill 0 except on the mandated 01', () => {
    for (let roll = 2; roll <= 100; roll++) {
      expect(['failure', 'fumble']).toContain(classify(roll, 0));
    }
  });
});

describe('meets', () => {
  it('requires the level to reach the demanded difficulty', () => {
    expect(meets('regular', 'regular')).toBe(true);
    expect(meets('regular', 'hard')).toBe(false);
    expect(meets('extreme', 'hard')).toBe(true);
    expect(meets('critical', 'extreme')).toBe(true);
    expect(meets('failure', 'regular')).toBe(false);
    expect(meets('fumble', 'regular')).toBe(false);
  });
});

describe('rollD100', () => {
  it('reads tens 0 + units 0 as 100, not 0', () => {
    const rng = sequenceRng([10, 10]);
    expect(rollD100(0, rng).roll).toBe(100);
  });

  it('builds a plain roll from one tens and one units die', () => {
    const rng = sequenceRng([4, 8]); // units 4, tens 80
    expect(rollD100(0, rng).roll).toBe(84);
  });

  it('takes the lowest total with a bonus die', () => {
    const rng = sequenceRng([4, 8, 2]); // units 4; tens 80 and 20
    const { roll, candidates } = rollD100(1, rng);
    expect(candidates).toEqual([84, 24]);
    expect(roll).toBe(24);
  });

  it('takes the highest total with a penalty die', () => {
    const rng = sequenceRng([4, 8, 2]);
    expect(rollD100(-1, rng).roll).toBe(84);
  });

  it('compares completed totals, so a bonus die beats a 00 with 90', () => {
    // units 0; tens dice 0 and 90 -> candidates 100 and 90.
    // A naive "lowest tens digit" comparison would wrongly pick the 0 tens die.
    const rng = sequenceRng([10, 10, 9]);
    const { roll, candidates } = rollD100(1, rng);
    expect(candidates).toEqual([100, 90]);
    expect(roll).toBe(90);
  });

  it('a penalty die beside a 00 correctly keeps 100 as the worst', () => {
    const rng = sequenceRng([10, 10, 9]);
    expect(rollD100(-1, rng).roll).toBe(100);
  });

  it('rolls one extra tens die per modifier and clamps at 3', () => {
    expect(rollD100(2, sequenceRng([1, 1, 1, 1])).candidates).toHaveLength(3);
    expect(rollD100(9, sequenceRng([1, 1, 1, 1, 1])).candidates).toHaveLength(4);
    expect(rollD100(-9, sequenceRng([1, 1, 1, 1, 1])).candidates).toHaveLength(4);
  });

  it('shares a single units die across all candidates', () => {
    const { candidates } = rollD100(2, sequenceRng([6, 1, 5, 10]));
    expect(candidates).toEqual([16, 56, 6]);
  });

  it('stays within 1-100 over many random rolls', () => {
    const rng = seededRng(1234);
    for (let i = 0; i < 20000; i++) {
      const { roll } = rollD100((i % 7) - 3, rng);
      expect(Number.isInteger(roll)).toBe(true);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(100);
    }
  });

  it('bonus dice measurably lower the average roll and penalty dice raise it', () => {
    const rng = seededRng(99);
    const mean = (mod: number) => {
      let sum = 0;
      for (let i = 0; i < 20000; i++) sum += rollD100(mod, rng).roll;
      return sum / 20000;
    };
    const plain = mean(0);
    expect(mean(1)).toBeLessThan(plain - 5);
    expect(mean(-1)).toBeGreaterThan(plain + 5);
  });

  it('produces a roughly uniform plain d100', () => {
    const rng = seededRng(7);
    const counts = new Array(101).fill(0);
    const n = 100000;
    for (let i = 0; i < n; i++) counts[rollD100(0, rng).roll]++;
    for (let face = 1; face <= 100; face++) {
      expect(counts[face]).toBeGreaterThan(n / 100 - 200);
      expect(counts[face]).toBeLessThan(n / 100 + 200);
    }
  });
});

describe('skillRoll', () => {
  it('reports success against the demanded difficulty', () => {
    const result = skillRoll(60, { difficulty: 'hard', rng: sequenceRng([5, 2]) }); // 25
    expect(result.roll).toBe(25);
    expect(result.level).toBe('hard');
    expect(result.succeeded).toBe(true);
  });

  it('marks a regular success as a failure when Hard was demanded', () => {
    const result = skillRoll(60, { difficulty: 'hard', rng: sequenceRng([1, 5]) }); // 51
    expect(result.roll).toBe(51);
    expect(result.level).toBe('regular');
    expect(result.succeeded).toBe(false);
  });

  it('carries the thresholds so the UI can show the bands', () => {
    const result = skillRoll(75, { rng: sequenceRng([1, 5]) });
    expect(result.thresholds).toEqual({ regular: 75, hard: 37, extreme: 15 });
  });
});

describe('pushRoll', () => {
  it('re-rolls a failure and flags it', () => {
    const failed = skillRoll(30, { rng: sequenceRng([1, 9]) }); // 91
    expect(failed.succeeded).toBe(false);
    const pushed = pushRoll(failed, sequenceRng([1, 2])); // 21
    expect(pushed.pushed).toBe(true);
    expect(pushed.roll).toBe(21);
    expect(pushed.succeeded).toBe(true);
  });

  it('refuses to push a success', () => {
    const ok = skillRoll(80, { rng: sequenceRng([1, 2]) });
    expect(() => pushRoll(ok)).toThrow(/failed roll/);
  });

  it('refuses to push twice', () => {
    const failed = skillRoll(30, { rng: sequenceRng([1, 9]) });
    const once = pushRoll(failed, sequenceRng([1, 9]));
    expect(() => pushRoll(once)).toThrow(/second time/);
  });
});

describe('Luck', () => {
  const failed = () => skillRoll(50, { rng: sequenceRng([5, 6]) }); // 65, failure

  it('charges one point per pip', () => {
    expect(failed().roll).toBe(65);
    expect(luckCost(failed(), 50)).toBe(15);
  });

  it('will not buy a critical', () => {
    expect(luckCost(failed(), 1)).toBeNull();
  });

  it('will not improve a roll of 100', () => {
    const fumbled = skillRoll(50, { rng: sequenceRng([10, 10]) });
    expect(fumbled.roll).toBe(100);
    expect(luckCost(fumbled, 50)).toBeNull();
  });

  it('will not raise a roll or spend on a success', () => {
    expect(luckCost(failed(), 70)).toBeNull();
    const ok = skillRoll(80, { rng: sequenceRng([1, 2]) });
    expect(luckCost(ok, 5)).toBeNull();
  });

  it('applies the spend and reclassifies', () => {
    const after = spendLuck(failed(), 15);
    expect(after.roll).toBe(50);
    expect(after.level).toBe('regular');
    expect(after.succeeded).toBe(true);
    expect(after.luckSpent).toBe(15);
  });

  it('does not mutate the original result', () => {
    const original = failed();
    spendLuck(original, 15);
    expect(original.roll).toBe(65);
    expect(original.luckSpent).toBe(0);
  });

  it('finds the cheapest spend that clears the bar, if affordable', () => {
    expect(cheapestLuckSpend(failed(), 20)).toEqual({ target: 50, cost: 15 });
    expect(cheapestLuckSpend(failed(), 10)).toBeNull();
    expect(cheapestLuckSpend(failed(), 99, 'extreme')).toEqual({ target: 10, cost: 55 });
  });
});
