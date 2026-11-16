import type { SpeciesData, SpeciesTraits } from "../types";
import type { StartingSpecies } from "./GameState";
import { TRAIT_OPTIONS } from "../simulation/traitContent";

/** Convert creation's named traits using the simulation's own option order. */
export function toStartingSpecies(name: string, traits: SpeciesTraits): StartingSpecies {
  return {
    name,
    traits: {
      beak: TRAIT_OPTIONS.beak.indexOf(traits.beakLength),
      body: TRAIT_OPTIONS.body.indexOf(traits.bodySize),
      feathers: TRAIT_OPTIONS.feathers.indexOf(traits.featherDensity),
      color: TRAIT_OPTIONS.color.indexOf(traits.color),
    },
  };
}

export class Species {
  constructor(
    public name: string,
    public traits: SpeciesTraits,
  ) {}

  toData(): SpeciesData {
    return {
      name: this.name,
      traits: { ...this.traits },
    };
  }
}
