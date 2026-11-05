// Trait options and how each option interacts with the environment.
// This is the single source of truth for trait effects: fitness, hints, and feedback should all read from here.
// Option lists are provisional until US2 (species creation) confirms them.

import { BIRD_COLORS, type Background, type FoodType, type TraitName } from '../types';

export const TRAIT_OPTIONS: Record<TraitName, readonly string[]> = {
  beak: ['short', 'medium', 'long'],
  body: ['small', 'medium', 'large'],
  feathers: ['thin', 'medium', 'thick'],
  color: BIRD_COLORS,
};

export const TRAIT_NAMES: TraitName[] = ['beak', 'body', 'feathers', 'color'];

/** Traits whose options are ordered, so a mutation moves one step. Color mutates to any other option. */
export const ORDINAL_TRAITS: ReadonlySet<TraitName> = new Set(['beak', 'body', 'feathers']);

/**
 * How efficiently each beak length eats each food (0-1).
 * Short: small seeds and insects. Long: deep flowers/fruit and hard seeds. Medium: generalist.
 */
export const BEAK_FOOD_EFFICIENCY: readonly Record<FoodType, number>[] = [
  { softPlants: 0.4, smallSeeds: 1.0, hardSeeds: 0.1, insects: 1.0 }, // short
  { softPlants: 0.7, smallSeeds: 0.7, hardSeeds: 0.6, insects: 0.7 }, // medium
  { softPlants: 1.0, smallSeeds: 0.3, hardSeeds: 1.0, insects: 0.3 }, // long
];

/** Indexed by body option: small, medium, large. */
export const BODY_FOOD_NEED = [0.85, 1.0, 1.15];
export const BODY_HEAT_RETENTION = [-0.5, 0, 0.5];
export const BODY_PREDATOR_VULNERABILITY = [0.9, 1.0, 1.15];

/** Indexed by feather option: thin, medium, thick. */
export const FEATHER_INSULATION = [-1, 0, 1];

/** How easy each color is for a predator to spot against each background (higher = easier). */
export const COLOR_DETECTABILITY: Record<Background, readonly number[]> = {
  //       brown gray yellow white
  forest: [0.6, 0.9, 1.3, 1.4],
  scrub: [0.8, 0.7, 1.1, 1.2],
  sand: [1.1, 0.9, 0.8, 0.7],
};
