import { describe, expect, it } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import { toEvolutionInitialData, toEvolutionPreferences } from '../src/game/EvolutionAdapters';
import { GameSimulationCoordinator } from '../src/game/GameSimulationCoordinator';
import { Publisher } from '../src/game/Publisher';
import { EvolutionScreenModel } from '../src/screens/EvolutionScreen/EvolutionScreenModel';
import { MEDIUM_BIRD } from './helpers/fixtures';

const species = { name: 'Sparrow', traits: MEDIUM_BIRD };
const quiet = () => new ScriptedScheduler([]);

describe('Publisher', () => {
  it('supports unsubscribe without calling removed or newly added listeners mid-publish', () => {
    const publisher = new Publisher<number>();
    const calls: string[] = [];
    let unsubscribeSecond = () => {};
    publisher.subscribe(value => {
      calls.push(`first:${value}`);
      if (value === 1) {
        unsubscribeSecond();
        publisher.subscribe(next => calls.push(`new:${next}`));
      }
    });
    unsubscribeSecond = publisher.subscribe(value => calls.push(`second:${value}`));
    publisher.publish(1);
    publisher.publish(2);
    expect(calls).toEqual(['first:1', 'first:2', 'new:2']);
  });
});

describe('real simulation coordinator', () => {
  it('publishes the US4 environment before the US3 generation with matching numbers', () => {
    const game = GameController.startRun(species, 3, quiet());
    const coordinator = new GameSimulationCoordinator(game);
    const order: string[] = [];
    const unsubscribeEnvironment = coordinator.environment.subscribe(update => {
      order.push(`environment:${update.generation}`);
      expect(update.state.rainfall).toBe(game.state.environment.rainfall);
    });
    coordinator.generations.subscribe(update => {
      order.push(`generation:${update.generation}`);
      expect(update.results.newPopulation).toBe(game.state.population.birds.length);
    });

    coordinator.step();
    unsubscribeEnvironment();
    coordinator.step();
    expect(order).toEqual(['environment:1', 'generation:1', 'generation:2']);
    coordinator.dispose();
  });

  it('stops at the checkpoint and only resumes after an accepted choice', async () => {
    const game = GameController.startRun(species, 2, quiet());
    const coordinator = new GameSimulationCoordinator(game);
    for (let i = 0; i < 7; i++) coordinator.step();
    expect(coordinator.advance(5)).toHaveLength(3);
    expect(coordinator.getGeneration()).toBe(10);
    expect(coordinator.isPaused()).toBe(true);
    expect(() => coordinator.step()).toThrow(/evolution choice/);
    expect(coordinator.advance(5)).toEqual([]);

    const current = toEvolutionPreferences(game.state);
    const choice = {
      generation: 10, traitKey: 'beakLength' as const,
      fromValue: current.beakLength, targetValue: 'long',
    };
    expect(await coordinator.submitTraitFocus(choice, { ...current, bodySize: 'large', beakLength: 'long' }))
      .toMatchObject({ ok: false });
    expect(coordinator.isPaused()).toBe(true);
    expect(await coordinator.submitTraitFocus(choice, { ...current, beakLength: 'long' }))
      .toEqual({ ok: true });
    expect(game.state.favoredTraits.beak).toBe(2);
    expect(coordinator.isPaused()).toBe(false);
    expect(coordinator.step().result.generation).toBe(11);
    coordinator.dispose();
  });

  it('feeds the real environment and generation data into the US5 model at a checkpoint', () => {
    const game = GameController.startRun(species, 2, quiet());
    const coordinator = new GameSimulationCoordinator(game);
    const initial = toEvolutionInitialData(game.state);
    const model = new EvolutionScreenModel(
      initial.startingPopulation, initial.initialCounts, initial.initialEnvironment, initial.preferences,
    );
    coordinator.environment.subscribe(update => model.cacheEnvironment(update));
    coordinator.generations.subscribe(update => {
      if (coordinator.isCheckpoint(update.generation) && update.results.newPopulation > 0) {
        model.recordGeneration(update);
        model.captureObservation(update.generation);
      }
    });

    for (let i = 0; i < 10; i++) coordinator.step();
    const snapshot = model.getCurrentObservation();
    expect(snapshot.generation).toBe(10);
    expect(snapshot.results.newPopulation).toBe(game.state.population.birds.length);
    expect(snapshot.environment.rainfall).toBe(game.state.environment.rainfall);
    expect(Object.values(snapshot.traitCounts.beakLength).reduce((a, b) => a + b, 0))
      .toBe(snapshot.results.newPopulation);
    coordinator.dispose();
  });

  it('ends without asking for an evolution choice when the flock is extinct', () => {
    const game = GameController.startRun(species, 2, quiet());
    const saved = structuredClone(game.state);
    saved.population.birds = saved.population.birds.slice(0, 1);
    const coordinator = new GameSimulationCoordinator(GameController.resume(saved, quiet()));
    const result = coordinator.step();
    expect(result.result.extinct).toBe(true);
    expect(coordinator.isEnded()).toBe(true);
    expect(coordinator.isPaused()).toBe(false);
    expect(coordinator.advance(5)).toEqual([]);
    coordinator.dispose();
  });
});
