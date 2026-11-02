// Trait-dependent fitness. Pure functions: bird traits + environment in, probabilities out.
// Three separate components (feeding, thermal, predation) so each death has an explainable cause.

import { SIM } from '../constants';
import { FOOD_TYPES, type EnvironmentState, type Traits } from '../types';
import {
  BEAK_FOOD_EFFICIENCY,
  BODY_FOOD_NEED,
  BODY_HEAT_RETENTION,
  BODY_PREDATOR_VULNERABILITY,
  COLOR_DETECTABILITY,
  FEATHER_INSULATION,
} from './traitContent';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * How well a bird can feed, relative to normal (1.0 = normal).
 * Equals 1.0 for every beak when all food is at baseline, so no beak is best everywhere.
 */
export function feedingFitness(traits: Traits, env: EnvironmentState): number {
  const efficiency = BEAK_FOOD_EFFICIENCY[traits.beak];
  let eaten = 0;
  let normal = 0;
  for (const food of FOOD_TYPES) {
    eaten += efficiency[food] * env.food[food];
    normal += efficiency[food] * 100;
  }
  return eaten / normal / BODY_FOOD_NEED[traits.body];
}

export function starvationRisk(traits: Traits, env: EnvironmentState): number {
  const feeding = feedingFitness(traits, env);
  return clamp(SIM.STARVE_BASE + SIM.STARVE_SLOPE * (1 - feeding), SIM.STARVE_MIN, SIM.STARVE_MAX);
}

/** Insulation that suits the current temperature: positive when cold, negative when hot. */
export function idealInsulation(env: EnvironmentState): number {
  return clamp((100 - env.temperature) / SIM.TEMP_PER_INSULATION, -SIM.IDEAL_INSULATION_MAX, SIM.IDEAL_INSULATION_MAX);
}

export function exposureRisk(traits: Traits, env: EnvironmentState): number {
  const insulation = FEATHER_INSULATION[traits.feathers] + BODY_HEAT_RETENTION[traits.body];
  return clamp(SIM.EXPOSURE_SLOPE * Math.abs(insulation - idealInsulation(env)), 0, SIM.EXPOSURE_MAX);
}

export function predationRisk(traits: Traits, env: EnvironmentState): number {
  const detect = COLOR_DETECTABILITY[env.background][traits.color];
  const exposure = 1 - SIM.COVER_SHIELD * (Math.min(env.cover, 100) / 100);
  const vulnerability = BODY_PREDATOR_VULNERABILITY[traits.body];
  return clamp(SIM.PRED_BASE * (env.predation / 100) * detect * exposure * vulnerability, 0, SIM.PRED_MAX);
}

/** Scales hatching success: well-fed parents raise more chicks. */
export function reproductiveFitness(traits: Traits, env: EnvironmentState): number {
  return clamp(SIM.REP_BASE + SIM.REP_SLOPE * feedingFitness(traits, env), SIM.REP_FIT_MIN, SIM.REP_FIT_MAX);
}

export interface RiskProfile {
  starvation: number;
  exposure: number;
  predation: number;
}

/** All three risks for one bird; useful for hints and "why did they die" explanations. */
export function riskProfile(traits: Traits, env: EnvironmentState): RiskProfile {
  return {
    starvation: starvationRisk(traits, env),
    exposure: exposureRisk(traits, env),
    predation: predationRisk(traits, env),
  };
}
