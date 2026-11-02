import type { PreferredTraits, TraitKey } from './types';

export const traitKeys: readonly TraitKey[] = ['beakLength', 'bodySize', 'featherDensity', 'color'];

/** Proposed fixed options until US2/US3 finalize their IDs and color palette. */
export const TRAITS: Record<TraitKey, {
  label: string;
  options: readonly { id: string; label: string; color?: string }[];
}> = {
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
    options: [
      { id: 'tan', label: 'Light tan', color: '#d4b98c' },
      { id: 'brown', label: 'Brown', color: '#9d6c47' },
      { id: 'dark-brown', label: 'Dark brown', color: '#4f352c' }
    ]
  }
};

export const DEFAULT_PREFERENCES: PreferredTraits = {
  beakLength: 'medium', bodySize: 'medium', featherDensity: 'medium', color: 'brown'
};

export function labelFor(key: TraitKey, id: string): string {
  return TRAITS[key].options.find(o => o.id === id)?.label ?? id;
}

export function adjacentTargets(key: TraitKey, from: string): string[] {
  const values = TRAITS[key].options.map(o => o.id);
  const index = values.indexOf(from);
  if (index < 0) return [];
  return [values[index - 1], values[index + 1]].filter((v): v is string => v !== undefined);
}

export function isValidAdjacentChoice(key: TraitKey, from: string, target: string): boolean {
  return adjacentTargets(key, from).includes(target);
}
