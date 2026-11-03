import { describe, expect, it } from 'vitest';
import { SIM } from '../src/constants';
import { createStartingPopulation, countTraits } from '../src/simulation/Population';
import { RandomSource } from '../src/simulation/Random';
import { applyDisaster, runGeneration } from '../src/simulation/SimulationEngine';
import { TRAIT_NAMES } from '../src/simulation/traitContent';
import type { EnvironmentState, GenerationResult, Population } from '../src/types';
import { droughtEnv, envWith, MEDIUM_BIRD, populationOf } from './helpers/fixtures';

function runMany(seed: number, env: EnvironmentState, generations: number, start: Population | null = null) {
  const rng = new RandomSource(seed);
  let pop = start ?? createStartingPopulation(MEDIUM_BIRD, rng);
  const results: GenerationResult[] = [];
  for (let g = 0; g < generations && pop.birds.length > 0; g++) {
    const step = runGeneration(pop, env, rng);
    pop = step.population;
    results.push(step.result);
  }
  return { results, pop };
}

describe('starting population', () => {
  it('has START_POP birds, mostly matching the player but with variation in every trait', () => {
    const pop = createStartingPopulation(MEDIUM_BIRD, new RandomSource(1));
    expect(pop.birds).toHaveLength(SIM.START_POP);
    const counts = countTraits(pop.birds);
    for (const trait of TRAIT_NAMES) {
      const matching = counts[trait][MEDIUM_BIRD[trait]] / SIM.START_POP;
      expect(matching).toBeGreaterThan(0.5);
      expect(matching).toBeLessThan(0.9);
    }
  });
});

describe('runGeneration invariants', () => {
  const { results } = runMany(3, envWith(), 50);

  it('never produces a negative population or exceeds the cap', () => {
    for (const r of results) {
      expect(r.population).toBeGreaterThanOrEqual(0);
      expect(r.population).toBeLessThanOrEqual(SIM.MAX_POP);
    }
  });

  it('replaces the flock each generation: new population = chicks born, every adult leaves', () => {
    for (const r of results) {
      expect(r.population).toBe(r.born);
      expect(r.died).toBe(r.startPopulation);
      const deaths = Object.values(r.deathsByCause).reduce((a, b) => a + b, 0);
      expect(deaths).toBeLessThanOrEqual(r.startPopulation);
    }
  });

  it('chains generations: each generation starts with the previous generation’s chicks', () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i].startPopulation).toBe(results[i - 1].population);
      expect(results[i].generation).toBe(results[i - 1].generation + 1);
    }
  });

  it('reports trait counts that add up to the population for every trait', () => {
    for (const r of results) {
      for (const trait of TRAIT_NAMES) {
        expect(r.traitCounts[trait].reduce((a, b) => a + b, 0)).toBe(r.population);
      }
    }
  });
});

describe('reproducibility', () => {
  it('gives identical results for the same seed and starting state', () => {
    expect(runMany(21, envWith({ predation: 130 }), 50).results).toEqual(runMany(21, envWith({ predation: 130 }), 50).results);
  });

  it('gives different results for different seeds', () => {
    expect(runMany(21, envWith(), 10).results).not.toEqual(runMany(22, envWith(), 10).results);
  });
});

describe('inheritance', () => {
  it('only passes on traits the parents carry when there is no mutation', () => {
    const parents = populationOf(Array.from({ length: 40 }, (_, i) => ({ beak: 0, body: 2, feathers: i % 2 === 0 ? 0 : 2, color: 3 })));
    const { population } = runGeneration(parents, envWith(), new RandomSource(4), { mutationRate: 0 });
    expect(population.birds.length).toBeGreaterThan(0);
    for (const chick of population.birds) {
      expect(chick.traits.beak).toBe(0);
      expect(chick.traits.body).toBe(2);
      expect([0, 2]).toContain(chick.traits.feathers);
      expect(chick.traits.color).toBe(3);
    }
  });

  it('gives chicks new, unique ids', () => {
    const start = createStartingPopulation(MEDIUM_BIRD, new RandomSource(9));
    const { population } = runGeneration(start, envWith(), new RandomSource(9));
    const ids = population.birds.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(start.nextId);
  });
});

