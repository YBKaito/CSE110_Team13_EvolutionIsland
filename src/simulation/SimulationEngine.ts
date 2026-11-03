// One generation of the flock: disaster -> survival -> reproduction with inheritance.
// Generations do not overlap: the surviving adults' chicks replace the whole flock.

import { SIM } from '../constants';
import {
  DEATH_CAUSES,
  type Bird,
  type DeathCause,
  type EnvironmentState,
  type GenerationResult,
  type Population,
  type Traits,
} from '../types';
import { clamp, exposureRisk, predationRisk, reproductiveFitness, starvationRisk } from './Fitness';
import { countTraits, randomOtherOption } from './Population';
import type { RandomSource } from './Random';
import { ORDINAL_TRAITS, TRAIT_NAMES, TRAIT_OPTIONS } from './traitContent';

export interface GenerationOptions {
  /** Scales hatching success; hook for the Hatching Rhythm minigame (US10). */
  birthMultiplier?: number;
  /** Fraction of adults killed at random by a disaster this generation (trait-independent). */
  disasterFraction?: number;
  mutationRate?: number;
}

export interface SurvivalOutcome {
  survivors: Bird[];
  deathsByCause: Record<DeathCause, number>;
  avgRisk: { starvation: number; exposure: number; predation: number };
}

function emptyDeaths(): Record<DeathCause, number> {
  return Object.fromEntries(DEATH_CAUSES.map((c) => [c, 0])) as Record<DeathCause, number>;
}

/**
 * Removes a random, trait-independent share of the flock (e.g. a hurricane).
 * Kept separate from natural selection so students can tell luck apart from fitness.
 */
export function applyDisaster(birds: readonly Bird[], fraction: number, rng: RandomSource): { remaining: Bird[]; killed: number } {
  const killed = Math.min(birds.length, Math.round(clamp(fraction, 0, 1) * birds.length));
  if (killed === 0) return { remaining: birds.slice(), killed: 0 };
  const doomed = new Set(rng.shuffle(birds).slice(0, killed).map((b) => b.id));
  return { remaining: birds.filter((b) => !doomed.has(b.id)), killed };
}

/** Each bird rolls starvation, then exposure, then predation; the first failed roll is its cause of death. */
export function simulateSurvival(birds: readonly Bird[], env: EnvironmentState, rng: RandomSource): SurvivalOutcome {
  const deathsByCause = emptyDeaths();
  const survivors: Bird[] = [];
  const riskTotals = { starvation: 0, exposure: 0, predation: 0 };

  const ordered = birds.slice().sort((a, b) => a.id - b.id);
  for (const bird of ordered) {
    const risks = {
      starvation: starvationRisk(bird.traits, env),
      exposure: exposureRisk(bird.traits, env),
      predation: predationRisk(bird.traits, env),
    };
    riskTotals.starvation += risks.starvation;
    riskTotals.exposure += risks.exposure;
    riskTotals.predation += risks.predation;

    if (rng.chance(risks.starvation)) deathsByCause.starvation++;
    else if (rng.chance(risks.exposure)) deathsByCause.exposure++;
    else if (rng.chance(risks.predation)) deathsByCause.predation++;
    else survivors.push(bird);
  }

  const n = ordered.length || 1;
  return {
    survivors,
    deathsByCause,
    avgRisk: {
      starvation: riskTotals.starvation / n,
      exposure: riskTotals.exposure / n,
      predation: riskTotals.predation / n,
    },
  };
}

/** Each trait comes from a random parent, with a small chance of mutating. */
export function inheritTraits(a: Traits, b: Traits, rng: RandomSource, mutationRate: number): Traits {
  const child = {} as Traits;
  for (const trait of TRAIT_NAMES) {
    let value = rng.chance(0.5) ? a[trait] : b[trait];
    if (rng.chance(mutationRate)) {
      if (ORDINAL_TRAITS.has(trait)) {
        const max = TRAIT_OPTIONS[trait].length - 1;
        const step = value === 0 ? 1 : value === max ? -1 : rng.chance(0.5) ? 1 : -1;
        value += step;
      } else {
        value = randomOtherOption(trait, value, rng);
      }
    }
    child[trait] = value;
  }
  return child;
}

/** Hatching chance for one pair, given how crowded the flock is. */
export function hatchChance(pairRepFit: number, survivorCount: number, birthMultiplier: number): number {
  const density = SIM.DENSITY_OFFSET - survivorCount / SIM.K;
  return clamp(SIM.BASE_HATCH * pairRepFit * density * birthMultiplier, 0, SIM.MAX_HATCH);
}

/** Survivors pair up at random; each pair lays eggs that hatch based on the parents' fitness. */
export function simulateReproduction(
  survivors: readonly Bird[],
  env: EnvironmentState,
  rng: RandomSource,
  firstId: number,
  options: { birthMultiplier: number; mutationRate: number },
): Bird[] {
  const chicks: Bird[] = [];
  const shuffled = rng.shuffle(survivors);
  let nextId = firstId;

  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const mom = shuffled[i];
    const dad = shuffled[i + 1];
    const pairFit = (reproductiveFitness(mom.traits, env) + reproductiveFitness(dad.traits, env)) / 2;
    const p = hatchChance(pairFit, survivors.length, options.birthMultiplier);
    for (let egg = 0; egg < SIM.EGGS_PER_PAIR; egg++) {
      if (chicks.length >= SIM.MAX_POP) return chicks;
      if (rng.chance(p)) {
        chicks.push({ id: nextId++, traits: inheritTraits(mom.traits, dad.traits, rng, options.mutationRate) });
      }
    }
  }
  return chicks;
}

export function runGeneration(
  pop: Population,
  env: EnvironmentState,
  rng: RandomSource,
  options: GenerationOptions = {},
): { population: Population; result: GenerationResult } {
  const birthMultiplier = options.birthMultiplier ?? 1;
  const mutationRate = options.mutationRate ?? SIM.MUTATION;
  const generation = pop.generation + 1;
  const startPopulation = pop.birds.length;

  const disaster = applyDisaster(pop.birds, options.disasterFraction ?? 0, rng);
  const survival = simulateSurvival(disaster.remaining, env, rng);
  survival.deathsByCause.disaster = disaster.killed;

  const chicks = simulateReproduction(survival.survivors, env, rng, pop.nextId, { birthMultiplier, mutationRate });
  const nextId = chicks.length > 0 ? chicks[chicks.length - 1].id + 1 : pop.nextId;

  const result: GenerationResult = {
    generation,
    startPopulation,
    population: chicks.length,
    born: chicks.length,
    died: startPopulation,
    deathsByCause: survival.deathsByCause,
    traitCounts: countTraits(chicks),
    avgRisk: survival.avgRisk,
    lowPopulation: chicks.length > 0 && chicks.length <= SIM.LOW_POP,
    extinct: chicks.length === 0,
  };

  return { population: { birds: chicks, generation, nextId }, result };
}
