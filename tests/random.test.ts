import { describe, expect, it } from 'vitest';
import { RandomSource } from '../src/simulation/Random';

describe('RandomSource', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new RandomSource(123);
    const b = new RandomSource(123);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new RandomSource(1);
    const b = new RandomSource(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('resumes exactly from a saved state', () => {
    const rng = new RandomSource(99);
    for (let i = 0; i < 10; i++) rng.next();
    const saved = rng.getState();
    const expected = Array.from({ length: 5 }, () => rng.next());

    const resumed = new RandomSource(0);
    resumed.setState(saved);
    expect(Array.from({ length: 5 }, () => resumed.next())).toEqual(expected);
  });

  it('keeps next() in [0, 1) and int() within its inclusive bounds', () => {
    const rng = new RandomSource(5);
    for (let i = 0; i < 1000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = rng.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('keeps triangular() in range and centered on the midpoint', () => {
    const rng = new RandomSource(7);
    let sum = 0;
    const samples = 5000;
    for (let i = 0; i < samples; i++) {
      const x = rng.triangular(2, 6);
      expect(x).toBeGreaterThanOrEqual(2);
      expect(x).toBeLessThanOrEqual(6);
      sum += x;
    }
    expect(sum / samples).toBeCloseTo(4, 1);
  });

  it('shuffle() returns a permutation without changing the input', () => {
    const rng = new RandomSource(11);
    const input = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...shuffled].sort()).toEqual(input);
  });

  it('weightedPick() never picks a zero-weight item', () => {
    const rng = new RandomSource(13);
    for (let i = 0; i < 500; i++) {
      expect(rng.weightedPick(['a', 'b', 'c'], [1, 0, 3])).not.toBe('b');
    }
  });
});