describe('extinction and warnings', () => {
  it('goes extinct when no pair can breed', () => {
    const { result } = runGeneration(populationOf([MEDIUM_BIRD]), envWith(), new RandomSource(1));
    expect(result.population).toBe(0);
    expect(result.extinct).toBe(true);
    expect(result.lowPopulation).toBe(false);
  });

  it('flags a low population when the flock is small but alive', () => {
    const tiny = populationOf(Array.from({ length: 6 }, () => MEDIUM_BIRD));
    const rng = new RandomSource(2);
    const { result } = runGeneration(tiny, envWith(), rng);
    if (result.population > 0) expect(result.lowPopulation).toBe(result.population <= SIM.LOW_POP);
  });
});

describe('disasters', () => {
  it('remove the same birds regardless of their traits (luck, not selection)', () => {
    const plain = populationOf(Array.from({ length: 50 }, () => MEDIUM_BIRD));
    const colorful = populationOf(Array.from({ length: 50 }, (_, i) => ({ beak: i % 3, body: i % 3, feathers: i % 3, color: i % 4 })));
    const a = applyDisaster(plain.birds, 0.3, new RandomSource(8));
    const b = applyDisaster(colorful.birds, 0.3, new RandomSource(8));
    expect(a.killed).toBe(15);
    expect(a.remaining.map((x) => x.id)).toEqual(b.remaining.map((x) => x.id));
  });

  it('are recorded as their own cause of death', () => {
    const start = createStartingPopulation(MEDIUM_BIRD, new RandomSource(3));
    const { result } = runGeneration(start, envWith(), new RandomSource(3), { disasterFraction: 0.25 });
    expect(result.deathsByCause.disaster).toBe(Math.round(0.25 * SIM.START_POP));
  });
});

describe('balance', () => {
  it('keeps a flock in a normal environment alive and below the cap for 50 generations', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const { results } = runMany(seed, envWith(), 50);
      expect(results).toHaveLength(50);
      expect(results.at(-1)!.extinct).toBe(false);
      expect(Math.max(...results.map((r) => r.population))).toBeLessThan(SIM.MAX_POP);
    }
  });
});

describe('natural selection (science check)', () => {
  it('increases the share of long beaks during a drought in most runs', () => {
    const report: string[] = [];
    let rose = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const rng = new RandomSource(seed);
      const start = createStartingPopulation(MEDIUM_BIRD, rng);
      const startShare = countTraits(start.birds).beak[2] / start.birds.length;
      const { results } = runMany(seed, droughtEnv(), 20, start);
      const last = results.at(-1)!;
      const endShare = last.population > 0 ? last.traitCounts.beak[2] / last.population : 0;
      if (endShare > startShare) rose++;
      report.push(`seed ${seed}: long beaks ${(startShare * 100).toFixed(0)}% -> ${(endShare * 100).toFixed(0)}%`);
    }
    expect(rose, `Long beaks should become more common in a drought.\n${report.join('\n')}`).toBeGreaterThanOrEqual(8);
  });

  it('increases the share of thick feathers during a long cold spell in most runs', () => {
    const report: string[] = [];
    let rose = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const rng = new RandomSource(seed);
      const start = createStartingPopulation(MEDIUM_BIRD, rng);
      const startShare = countTraits(start.birds).feathers[2] / start.birds.length;
      const { results } = runMany(seed, envWith({ temperature: 60 }), 20, start);
      const last = results.at(-1)!;
      const endShare = last.population > 0 ? last.traitCounts.feathers[2] / last.population : 0;
      if (endShare > startShare) rose++;
      report.push(`seed ${seed}: thick feathers ${(startShare * 100).toFixed(0)}% -> ${(endShare * 100).toFixed(0)}%`);
    }
    expect(rose, `Thick feathers should become more common in the cold.\n${report.join('\n')}`).toBeGreaterThanOrEqual(8);
  });
});
