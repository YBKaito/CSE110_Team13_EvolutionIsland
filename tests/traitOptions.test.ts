import { describe, expect, it } from 'vitest';
import { TRAIT_OPTIONS as CREATION_OPTIONS } from '../src/constants';
import { toStartingSpecies } from '../src/models/Species';
import {
  SIMULATION_TRAIT_FOR_CHOICE,
  TRAIT_NAMES,
  TRAIT_OPTIONS as SIMULATION_OPTIONS,
} from '../src/simulation/traitContent';
import { TRAITS, traitKeys } from '../src/traits';
import type { SpeciesTraits } from '../src/types';

describe('shared trait options', () => {
  it('keeps trait options in the same order across all parts of the game', () => {
    for (const key of traitKeys) {
      const optionIds = TRAITS[key].options.map(option => option.id);

      expect(CREATION_OPTIONS[key].map(option => option.value)).toEqual(optionIds);
      expect(SIMULATION_OPTIONS[SIMULATION_TRAIT_FOR_CHOICE[key]]).toEqual(optionIds);
    }

    expect(TRAIT_NAMES).toEqual(traitKeys.map(key => SIMULATION_TRAIT_FOR_CHOICE[key]));
  });

  it('uses the same option labels and descriptions on both choice screens', () => {
    for (const key of traitKeys) {
      expect(CREATION_OPTIONS[key]).toEqual(
        TRAITS[key].options.map(({ id, label, advantage, disadvantage }) => ({
          value: id,
          label,
          advantage,
          disadvantage,
        })),
      );

      for (const option of CREATION_OPTIONS[key]) {
        expect(option.advantage).not.toBe('');
        expect(option.disadvantage).not.toBe('');
      }
    }
  });

  it('converts chosen traits into the expected simulation indexes', () => {
    const chosenTraits: SpeciesTraits = {
      beakLength: 'long',
      bodySize: 'small',
      featherDensity: 'thick',
      color: 'yellow',
    };

    const species = toStartingSpecies('Finches', chosenTraits);

    expect(species.traits).toEqual({
      beak: 2,
      body: 0,
      feathers: 2,
      color: 2,
    });
  });
});
