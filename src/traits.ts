import { BIRD_COLORS, type BirdColor, type PreferredTraits, type TraitKey, type TraitName } from './types';
import { SIMULATION_TRAIT_FOR_CHOICE } from './simulation/traitContent';

/** Keep a stable order for trait selectors and keyboard shortcuts. */
export const traitKeys: readonly TraitKey[] = ['beakLength', 'bodySize', 'featherDensity', 'color'];

function traitKeyForSimulation(trait: TraitName): TraitKey | undefined {
  return traitKeys.find(key => SIMULATION_TRAIT_FOR_CHOICE[key] === trait);
}

/** Return the existing UI wording for a simulation's internal trait key. */
export function simulationTraitLabel(trait: TraitName, style: 'label' | 'shortLabel' = 'label'): string {
  const key = traitKeyForSimulation(trait);
  return key ? TRAITS[key][style] : trait;
}

/**
 * Trait options shown to the player, in neighboring order.
 */
const COLOR_SWATCHES: Record<BirdColor, string> = {
  brown: '#9d6c47', gray: '#808080', yellow: '#e8c547', white: '#f2f0e8'
};

export const TRAITS: {
  [Key in TraitKey]: {
    label: string;
    creationLabel: string;
    shortLabel: string;
    options: readonly { id: Key extends 'color' ? BirdColor : string; label: string; color?: string }[];
  };
} = {
  beakLength: {
    label: 'Beak length',
    creationLabel: 'Beak Length',
    shortLabel: 'Beak',
    options: [{ id: 'short', label: 'Short' }, { id: 'medium', label: 'Medium' }, { id: 'long', label: 'Long' }]
  },
  bodySize: {
    label: 'Body size',
    creationLabel: 'Body Size',
    shortLabel: 'Body',
    options: [{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]
  },
  featherDensity: {
    label: 'Feather density',
    creationLabel: 'Feather Density',
    shortLabel: 'Feathers',
    options: [{ id: 'thin', label: 'Thin' }, { id: 'medium', label: 'Medium' }, { id: 'thick', label: 'Thick' }]
  },
  color: {
    label: 'Color',
    creationLabel: 'Color',
    shortLabel: 'Color',
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
