// Island environment state and the shared rules that link its variables (US4).
// Events change primary conditions; these rules handle the knock-on effects on food and cover.
// Nothing here decides which birds survive; that's the simulation's job.

import { ENV } from '../constants';
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFood(variable: EnvVariable): variable is FoodType {
  return (FOOD_TYPES as string[]).includes(variable);
}

export function createBaselineEnvironment(): EnvironmentState {
  return {
    temperature: ENV.BASELINE,
    rainfall: ENV.BASELINE,
    food: { softPlants: 100, smallSeeds: 100, hardSeeds: 100, insects: 100 },
    cover: 100,
    predation: 100,
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
  const rain = env.rainfall / 100;
  const warmth = clamp(1 - Math.max(0, 100 - env.temperature) / 40, 0.2, 1.2);
  const eaten = (food: FoodType) => (env.competitorDiet === food ? 1 - env.competition / 200 : 1);
  return {
    softPlants: 100 * Math.pow(rain, 1.2) * env.capacity.softPlants * eaten('softPlants'),
    smallSeeds: 100 * rain * env.capacity.smallSeeds * eaten('smallSeeds'),
    // Hard seeds tolerate drought; they only become *relatively* more common when other food dries up.
    hardSeeds: 100 * env.capacity.hardSeeds * eaten('hardSeeds'),
    insects: 100 * warmth * rain * env.capacity.insects * eaten('insects'),
    cover: 100 * (0.6 + 0.4 * rain) * env.capacity.cover,
  };
}

/**
 * One generation of natural change. Rainfall and temperature drift back toward baseline;
 * food and cover move toward the levels the current conditions support.
 * Variables in `held` are left alone because an event is controlling them this generation.
 * Predation and competition never drift: once a predator or competitor arrives, it stays.
 */
export function regenerate(env: EnvironmentState, held: ReadonlySet<EnvVariable> = new Set()): EnvironmentState {
  const next = cloneEnvironment(env);
  for (const primary of ['rainfall', 'temperature'] as const) {
    if (!held.has(primary)) next[primary] += (ENV.BASELINE - next[primary]) * ENV.PRIMARY_DRIFT;
  }
  const targets = resourceTargets(next);
  for (const food of FOOD_TYPES) {
    if (!held.has(food)) next.food[food] += (targets[food] - next.food[food]) * ENV.REGEN_RATE;
  }
  if (!held.has('cover')) next.cover += (targets.cover - next.cover) * ENV.REGEN_RATE;
  return clampEnvironment(next);
}

export function clampEnvironment(env: EnvironmentState): EnvironmentState {
  const next = cloneEnvironment(env);
  const b = ENV.BOUNDS;
  next.temperature = clamp(next.temperature, b.temperature[0], b.temperature[1]);
  next.rainfall = clamp(next.rainfall, b.rainfall[0], b.rainfall[1]);
  next.cover = clamp(next.cover, b.cover[0], b.cover[1]);
  next.predation = clamp(next.predation, b.predation[0], b.predation[1]);
  next.competition = clamp(next.competition, b.competition[0], b.competition[1]);
  for (const food of FOOD_TYPES) next.food[food] = clamp(next.food[food], b.food[0], b.food[1]);
  for (const key of Object.keys(next.capacity) as (keyof EnvironmentState['capacity'])[]) {
    next.capacity[key] = clamp(next.capacity[key], 0, 1.5);
  }
  return next;
}

/** Variables that changed by at least `minChange` points, for event cards and island-change tables. */
export function diffEnvironment(before: EnvironmentState, after: EnvironmentState, minChange = 0.5): EnvChange[] {
  const changes: EnvChange[] = [];
  for (const variable of ENV_VARIABLES) {
    const a = getValue(before, variable);
    const b = getValue(after, variable);
    if (Math.abs(b - a) >= minChange) changes.push({ variable, before: a, after: b });
  }
  return changes;
}
