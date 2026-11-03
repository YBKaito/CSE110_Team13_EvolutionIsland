import type {
  EnvironmentState, GenerationResults, NumericEnvironmentKey, TraitCounts, TraitKey
} from './types';

/** The numeric environment fields we can compare and validate. */
export const NUMERIC_ENV_KEYS: readonly NumericEnvironmentKey[] = [
  'temperature', 'rainfall', 'softPlants', 'smallSeeds', 'hardSeeds',
  'insects', 'predationPressure', 'habitatCover', 'competition'
];

/** Readable names for the environment fields shown in the UI. */
export const ENV_LABELS: Record<NumericEnvironmentKey, string> = {
  temperature: 'Temperature', rainfall: 'Rainfall', softPlants: 'Soft plants / fruit',
  smallSeeds: 'Small seeds', hardSeeds: 'Hard seeds', insects: 'Insects',
  predationPressure: 'Predation pressure', habitatCover: 'Habitat cover', competition: 'Competition'
};

/** Round a value and keep it between 0 and 100. */
export function clampIndex(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Compare two environment values. A 0 starting value has no relative percentage. */
export function environmentDelta(current: number, previous: number): {
  points: number; relativePercent: number | null;
} {
  const points = current - previous;
  // Do not divide by zero. For the starting value 0, show point change instead.
  return { points, relativePercent: previous === 0 ? null : (points / Math.abs(previous)) * 100 };
}

/** Display positive numbers with a plus sign. */
export function signed(value: number, digits = 0): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

/** Find the net population change from the generation results. */
export function netDelta(results: GenerationResults): number {
  return results.populationIncrease - results.populationDecline;
}

/** Make sure every trait distribution adds up to the flock population. */
export function validateTraitCounts(counts: TraitCounts, population: number): void {
  const keys: TraitKey[] = ['beakLength', 'bodySize', 'featherDensity', 'color'];
  for (const key of keys) {
    const sum = Object.values(counts[key]).reduce((a, b) => a + b, 0);
    if (sum !== population) throw new Error(`${key}: trait counts ${sum} != population ${population}`);
    if (Object.values(counts[key]).some(v => v < 0 || !Number.isInteger(v))) {
      throw new Error(`${key}: counts must be nonnegative integers`);
    }
  }
}

/** Copy the environment, including the RGB array, to protect saved history. */
export function copyEnvironment(state: EnvironmentState): EnvironmentState {
  return { ...state, habitatBackground: [...state.habitatBackground] as [number, number, number] };
}

/** Copy each trait's counts so other code cannot edit the saved snapshot. */
export function copyTraitCounts(counts: TraitCounts): TraitCounts {
  return {
    beakLength: { ...counts.beakLength }, bodySize: { ...counts.bodySize },
    featherDensity: { ...counts.featherDensity }, color: { ...counts.color }
  };
}

/** Check that environment indices are 0-100 integers and RGB values are valid. */
export function validateEnvironmentState(state: EnvironmentState): void {
  for (const key of NUMERIC_ENV_KEYS) {
    const value = state[key];
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new Error(`${key} must be an integer from 0 to 100`);
    }
  }
  if (state.habitatBackground.length !== 3 ||
      state.habitatBackground.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error('Habitat background must be RGB integers from 0 to 255');
  }
}
