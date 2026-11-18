// US10 Hatching Rhythm: turns timing accuracy into a hatch rate and an offspring count.
// Each bar in the song is one egg, so a 20-bar song is a clutch of 20 eggs.

import { clamp } from '../../simulation/Fitness';
import { accuracy, type Tally } from './timingJudge';

/** Birth multiplier range handed to the simulation (SimulationEngine's birthMultiplier option). */
export const MIN_BIRTH_MULTIPLIER = 0.5;
export const MAX_BIRTH_MULTIPLIER = 1.5;

export interface HatchResult {
  /** 0 to 1. Equal to the song's timing accuracy. */
  hatchRate: number;
  /** Eggs in the clutch (one per bar). */
  eggs: number;
  /** Eggs that hatched: the offspring count. */
  hatched: number;
  /** How much this result scales hatching in a generation (0.5 at 0% up to 1.5 at 100%). */
  birthMultiplier: number;
}

/** The hatch rate matches the timing accuracy exactly. */
export function hatchRate(tally: Tally): number {
  return accuracy(tally);
}

/** How many of `eggs` hatch at this rate (rounded to a whole chick). */
export function offspringCount(rate: number, eggs: number): number {
  return Math.round(clamp(rate, 0, 1) * Math.max(0, eggs));
}

export function birthMultiplierForHatchRate(rate: number): number {
  return MIN_BIRTH_MULTIPLIER + (MAX_BIRTH_MULTIPLIER - MIN_BIRTH_MULTIPLIER) * clamp(rate, 0, 1);
}

export function hatchResult(tally: Tally, eggs: number): HatchResult {
  const rate = hatchRate(tally);
  return {
    hatchRate: rate,
    eggs,
    hatched: offspringCount(rate, eggs),
    birthMultiplier: birthMultiplierForHatchRate(rate),
  };
}
