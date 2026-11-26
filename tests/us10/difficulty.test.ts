// US10: beat speed and box size follow the bird's fitness.
import { describe, expect, it } from 'vitest';
import {
  birdFitness,
  DIFFICULTY_FITNESS,
  difficultyForFitness,
  EASY_TRACK,
  HARD_TRACK,
  randomFlockBirdFitness,
  trackForFitness,
} from '../../src/screens/HatchingRhythm/difficulty';
import { droughtEnv, envWith, MEDIUM_BIRD } from '../helpers/fixtures';

describe('track settings from fitness', () => {
  it('a perfectly fit bird plays the easy track, the least fit plays the hard track', () => {
    expect(trackForFitness(1)).toEqual(EASY_TRACK);
    expect(trackForFitness(0)).toEqual(HARD_TRACK);
  });

  it('lower fitness means faster bars, closer bars, and a smaller box', () => {
    let previous = trackForFitness(0);
    for (const fitness of [0.25, 0.5, 0.75, 1]) {
      const next = trackForFitness(fitness);
      expect(next.speed).toBeLessThan(previous.speed);
      expect(next.beatInterval).toBeGreaterThan(previous.beatInterval);
      expect(next.boxWidth).toBeGreaterThan(previous.boxWidth);
      previous = next;
    }
  });

  it('clamps fitness outside 0 to 1', () => {
    expect(trackForFitness(-2)).toEqual(HARD_TRACK);
    expect(trackForFitness(5)).toEqual(EASY_TRACK);
  });

  it('every difficulty has the same number of eggs', () => {
    expect(trackForFitness(0.3).noteCount).toBe(EASY_TRACK.noteCount);
    expect(HARD_TRACK.noteCount).toBe(EASY_TRACK.noteCount);
  });

  it('labels fitness as easy or hard', () => {
    expect(difficultyForFitness(0.9)).toBe('easy');
    expect(difficultyForFitness(0.5)).toBe('easy');
    expect(difficultyForFitness(0.2)).toBe('hard');
  });

  it('the menu choices map to the matching difficulty', () => {
    expect(difficultyForFitness(DIFFICULTY_FITNESS.easy)).toBe('easy');
    expect(difficultyForFitness(DIFFICULTY_FITNESS.hard)).toBe('hard');
  });
});

describe('bird fitness', () => {
  it('is between 0 and 1', () => {
    for (const env of [envWith(), droughtEnv()]) {
      const fitness = birdFitness(MEDIUM_BIRD, env);
      expect(fitness).toBeGreaterThanOrEqual(0);
      expect(fitness).toBeLessThanOrEqual(1);
    }
  });

  it('a drought lowers fitness, which makes hatching harder', () => {
    const normal = birdFitness(MEDIUM_BIRD, envWith());
    const drought = birdFitness(MEDIUM_BIRD, droughtEnv());
    expect(drought).toBeLessThan(normal);
    expect(trackForFitness(drought).boxWidth).toBeLessThan(trackForFitness(normal).boxWidth);
  });
});

describe('fitness of a bird from the current flock', () => {
  const weak = { beak: 0, body: 2, feathers: 1, color: 3 };
  const flock = [{ traits: MEDIUM_BIRD }, { traits: weak }];

  it('uses the fitness of the bird the random pick lands on', () => {
    const env = droughtEnv();
    expect(randomFlockBirdFitness(flock, env, () => 0)).toBe(birdFitness(MEDIUM_BIRD, env));
    expect(randomFlockBirdFitness(flock, env, () => 0.99)).toBe(birdFitness(weak, env));
  });

  it('returns null for an empty flock', () => {
    expect(randomFlockBirdFitness([], envWith())).toBeNull();
  });
});
