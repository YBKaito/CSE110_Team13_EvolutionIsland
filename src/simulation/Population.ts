// Creating the starting flock and counting traits.

import { SIM } from '../constants';
import type { Bird, Population, TraitName, Traits } from '../types';
import type { RandomSource } from './Random';
import { TRAIT_NAMES, TRAIT_OPTIONS } from './traitContent';

/** A random option index for the trait, different from `exclude`. */
export function randomOtherOption(trait: TraitName, exclude: number, rng: RandomSource): number {
  const others = TRAIT_OPTIONS[trait].map((_, i) => i).filter((i) => i !== exclude);
  return rng.pick(others);
}

/**
 * The starting flock. Each trait matches the player's pick with probability START_MATCH,
 * otherwise it's a random other option, so natural selection has variation to act on.
 */
export function createStartingPopulation(
  speciesTraits: Traits,
  rng: RandomSource,
  size: number = SIM.START_POP,
): Population {
  const birds: Bird[] = [];
  for (let id = 0; id < size; id++) {
    const traits = {} as Traits;
    for (const trait of TRAIT_NAMES) {
      const picked = speciesTraits[trait];
      traits[trait] = rng.chance(SIM.START_MATCH) ? picked : randomOtherOption(trait, picked, rng);
    }
    birds.push({ id, traits });
  }
  return { birds, generation: 0, nextId: size };
}

/** Number of birds with each option index, per trait. */
export function countTraits(birds: readonly Bird[]): Record<TraitName, number[]> {
  const counts = {} as Record<TraitName, number[]>;
  for (const trait of TRAIT_NAMES) {
    counts[trait] = new Array(TRAIT_OPTIONS[trait].length).fill(0);
  }
  for (const bird of birds) {
    for (const trait of TRAIT_NAMES) {
      counts[trait][bird.traits[trait]]++;
    }
  }
  return counts;
}
