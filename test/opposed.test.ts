import { describe, it, expect } from 'vitest';
import { resolveOpposed, opposedRoll } from '../src/opposed';
import { skillRoll } from '../src/skill';
import { sequenceRng, seededRng } from '../src/rng';

const roll = (skill: number, faces: number[]) => skillRoll(skill, { rng: sequenceRng(faces) });

describe('resolveOpposed', () => {
  it('gives it to the only side that succeeded', () => {
    const a = roll(70, [1, 2]); // 21, regular
    const b = roll(40, [5, 8]); // 85, failure
    expect(resolveOpposed(a, b).winner).toBe('a');
    expect(resolveOpposed(b, a).winner).toBe('b');
  });

  it('gives it to the higher success level', () => {
    const a = roll(70, [1, 1]); // 11, extreme (70/5 = 14)
    const b = roll(70, [1, 5]); // 51, regular
    const result = resolveOpposed(a, b);
    expect(result.winner).toBe('a');
    expect(result.reason).toBe('level');
  });

  it('breaks a level tie on the higher skill', () => {
    const a = roll(70, [1, 5]); // 51, regular
    const b = roll(80, [1, 6]); // 61, regular
    const result = resolveOpposed(a, b);
    expect(result.winner).toBe('b');
    expect(result.reason).toBe('skill');
  });

  it('calls a dead heat when level and skill both tie', () => {
    const a = roll(70, [1, 5]); // 51, regular
    const b = roll(70, [2, 5]); // 52, regular
    const result = resolveOpposed(a, b);
    expect(result.winner).toBe('tie');
    expect(result.reason).toBe('dead-heat');
  });

  it('leaves the status quo when both sides fail', () => {
    const a = roll(30, [5, 8]); // 85, failure
    const b = roll(40, [1, 9]); // 91, failure
    const result = resolveOpposed(a, b);
    expect(result.winner).toBe('tie');
    expect(result.reason).toBe('both-failed');
  });

  it('lets a fumble lose to an ordinary failure only as a shared non-result', () => {
    const a = roll(30, [10, 10]); // 100, fumble
    const b = roll(30, [5, 8]); // 85, failure
    expect(resolveOpposed(a, b).winner).toBe('tie');
  });
});

describe('opposedRoll', () => {
  it('always names a winner or an explicit tie', () => {
    const rng = seededRng(555);
    for (let i = 0; i < 5000; i++) {
      const result = opposedRoll({ skill: 55 }, { skill: 45, modifierDice: -1 }, rng);
      expect(['a', 'b', 'tie']).toContain(result.winner);
      if (result.winner === 'a') expect(result.a.succeeded).toBe(true);
      if (result.winner === 'b') expect(result.b.succeeded).toBe(true);
    }
  });
});
