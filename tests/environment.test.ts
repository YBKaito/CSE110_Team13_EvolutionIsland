import { describe, expect, it } from 'vitest';
import { ENV } from '../src/constants';
import { clampEnvironment, createBaselineEnvironment, diffEnvironment, ENV_VARIABLES, getValue, regenerate } from '../src/models/Environment';
import { RandomSource } from '../src/simulation/Random';
import type { EnvironmentState, EnvVariable } from '../src/types';
import { envWith } from './helpers/fixtures';

const NORMAL = ENV.NORMAL;

function regenerateFor(env: EnvironmentState, generations: number, held: Set<EnvVariable> = new Set(), seed = 1): EnvironmentState {
  const rng = new RandomSource(seed);
  let next = env;
  for (let i = 0; i < generations; i++) next = regenerate(next, rng, held);
  return next;
}

describe('baseline environment', () => {
  it('starts every value at normal (50) with no competitor, without needing the UI', () => {
    const env = createBaselineEnvironment();
    expect(env.temperature).toBe(NORMAL);
    expect(env.rainfall).toBe(NORMAL);
    expect(Object.values(env.food)).toEqual([NORMAL, NORMAL, NORMAL, NORMAL]);
    expect(env.cover).toBe(NORMAL);
    expect(env.predation).toBe(NORMAL);
    expect(env.competition).toBe(0);
    expect(env.competitorDiet).toBeNull();
  });

  it('stays at normal when nothing happens', () => {
    expect(regenerateFor(createBaselineEnvironment(), 20)).toEqual(createBaselineEnvironment());
  });
});

describe('whole numbers from 0 to 100', () => {
  it('keeps every value a whole number in range while the island changes', () => {
    for (let seed = 1; seed <= 10; seed++) {
      let env = envWith({ rainfall: 13, temperature: 81, competition: 30, competitorDiet: 'smallSeeds' });
      const rng = new RandomSource(seed);
      for (let gen = 0; gen < 60; gen++) {
        env = regenerate(env, rng, gen < 20 ? new Set<EnvVariable>(['rainfall']) : new Set());
        for (const variable of ENV_VARIABLES) {
          const value = getValue(env, variable);
          expect(Number.isInteger(value), `${variable} = ${value}`).toBe(true);
          expect(value).toBeGreaterThanOrEqual(ENV.MIN);
          expect(value).toBeLessThanOrEqual(ENV.MAX);
        }
      }
    }
  });

  it('rounds and clamps out-of-range or fractional values', () => {
    const env = clampEnvironment(
      envWith({
        temperature: 999,
        rainfall: -50,
        cover: 37.6,
        predation: -10,
        competition: 400,
        food: { softPlants: -5, smallSeeds: 900, hardSeeds: 49.2, insects: 12.5 },
      }),
    );
    expect(env.temperature).toBe(ENV.MAX);
    expect(env.rainfall).toBe(ENV.MIN);
    expect(env.cover).toBe(38);
    expect(env.predation).toBe(ENV.MIN);
    expect(env.competition).toBe(ENV.MAX);
    expect(env.food).toEqual({ softPlants: 0, smallSeeds: 100, hardSeeds: 49, insects: 13 });
  });
});

describe('dependencies between variables', () => {
  it('lowers soft plants, small seeds, and insects when rainfall is held low', () => {
    const dry = regenerateFor(envWith({ rainfall: 25 }), 20, new Set(['rainfall']));
    expect(dry.food.softPlants).toBeLessThan(30);
    expect(dry.food.smallSeeds).toBeLessThan(30);
    expect(dry.food.insects).toBeLessThan(30);
  });

  it('never boosts hard seeds just because of a drought', () => {
    const dry = regenerateFor(envWith({ rainfall: 20 }), 30, new Set(['rainfall']));
    expect(dry.food.hardSeeds).toBe(NORMAL);
  });

  it('lowers insects in the cold', () => {
    const cold = regenerateFor(envWith({ temperature: 30 }), 20, new Set(['temperature']));
    expect(cold.food.insects).toBeLessThan(25);
  });

  it('lets a competitor reduce only the food it eats', () => {
    const competed = regenerateFor(envWith({ competition: 30, competitorDiet: 'smallSeeds' }), 30);
    expect(competed.food.smallSeeds).toBeLessThan(40);
    expect(competed.food.softPlants).toBe(NORMAL);
    expect(competed.food.hardSeeds).toBe(NORMAL);
    expect(competed.food.insects).toBe(NORMAL);
  });

  it('keeps cover lower while capacity is damaged', () => {
    const damaged = envWith({ capacity: { softPlants: 1, smallSeeds: 1, hardSeeds: 1, insects: 1, cover: 0.9 } });
    expect(Math.abs(regenerateFor(damaged, 40).cover - 45)).toBeLessThanOrEqual(1);
  });
});

describe('recovery and drift', () => {
  it('lets rainfall and temperature drift back to normal when no event holds them', () => {
    const env = regenerateFor(envWith({ rainfall: 25, temperature: 35 }), 60);
    expect(Math.abs(env.rainfall - NORMAL)).toBeLessThanOrEqual(1);
    expect(Math.abs(env.temperature - NORMAL)).toBeLessThanOrEqual(1);
  });

  it('leaves held variables alone', () => {
    const env = regenerateFor(envWith({ rainfall: 25 }), 10, new Set(['rainfall']));
    expect(env.rainfall).toBe(25);
  });

  it('lets food recover once rain returns (whole-number rounding does not stall it)', () => {
    const dry = regenerateFor(envWith({ rainfall: 20 }), 20, new Set(['rainfall']));
    const recovered = regenerateFor(dry, 80);
    expect(recovered.food.softPlants).toBeGreaterThanOrEqual(NORMAL - 1);
  });

  it('never makes predators or competitors fade on their own', () => {
    const env = regenerateFor(envWith({ predation: 65, competition: 20, competitorDiet: 'smallSeeds' }), 30);
    expect(env.predation).toBe(65);
    expect(env.competition).toBe(20);
  });
});

describe('diffEnvironment', () => {
  it('lists only the variables that changed', () => {
    const before = createBaselineEnvironment();
    const after = envWith({ rainfall: 40, food: { softPlants: 45 } });
    expect(diffEnvironment(before, after)).toEqual([
      { variable: 'rainfall', before: 50, after: 40 },
      { variable: 'softPlants', before: 50, after: 45 },
    ]);
  });
});
