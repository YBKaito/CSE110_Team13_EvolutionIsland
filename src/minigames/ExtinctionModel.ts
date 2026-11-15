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
  //Competition level (0-100) that a new arrival brings
  COMPETITOR_STRENGTH: 40,
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

export type ConditionKey = 'rainfall' | 'temperature' | 'predators' | 'arrival';

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

const newArrival = (label: string, diet: FoodType | null): Choice => ({
  label,
  apply: (env) => {
    env.competition = diet ? EXTINCTION.COMPETITOR_STRENGTH : 0;
    env.competitorDiet = diet;
  },
});


