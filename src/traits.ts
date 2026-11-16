import { BIRD_COLORS, type BirdColor, type PreferredTraits, type TraitKey } from './types';

/** Keep a stable order for trait selectors and keyboard shortcuts. */
export const traitKeys: readonly TraitKey[] = ['beakLength', 'bodySize', 'featherDensity', 'color'];

/**
 * Trait options shown to the player, in neighboring order.
 */
const COLOR_SWATCHES: Record<BirdColor, string> = {
  brown: '#9d6c47', gray: '#808080', yellow: '#e8c547', white: '#f2f0e8'
};

export const TRAITS: {
  [Key in TraitKey]: {
    label: string;
    options: readonly { id: Key extends 'color' ? BirdColor : string; label: string; color?: string }[];
  };
} = {
  beakLength: {
    label: 'Beak length',
    options: [{ id: 'short', label: 'Short' }, { id: 'medium', label: 'Medium' }, { id: 'long', label: 'Long' }]
  },
  bodySize: {
    label: 'Body size',
    options: [{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]
  },
  featherDensity: {
    label: 'Feather density',
    options: [{ id: 'thin', label: 'Thin' }, { id: 'medium', label: 'Medium' }, { id: 'thick', label: 'Thick' }]
  },
  color: {
    label: 'Color',
    options: BIRD_COLORS.map(id => ({
      id, label: id.charAt(0).toUpperCase() + id.slice(1), color: COLOR_SWATCHES[id]
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
  const values = TRAITS[key].options.map(o => o.id);
  const index = values.indexOf(from);
  if (index < 0) return [];
  return [values[index - 1], values[index + 1]].filter((v): v is string => v !== undefined);
}

/** Return true only if the target is exactly one step away. */
export function isValidAdjacentChoice(key: TraitKey, from: string, target: string): boolean {
  return adjacentTargets(key, from).includes(target);
}
