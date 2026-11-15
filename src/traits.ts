import { BIRD_COLORS, type BirdColor, type PreferredTraits, type SpeciesTraits, type TraitKey } from './types';

/** Keep a stable order for trait selectors and keyboard shortcuts. */
export const traitKeys: readonly TraitKey[] = ['beakLength', 'bodySize', 'featherDensity', 'color'];

/** Keep the option order and descriptions in one place for all three parts of the game. */
const COLOR_SWATCHES: Record<BirdColor, string> = {
  brown: '#9d6c47', gray: '#808080', yellow: '#e8c547', white: '#f2f0e8'
};

const COLOR_DESCRIPTIONS: Record<BirdColor, { advantage: string; disadvantage: string }> = {
  brown: {
    advantage: 'Blends into forest environments.',
    disadvantage: 'More visible against sandy backgrounds.',
  },
  gray: {
    advantage: 'Blends into scrub environments.',
    disadvantage: 'More visible in forests.',
  },
  yellow: {
    advantage: 'Provides some camouflage in sandy environments.',
    disadvantage: 'Highly visible in forests.',
  },
  white: {
    advantage: 'Blends into sandy environments.',
    disadvantage: 'Highly visible in forests.',
  },
};

interface TraitOption<Key extends TraitKey> {
  id: SpeciesTraits[Key];
  label: string;
  advantage: string;
  disadvantage: string;
  color?: string;
}

export const TRAITS: {
  [Key in TraitKey]: {
    label: string;
    options: readonly TraitOption<Key>[];
  };
} = {
  beakLength: {
    label: 'Beak length',
    options: [
      { id: 'short', label: 'Short', advantage: 'Good for handling some small seeds.', disadvantage: 'Cannot reach food in deep flowers.' },
      { id: 'medium', label: 'Medium', advantage: 'Can access a variety of foods.', disadvantage: 'Less specialized for certain foods.' },
      { id: 'long', label: 'Long', advantage: 'Can reach food inside deep flowers.', disadvantage: 'May struggle with some hard seeds.' },
    ],
  },
  bodySize: {
    label: 'Body size',
    options: [
      { id: 'small', label: 'Small', advantage: 'Requires less food to survive.', disadvantage: 'Vulnerable to some predators.' },
      { id: 'medium', label: 'Medium', advantage: 'Balances food needs and body strength.', disadvantage: 'Lacks some specialized advantages.' },
      { id: 'large', label: 'Large', advantage: 'Can resist some smaller predators.', disadvantage: 'Requires more food.' },
    ],
  },
  featherDensity: {
    label: 'Feather density',
    options: [
      { id: 'thin', label: 'Thin', advantage: 'Helps release heat in warm weather.', disadvantage: 'Provides less cold insulation.' },
      { id: 'medium', label: 'Medium', advantage: 'Provides moderate insulation.', disadvantage: 'Less effective in extreme temperatures.' },
      { id: 'thick', label: 'Thick', advantage: 'Provides better insulation in cold weather.', disadvantage: 'Can increase overheating risk.' },
    ],
  },
  color: {
    label: 'Color',
    options: BIRD_COLORS.map(id => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: COLOR_SWATCHES[id],
      ...COLOR_DESCRIPTIONS[id],
    }))
  }
};

/** Starting preferred traits for testing. The real game can get these from bird creation. */
export const DEFAULT_PREFERENCES: PreferredTraits = {
  beakLength: 'medium', bodySize: 'medium', featherDensity: 'medium', color: 'brown'
};

/** Find the readable label for a trait option. */
export function labelFor(key: TraitKey, id: string): string {
  return TRAITS[key].options.find(o => o.id === id)?.label ?? id;
}

/** Get the options one step to either side of the current value. */
export function adjacentTargets(key: TraitKey, from: string): string[] {
  const values: string[] = TRAITS[key].options.map(o => o.id);
  const index = values.indexOf(from);
  if (index < 0) return [];
  return [values[index - 1], values[index + 1]].filter((v): v is string => v !== undefined);
}

/** Return true only if the target is exactly one step away. */
export function isValidAdjacentChoice(key: TraitKey, from: string, target: string): boolean {
  return adjacentTargets(key, from).includes(target);
}
