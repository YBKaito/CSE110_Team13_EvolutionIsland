// Rules and data for the Extinction Prediction minigame
// The player picks island conditions and we run the REAL simulation on a pre-determined species

import { ENV } from '../../constants';
import { clampEnvironment, createBaselineEnvironment, resourceTargets } from '../../models/Environment';
import type { StartingSpecies } from '../../models/GameState';
import { riskProfile } from '../../simulation/Fitness';
import { RandomSource } from '../../simulation/Random';
import { runGeneration } from '../../simulation/SimulationEngine';
import { FOOD_TYPES, type Bird, type EnvironmentState, type FoodType, type Population, type Traits } from '../../types';

export const EXTINCTION = {
  //Flock size at Gen 1
  START_POP: 40,
  //Longest run we show; a flock still alive after this many generations "survived"
  MAX_GENERATIONS: 12,
  //Competition level (0-100) when a competing species arrives
  COMPETITOR_STRENGTH: 40,
  PREDATOR_STRENGTH: 90,
} as const;

//The species a round can start with. Each is badly matched to at least one island the player can build
export const SPECIES: readonly StartingSpecies[] = [
  { name: 'Lemon', traits: { beak: 0, body: 2, feathers: 2, color: 2 } },	// short beak, large body, thick feathers, yellow
  { name: 'Tweety', traits: { beak: 2, body: 2, feathers: 0, color: 1 } },	// long beak, large body, thin feathers, gray
  { name: 'Cloud', traits: { beak: 0, body: 0, feathers: 2, color: 3 } },	// short beak, small body, thick feathers, white
  { name: 'Woody', traits: { beak: 0, body: 1, feathers: 1, color: 0 } },	// short beak, medium body, medium feathers, brown
  { name: 'Snow', traits: { beak: 1, body: 2, feathers: 2, color: 3 } },	// medium beak, large body, thick feathers, white
];

/** Kept so existing code and tests that want "a species" still work. */
export const DEFAULT_SPECIES: StartingSpecies = SPECIES[0];

export function pickSpecies(seed: number, exclude?: string): StartingSpecies {
  return new RandomSource(seed).pick(SPECIES.filter((s) => s.name !== exclude));
}

export type ConditionKey = 'rainfall' | 'temperature' | 'arrival';

//The option index picked for each condition.
export type Scenario = Record<ConditionKey, number>;

export interface Choice {
  label: string;
  apply(env: EnvironmentState): void; //Sets this choice's island values on a baseline environment
}

export interface Condition {
  key: ConditionKey;
  title: string;
  choices: Choice[];
  normalIndex: number;	//The option that leaves the island unchanged.
}


const NORMAL = ENV.NORMAL; //The baseline environment value

const newcomer = (label: string, predation: number, diet: FoodType | null): Choice => ({
  label,
  apply: (env) => {
    env.predation = predation;
    env.competition = diet ? EXTINCTION.COMPETITOR_STRENGTH : 0;
    env.competitorDiet = diet;
  },
});

export const CONDITIONS: readonly Condition[] = [
  {
    key: 'rainfall',
    title: 'Rainfall',
    normalIndex: 1,
    choices: [
      { label: 'Heavy rain', apply: (env) => { env.rainfall = 80; } },
      { label: 'Normal', apply: (env) => { env.rainfall = NORMAL; } },
      { label: 'Drought', apply: (env) => { env.rainfall = 20; } },
    ],
  },
  {
    key: 'temperature',
    title: 'Temperature',
    normalIndex: 1,
    choices: [
      { label: 'Colder', apply: (env) => { env.temperature = 25; } },
      { label: 'Normal', apply: (env) => { env.temperature = NORMAL; } },
      { label: 'Hotter', apply: (env) => { env.temperature = 75; } },
    ],
  },
  {
    key: 'arrival',
    title: 'New arrival',
    normalIndex: 0,
    choices: [
      newcomer('Hawks', EXTINCTION.PREDATOR_STRENGTH, null),
      newcomer('Insect-eating warbler', NORMAL, 'insects'),
      newcomer('Seed-eating finch', NORMAL, 'smallSeeds'),
    ],
  },
];

export function conditionOf(key: ConditionKey): Condition {
  const condition = CONDITIONS.find((c) => c.key === key);
  if (!condition) throw new Error(`Unknown condition: ${key}`);
  return condition;
}

export const normalScenario = (): Scenario =>
  Object.fromEntries(CONDITIONS.map((c) => [c.key, c.normalIndex])) as Scenario;

export function allScenarios(): Scenario[] {
  let scenarios: Scenario[] = [normalScenario()];
  for (const condition of CONDITIONS) {
    scenarios = scenarios.flatMap((s) => condition.choices.map((_, i) => ({ ...s, [condition.key]: i })));
  }
  return scenarios;
}

//The island after changes
export function islandFor(scenario: Scenario): EnvironmentState {
  const env = createBaselineEnvironment();
  for (const condition of CONDITIONS) condition.choices[scenario[condition.key]].apply(env);
  const targets = resourceTargets(env);
  for (const food of FOOD_TYPES) env.food[food] = targets[food];
  env.cover = targets.cover;
  return clampEnvironment(env);
}

//A flock of identical birds, so the species' traits are the only thing in play
export function createFlock(traits: Traits, size: number = EXTINCTION.START_POP): Population {
  const birds: Bird[] = Array.from({ length: size }, (_, id) => ({ id, traits: { ...traits } }));
  return { birds, generation: 0, nextId: size };
}

//Chance one bird survives a generation here: it must pass the starvation, exposure and predation rolls in turn
export function survivalChance(traits: Traits, env: EnvironmentState): number {
  const risk = riskProfile(traits, env);
  return (1 - risk.starvation) * (1 - risk.exposure) * (1 - risk.predation);
}

export interface RunResult {
  populations: number[];	//Flock size in each generation
  extinctAt: number | null;	
}

export function runScenario(traits: Traits, scenario: Scenario, seed: number): RunResult {
  const env = islandFor(scenario);
  const rng = new RandomSource(seed);
  let flock = createFlock(traits);
  const populations = [flock.birds.length];

  while (flock.birds.length > 0 && populations.length < EXTINCTION.MAX_GENERATIONS) {
    flock = runGeneration(flock, env, rng).population;
    populations.push(flock.birds.length);
  }
  return { populations, extinctAt: flock.birds.length === 0 ? populations.length : null };
}


