import { createBaselineEnvironment } from '../../src/models/Environment';
import type { Bird, EnvironmentState, Population, Traits } from '../../src/types';

export const MEDIUM_BIRD: Traits = { beak: 1, body: 1, feathers: 1, color: 0 };

type EnvChanges = Partial<Omit<EnvironmentState, 'food'>> & { food?: Partial<EnvironmentState['food']> };

export function envWith(changes: EnvChanges = {}): EnvironmentState {
  const env = createBaselineEnvironment();
  const { food, ...rest } = changes;
  return { ...env, ...rest, food: { ...env.food, ...food } };
}

/** Food levels during a drought peak: rain-fed food is low, hard seeds hold steady. */
export function droughtEnv(): EnvironmentState {
  return envWith({ rainfall: 55, food: { softPlants: 49, smallSeeds: 55, hardSeeds: 100, insects: 55 } });
}

export function populationOf(traitsList: Traits[]): Population {
  const birds: Bird[] = traitsList.map((traits, id) => ({ id, traits: { ...traits } }));
  return { birds, generation: 0, nextId: birds.length };
}
