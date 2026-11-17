import type { GameState } from '../models/GameState';
import { countTraits } from '../simulation/Population';
import { SIMULATION_TRAIT_FOR_CHOICE, TRAIT_OPTIONS } from '../simulation/traitContent';
import type {
  Background, EnvironmentState, EnvironmentStateMock, GenerationCompleted,
  PreferredTraits, RGB, TraitCounts, TraitKey, TraitName,
} from '../types';
import type { StepOutcome } from './GameController';

/** The simulation stores a background name; US5 currently displays an RGB swatch. */
const BACKGROUND_COLORS: Record<Background, RGB> = {
  forest: [44, 88, 55],
  scrub: [139, 128, 86],
  sand: [216, 191, 139],
};

/** Convert US4's nested food and habitat data into the fields US5 already displays. */
export function toEvolutionEnvironment(env: EnvironmentState): EnvironmentStateMock {
  return {
    temperature: env.temperature,
    rainfall: env.rainfall,
    softPlants: env.food.softPlants,
    smallSeeds: env.food.smallSeeds,
    hardSeeds: env.food.hardSeeds,
    insects: env.food.insects,
    predationPressure: env.predation,
    habitatCover: env.cover,
    competition: env.competition,
    habitatBackground: [...BACKGROUND_COLORS[env.background]] as [number, number, number],
  };
}

/** US3 counts option indexes; US5 needs each option's name and count. */
export function toEvolutionTraitCounts(counts: Record<TraitName, number[]>): TraitCounts {
  const converted = {} as TraitCounts;
  for (const key of Object.keys(SIMULATION_TRAIT_FOR_CHOICE) as TraitKey[]) {
    const trait = SIMULATION_TRAIT_FOR_CHOICE[key];
    converted[key] = Object.fromEntries(
      TRAIT_OPTIONS[trait].map((option, i) => [option, counts[trait][i]]),
    );
  }
  return converted;
}

/** Convert the outcome of one completed generation into a US5 notification. */
export function toEvolutionGeneration(outcome: StepOutcome): GenerationCompleted {
  const result = outcome.result;
  const difference = result.population - result.startPopulation;
  return {
    generation: result.generation,
    results: {
      eventList: outcome.events.map(event => event.message),
      populationIncrease: Math.max(0, difference),
      populationDecline: Math.max(0, -difference),
      newPopulation: result.population,
    },
    traitCounts: toEvolutionTraitCounts(result.traitCounts),
  };
}

/** Start US5 with the species the player actually created, including saved preferences. */
export function toEvolutionPreferences(state: Readonly<GameState>): PreferredTraits {
  const preferences = {} as PreferredTraits;
  for (const key of Object.keys(SIMULATION_TRAIT_FOR_CHOICE) as TraitKey[]) {
    const trait = SIMULATION_TRAIT_FOR_CHOICE[key];
    const optionIndex = state.favoredTraits[trait] ?? state.species.traits[trait];
    preferences[key] = TRAIT_OPTIONS[trait][optionIndex];
  }
  return preferences;
}

/** Initial values for a new run. Saved runs need their earlier checkpoint history restored first. */
export function toEvolutionInitialData(state: Readonly<GameState>) {
  if (state.generation !== 0) {
    throw new Error('Evolution screen initialization needs generation 0 of a new run.');
  }
  return {
    startingPopulation: state.population.birds.length,
    initialCounts: toEvolutionTraitCounts(countTraits(state.population.birds)),
    initialEnvironment: toEvolutionEnvironment(state.environment),
    preferences: toEvolutionPreferences(state),
  };
}
