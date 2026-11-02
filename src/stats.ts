import type {
  EnvironmentState, GenerationResults, NumericEnvironmentKey, TraitCounts, TraitKey
} from './types';

export const NUMERIC_ENV_KEYS: readonly NumericEnvironmentKey[] = [
  'temperature', 'rainfall', 'softPlants', 'smallSeeds', 'hardSeeds',
  'insects', 'predationPressure', 'habitatCover', 'competition'
];

export const ENV_LABELS: Record<NumericEnvironmentKey, string> = {
  temperature: 'Temperature', rainfall: 'Rainfall', softPlants: 'Soft plants / fruit',
  smallSeeds: 'Small seeds', hardSeeds: 'Hard seeds', insects: 'Insects',
  predationPressure: 'Predation pressure', habitatCover: 'Habitat cover', competition: 'Competition'
};

export function clampIndex(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function environmentDelta(current: number, previous: number): {
  points: number; relativePercent: number | null;
} {
  const points = current - previous;
  return { points, relativePercent: previous === 0 ? null : (points / Math.abs(previous)) * 100 };
}

export function signed(value: number, digits = 0): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

export function netDelta(results: GenerationResults): number {
  return results.populationIncrease - results.populationDecline;
}

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

export function copyEnvironment(state: EnvironmentState): EnvironmentState {
  return { ...state, habitatBackground: [...state.habitatBackground] as [number, number, number] };
}

export function copyTraitCounts(counts: TraitCounts): TraitCounts {
  return {
    beakLength: { ...counts.beakLength }, bodySize: { ...counts.bodySize },
    featherDensity: { ...counts.featherDensity }, color: { ...counts.color }
  };
}

/** Validate the agreed 0..100 integer indices and 8-bit RGB habitat color. */
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
