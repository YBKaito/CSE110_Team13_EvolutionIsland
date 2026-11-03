// Island environment state and the shared rules that link its variables (US4).
// Events change primary conditions; these rules handle the knock-on effects on food and cover.
// Nothing here decides which birds survive; that's the simulation's job.
// Every island value is a whole number from 0 to 100, where 50 is normal (see ENV in constants.ts).

import { ENV } from '../constants';
import type { RandomSource } from '../simulation/Random';
import { FOOD_TYPES, type EnvChange, type EnvironmentState, type EnvVariable, type FoodType } from '../types';

export const ENV_VARIABLES: EnvVariable[] = [
  'temperature',
  'rainfall',
  'softPlants',
  'smallSeeds',
  'hardSeeds',
  'insects',
  'cover',
  'predation',
  'competition',
];

const { NORMAL } = ENV;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFood(variable: EnvVariable): variable is FoodType {
  return (FOOD_TYPES as string[]).includes(variable);
}

export function createBaselineEnvironment(): EnvironmentState {
  return {
    temperature: NORMAL,
    rainfall: NORMAL,
    food: { softPlants: NORMAL, smallSeeds: NORMAL, hardSeeds: NORMAL, insects: NORMAL },
    cover: NORMAL,
    predation: NORMAL,
    competition: 0,
    competitorDiet: null,
    background: 'forest',
    capacity: { softPlants: 1, smallSeeds: 1, hardSeeds: 1, insects: 1, cover: 1 },
  };
}

export function cloneEnvironment(env: EnvironmentState): EnvironmentState {
  return { ...env, food: { ...env.food }, capacity: { ...env.capacity } };
}

export function getValue(env: EnvironmentState, variable: EnvVariable): number {
  return isFood(variable) ? env.food[variable] : env[variable];
}

export function setValue(env: EnvironmentState, variable: EnvVariable, value: number): void {
  if (isFood(variable)) env.food[variable] = value;
  else env[variable] = value;
}

/** Where each food and cover would settle under the current rainfall, temperature, competition, and capacity. */
export function resourceTargets(env: EnvironmentState): Record<FoodType | 'cover', number> {
  const rain = env.rainfall / NORMAL;
  const warmth = clamp(1 - Math.max(0, NORMAL - env.temperature) / (0.4 * NORMAL), 0.2, 1.2);
  const eaten = (food: FoodType) => (env.competitorDiet === food ? 1 - env.competition / ENV.MAX : 1);
  return {
    softPlants: NORMAL * Math.pow(rain, 1.2) * env.capacity.softPlants * eaten('softPlants'),
    smallSeeds: NORMAL * rain * env.capacity.smallSeeds * eaten('smallSeeds'),
    // Hard seeds tolerate drought; they only become *relatively* more common when other food dries up.
    hardSeeds: NORMAL * env.capacity.hardSeeds * eaten('hardSeeds'),
    insects: NORMAL * warmth * rain * env.capacity.insects * eaten('insects'),
    cover: NORMAL * (0.6 + 0.4 * rain) * env.capacity.cover,
  };
}

/**
 * One generation of natural change. Rainfall and temperature drift back toward normal;
 * food and cover move toward the levels the current conditions support.
 * Variables in `held` are left alone because an event is controlling them this generation.
 * Predation and competition never drift: once a predator or competitor arrives, it stays.
 * Changes are rounded randomly so values stay whole numbers but still recover gradually.
 */
export function regenerate(env: EnvironmentState, rng: RandomSource, held: ReadonlySet<EnvVariable> = new Set()): EnvironmentState {
  const next = cloneEnvironment(env);
  for (const primary of ['rainfall', 'temperature'] as const) {
    if (!held.has(primary)) next[primary] += rng.roundRandomly((NORMAL - next[primary]) * ENV.PRIMARY_DRIFT);
  }
  const targets = resourceTargets(next);
  for (const food of FOOD_TYPES) {
    if (!held.has(food)) next.food[food] += rng.roundRandomly((targets[food] - next.food[food]) * ENV.REGEN_RATE);
  }
  if (!held.has('cover')) next.cover += rng.roundRandomly((targets.cover - next.cover) * ENV.REGEN_RATE);
  return clampEnvironment(next);
}

/** Keeps every island value a whole number between ENV.MIN and ENV.MAX. */
export function clampEnvironment(env: EnvironmentState): EnvironmentState {
  const next = cloneEnvironment(env);
  for (const variable of ENV_VARIABLES) {
    setValue(next, variable, clamp(Math.round(getValue(next, variable)), ENV.MIN, ENV.MAX));
  }
  for (const key of Object.keys(next.capacity) as (keyof EnvironmentState['capacity'])[]) {
    next.capacity[key] = clamp(next.capacity[key], 0, 1.5);
  }
  return next;
}

/** Variables that changed, for event cards and island-change tables. */
export function diffEnvironment(before: EnvironmentState, after: EnvironmentState, minChange = 1): EnvChange[] {
  const changes: EnvChange[] = [];
  for (const variable of ENV_VARIABLES) {
    const a = getValue(before, variable);
    const b = getValue(after, variable);
    if (Math.abs(b - a) >= minChange) changes.push({ variable, before: a, after: b });
  }
  return changes;
}
