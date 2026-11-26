import { describe, expect, it } from 'vitest';
import { MID_RUN_MINIGAMES, MINIGAME_SCHEDULE, MinigameManager } from '../src/minigames/MinigameManager';

/** Plays back the given numbers, repeating the last one. */
const sequence = (...values: number[]) => () => (values.length > 1 ? values.shift()! : values[0]);

describe('MinigameManager scheduling', () => {
  it('uses a 5 generation gap and includes only US8 and US10 between generations', () => {
    expect(MINIGAME_SCHEDULE.MIN_GAP).toBe(5);
    expect(MID_RUN_MINIGAMES).toEqual(['extinction', 'hatching']);
  });

  it('is not eligible before generation 5', () => {
    const manager = new MinigameManager({ random: () => 0 });
    for (let generation = 0; generation < 5; generation++) {
      expect(manager.isEligible(generation)).toBe(false);
      expect(manager.startMidRun(generation)).toBeNull();
    }
    expect(manager.startMidRun(5)).not.toBeNull();
    expect(manager.lastMinigameGeneration).toBe(5);
  });

  it('waits at least 5 generations after the previous minigame', () => {
    const manager = new MinigameManager({ random: () => 0 });
    expect(manager.startMidRun(7)).toBe('extinction');
    manager.finish('extinction');
    for (let generation = 8; generation < 12; generation++) {
      expect(manager.startMidRun(generation)).toBeNull();
    }
    expect(manager.startMidRun(12)).toBe('extinction');
  });

  it('only appears when the random chance passes, so the timing varies', () => {
    const manager = new MinigameManager({ chance: 0.35, random: sequence(0.9, 0.5, 0.1, 0) });
    expect(manager.startMidRun(5)).toBeNull(); // 0.9 misses
    expect(manager.startMidRun(6)).toBeNull(); // 0.5 misses
    expect(manager.startMidRun(7)).toBe('extinction'); // 0.1 hits, then 0 picks the first game
    expect(manager.lastMinigameGeneration).toBe(7);
  });

  it('picks randomly between the mid-run minigames', () => {
    const pick = (roll: number) => new MinigameManager({ random: sequence(0, roll) }).startMidRun(5);
    expect(pick(0)).toBe('extinction');
    expect(pick(0.49)).toBe('extinction');
    expect(pick(0.5)).toBe('hatching');
    expect(pick(0.999)).toBe('hatching');

    const seen = new Set<string | null>();
    for (let i = 0; i < 50; i++) seen.add(new MinigameManager({ chance: 1 }).startMidRun(5));
    expect(seen).toEqual(new Set(['extinction', 'hatching']));
  });

  it('allows only one minigame at a time', () => {
    const manager = new MinigameManager({ random: () => 0 });
    expect(manager.startMidRun(5)).toBe('extinction');
    expect(manager.active).toBe('extinction');
    expect(manager.startMidRun(50)).toBeNull();
    expect(manager.startEndOfRun()).toBeNull();

    manager.finish('hatching'); // not the active one: ignored
    expect(manager.active).toBe('extinction');
    manager.finish('extinction');
    expect(manager.active).toBeNull();
    expect(manager.startEndOfRun()).toBe('quiz');
    expect(manager.active).toBe('quiz');
    expect(manager.startMidRun(50)).toBeNull();
  });

  it('offers the quiz once, at the end of the run', () => {
    const manager = new MinigameManager();
    expect(manager.startEndOfRun()).toBe('quiz');
    manager.finish('quiz');
    expect(manager.startEndOfRun()).toBeNull();
  });

  it('rejects an empty minigame list', () => {
    expect(() => new MinigameManager({ midRun: [] })).toThrow();
  });
});
