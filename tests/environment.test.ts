import { describe, expect, it } from 'vitest';
import { ENV } from '../src/constants';
import { clampEnvironment, createBaselineEnvironment, diffEnvironment, regenerate } from '../src/models/Environment';
import type { EnvironmentState, EnvVariable } from '../src/types';
import { envWith } from './helpers/fixtures';

function regenerateFor(env: EnvironmentState, generations: number, held: Set<EnvVariable> = new Set()): EnvironmentState {
  let next = env;
  for (let i = 0; i < generations; i++) next = regenerate(next, held);
  return next;
}

describe('baseline environment', () => {
  it('starts every index at 100 with no competitor, without needing the UI', () => {
    const env = createBaselineEnvironment();
    expect(env.temperature).toBe(100);
    expect(env.rainfall).toBe(100);
    expect(Object.values(env.food)).toEqual([100, 100, 100, 100]);
    expect(env.cover).toBe(100);
    expect(env.predation).toBe(100);
    expect(env.competition).toBe(0);
    expect(env.competitorDiet).toBeNull();
  });

  it('stays at baseline when nothing happens', () => {
    expect(regenerateFor(createBaselineEnvironment(), 20)).toEqual(createBaselineEnvironment());
  });
});

describe('dependencies between variables', () => {
  it('lowers soft plants, small seeds, and insects when rainfall is held low', () => {
    const dry = regenerateFor(envWith({ rainfall: 50 }), 15, new Set(['rainfall']));
    expect(dry.food.softPlants).toBeLessThan(60);
    expect(dry.food.smallSeeds).toBeLessThan(60);
    expect(dry.food.insects).toBeLessThan(60);
  });

  it('never boosts hard seeds just because of a drought', () => {
    const dry = regenerateFor(envWith({ rainfall: 40 }), 30, new Set(['rainfall']));
    expect(dry.food.hardSeeds).toBeCloseTo(100, 5);
  });

  it('lowers insects in the cold', () => {
    const cold = regenerateFor(envWith({ temperature: 60 }), 15, new Set(['temperature']));
    expect(cold.food.insects).toBeLessThan(50);
  });

  it('lets a competitor reduce only the food it eats', () => {
    const competed = regenerateFor(envWith({ competition: 60, competitorDiet: 'smallSeeds' }), 30);
    expect(competed.food.smallSeeds).toBeLessThan(80);
    expect(competed.food.softPlants).toBeCloseTo(100, 5);
    expect(competed.food.hardSeeds).toBeCloseTo(100, 5);
    expect(competed.food.insects).toBeCloseTo(100, 5);
  });

  it('keeps cover lower while capacity is damaged', () => {
    const damaged = envWith({ capacity: { softPlants: 1, smallSeeds: 1, hardSeeds: 1, insects: 1, cover: 0.9 } });
    expect(regenerateFor(damaged, 40).cover).toBeCloseTo(90, 0);
  });
});

describe('recovery and drift', () => {
  it('lets rainfall and temperature drift back toward normal when no event holds them', () => {
    const env = regenerateFor(envWith({ rainfall: 50, temperature: 70 }), 40);
    expect(Math.abs(env.rainfall - 100)).toBeLessThan(2);
    expect(Math.abs(env.temperature - 100)).toBeLessThan(2);
  });

  it('leaves held variables alone', () => {
    const env = regenerateFor(envWith({ rainfall: 50 }), 10, new Set(['rainfall']));
    expect(env.rainfall).toBe(50);
  });

  it('lets food recover once rain returns', () => {
    const dry = regenerateFor(envWith({ rainfall: 40 }), 20, new Set(['rainfall']));
    const recovered = regenerateFor(dry, 60);
    expect(recovered.food.softPlants).toBeGreaterThan(95);
  });

  it('never makes predators or competitors fade on their own', () => {
    const env = regenerateFor(envWith({ predation: 130, competition: 40, competitorDiet: 'smallSeeds' }), 30);
    expect(env.predation).toBe(130);
    expect(env.competition).toBe(40);
  });
});

describe('bounds', () => {
  it('clamps every variable into its allowed range', () => {
    const wild = envWith({
      temperature: 999,
      rainfall: -50,
      cover: 500,
      predation: -10,
      competition: 400,
      food: { softPlants: -5, smallSeeds: 900, hardSeeds: 200, insects: -1 },
    });
    const env = clampEnvironment(wild);
    expect(env.temperature).toBe(ENV.BOUNDS.temperature[1]);
    expect(env.rainfall).toBe(0);
    expect(env.cover).toBe(ENV.BOUNDS.cover[1]);
    expect(env.predation).toBe(0);
    expect(env.competition).toBe(ENV.BOUNDS.competition[1]);
    for (const value of Object.values(env.food)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(ENV.BOUNDS.food[1]);
    }
  });
});

describe('diffEnvironment', () => {
  it('lists only the variables that changed', () => {
    const before = createBaselineEnvironment();
    const after = envWith({ rainfall: 80, food: { softPlants: 90 } });
    expect(diffEnvironment(before, after)).toEqual([
      { variable: 'rainfall', before: 100, after: 80 },
      { variable: 'softPlants', before: 100, after: 90 },
    ]);
  });
});
