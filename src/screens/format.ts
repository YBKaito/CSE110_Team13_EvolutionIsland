// Turning simulation numbers into words a 12-year-old can read, and parsing typed menu choices.

import type { DeathCause, EnvVariable } from '../types';

/** Returns the chosen option (1..count) or null if the input isn't one of them. */
export function parseChoice(input: string, count: number): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 1 && value <= count ? value : null;
}

/** "Invalid. Type 1, 2, or 3." in the mockup's wording. */
export function invalidChoiceMessage(count: number): string {
  if (count === 2) return 'Invalid. Type 1 or 2.';
  const options = Array.from({ length: count }, (_, i) => String(i + 1));
  return `Invalid. Type ${options.slice(0, -1).join(', ')}, or ${options[count - 1]}.`;
}

// Island values run 0-100 with 50 as normal.

/** Food, rainfall, and cover levels. */
export function amountLabel(value: number): string {
  if (value < 30) return 'Scarce';
  if (value < 43) return 'Low';
  if (value <= 57) return 'Normal';
  return 'High';
}

export function temperatureLabel(value: number): string {
  if (value < 38) return 'Very cold';
  if (value < 45) return 'Cold';
  if (value <= 55) return 'Normal';
  if (value <= 62) return 'Warm';
  return 'Hot';
}

export function predatorLabel(value: number): string {
  if (value < 40) return 'Low';
  if (value <= 57) return 'Moderate';
  return 'High';
}

/** Competition starts at 0 (no competing species). */
export function competitionLabel(value: number): string {
  if (value < 1) return 'None';
  if (value < 10) return 'Low';
  if (value < 25) return 'Moderate';
  return 'High';
}

export const ENV_LABELS: Record<EnvVariable, string> = {
  temperature: 'Temperature',
  rainfall: 'Rainfall',
  softPlants: 'Soft plants',
  smallSeeds: 'Small seeds',
  hardSeeds: 'Hard seeds',
  insects: 'Insects',
  cover: 'Trees and bushes',
  predation: 'Predators',
  competition: 'Competing birds',
};

export const DEATH_LABELS: Record<DeathCause, string> = {
  starvation: 'Starvation',
  exposure: 'Cold or heat',
  predation: 'Predators',
  disaster: 'Storm',
};

export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
