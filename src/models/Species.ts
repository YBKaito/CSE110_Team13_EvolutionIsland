import type { SpeciesData, SpeciesTraits } from "../types";

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
