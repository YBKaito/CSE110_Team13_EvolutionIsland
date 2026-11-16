import { describe, expect, it } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import {
  toEvolutionEnvironment, toEvolutionGeneration, toEvolutionInitialData,
  toEvolutionPreferences, toEvolutionTraitCounts,
} from '../src/game/EvolutionAdapters';
import { GameController } from '../src/game/GameController';
import { envWith, MEDIUM_BIRD } from './helpers/fixtures';

const species = { name: 'Sparrow', traits: MEDIUM_BIRD };
const quiet = () => new ScriptedScheduler([]);

describe('US3/US4 to US5 data adapters', () => {
  it('converts nested food and environment names without sharing the original data', () => {
    const environment = envWith({
      rainfall: 25, predation: 70, cover: 35, background: 'sand',
      food: { softPlants: 20, hardSeeds: 75 },
    });
    const adapted = toEvolutionEnvironment(environment);

    expect(adapted).toMatchObject({
      rainfall: 25, predationPressure: 70, habitatCover: 35,
      softPlants: 20, hardSeeds: 75,
    });
    expect(adapted.habitatBackground).toHaveLength(3);
    environment.food.softPlants = 100;
    expect(adapted.softPlants).toBe(20);
    expect(toEvolutionEnvironment(envWith({ background: 'forest' })).habitatBackground)
      .not.toEqual(adapted.habitatBackground);
  });

  it('converts option indexes to the four named US5 trait distributions', () => {
    expect(toEvolutionTraitCounts({
      beak: [2, 3, 4], body: [4, 3, 2], feathers: [5, 2, 2], color: [1, 2, 3, 3],
    })).toEqual({
      beakLength: { short: 2, medium: 3, long: 4 },
      bodySize: { small: 4, medium: 3, large: 2 },
      featherDensity: { thin: 5, medium: 2, thick: 2 },
      color: { brown: 1, gray: 2, yellow: 3, white: 3 },
    });
  });

  it('builds the initial US5 data from the species the player created', () => {
    const game = GameController.startRun(species, 3, quiet());
    const initial = toEvolutionInitialData(game.state);

    expect(initial.startingPopulation).toBe(game.state.population.birds.length);
    expect(initial.preferences).toEqual({
      beakLength: 'medium', bodySize: 'medium', featherDensity: 'medium', color: 'brown',
    });
    expect(initial.initialEnvironment.rainfall).toBe(50);
    expect(Object.values(initial.initialCounts.beakLength).reduce((a, b) => a + b, 0))
      .toBe(initial.startingPopulation);
    game.step();
    expect(() => toEvolutionInitialData(game.state)).toThrow(/generation 0/);
  });

  it('keeps previous evolution preferences after choices are accepted', () => {
    const game = GameController.startRun(species, 2, quiet());
    for (let i = 0; i < 10; i++) game.step();
    game.applyEvolutionChoice({
      generation: 10, traitKey: 'beakLength', fromValue: 'medium', targetValue: 'long',
    });
    expect(toEvolutionPreferences(game.state).beakLength).toBe('long');
    expect(toEvolutionPreferences(game.state).bodySize).toBe('medium');
  });

  it('converts population changes and event text for the same generation', () => {
    const game = GameController.startRun(species, 5, quiet());
    const outcome = game.step();
    const adapted = toEvolutionGeneration(outcome);
    const change = outcome.result.population - outcome.result.startPopulation;

    expect(adapted.generation).toBe(outcome.result.generation);
    expect(adapted.results.newPopulation).toBe(outcome.result.population);
    expect(adapted.results.populationIncrease).toBe(Math.max(0, change));
    expect(adapted.results.populationDecline).toBe(Math.max(0, -change));
    expect(Object.values(adapted.traitCounts.beakLength).reduce((a, b) => a + b, 0))
      .toBe(outcome.result.population);

    const withIncrease = toEvolutionGeneration({
      ...outcome, result: { ...outcome.result, population: outcome.result.startPopulation + 5 },
    });
    expect(withIncrease.results.populationIncrease).toBe(5);
    expect(withIncrease.results.populationDecline).toBe(0);
  });
});
