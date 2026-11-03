import { describe, expect, it } from 'vitest';
import { ENV, SIM } from '../src/constants';
import { ENV_VARIABLES, getValue } from '../src/models/Environment';
import { MOCKUP_SCRIPT } from '../src/events/eventDefinitions';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import type { GameState } from '../src/models/GameState';
import { createStartingPopulation } from '../src/simulation/Population';
import { RandomSource } from '../src/simulation/Random';
import { MEDIUM_BIRD } from './helpers/fixtures';

const species = { name: 'Sparrow', traits: MEDIUM_BIRD };
const quiet = () => new ScriptedScheduler([]);

describe('step order and history', () => {
  it('advances one generation per step and records results and environments', () => {
    const game = GameController.startRun(species, 1, quiet());
    for (let i = 0; i < 12; i++) game.step();
    expect(game.state.generation).toBe(12);
    expect(game.generationHistory()).toHaveLength(12);
    expect(game.state.history.environments).toHaveLength(13);
    expect(game.generationHistory().map((r) => r.generation)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it('applies the event to the environment before the birds face it', () => {
    const game = GameController.startRun(species, 1, new ScriptedScheduler([{ generation: 1, eventId: 'newPredator' }]));
    game.step();
    expect(game.state.history.environments[1].predation).toBeGreaterThan(50);
    expect(game.state.population.generation).toBe(1);
  });

  it('runs a full 60-generation game without any UI', () => {
    const game = GameController.startRun(species, 7);
    for (let i = 0; i < 60 && !game.isOver; i++) game.step();
    expect(game.state.generation).toBeGreaterThan(0);
    expect(game.state.population.birds.length).toBe(game.generationHistory().at(-1)!.population);
  });

  it('records every island value as a whole number from 0 to 100 (what US5/US6 read)', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const game = GameController.startRun(species, seed);
      for (let i = 0; i < 80 && !game.isOver; i++) game.step();
      for (const env of game.state.history.environments) {
        for (const variable of ENV_VARIABLES) {
          const value = getValue(env, variable);
          expect(Number.isInteger(value), `seed ${seed}: ${variable} = ${value}`).toBe(true);
          expect(value).toBeGreaterThanOrEqual(ENV.MIN);
          expect(value).toBeLessThanOrEqual(ENV.MAX);
        }
      }
    }
  });
});

describe('pauses', () => {
  it('pauses at every 10th generation for the evolution choice', () => {
    const game = GameController.startRun(species, 2, quiet());
    for (let i = 0; i < 9; i++) expect(game.step().pauses).toEqual([]);
    expect(game.step().pauses).toContainEqual({ kind: 'milestone', generation: 10 });
  });

  it('"Skip 5" stops early at the Gen 10 milestone instead of skipping it', () => {
    const game = GameController.startRun(species, 3, quiet());
    for (let i = 0; i < 7; i++) game.step();
    const outcomes = game.advance(5);
    expect(outcomes).toHaveLength(3);
    expect(game.state.generation).toBe(10);
    expect(outcomes.at(-1)!.pauses[0]).toEqual({ kind: 'milestone', generation: 10 });
  });

  it('"Skip 5" stops when an event starts so the player sees the event card', () => {
    const game = GameController.startRun(species, 4, new ScriptedScheduler([{ generation: 3, eventId: 'drought' }]));
    const outcomes = game.advance(5);
    expect(game.state.generation).toBe(3);
    expect(outcomes.at(-1)!.pauses[0]).toMatchObject({ kind: 'event', entry: { kind: 'started', eventId: 'drought' } });
  });

  it('runs all 5 generations when nothing needs the player', () => {
    const game = GameController.startRun(species, 5, quiet());
    expect(game.advance(5)).toHaveLength(5);
    expect(game.state.generation).toBe(5);
  });

  it('reports extinction and refuses to keep simulating', () => {
    const game = GameController.startRun(species, 6, quiet());
    game.step();
    const dead = structuredClone(game.state);
    dead.population.birds = dead.population.birds.slice(0, 1);
    const ending = GameController.resume(dead, quiet());
    const outcome = ending.step();
    expect(outcome.pauses).toContainEqual({ kind: 'extinct', generation: 2 });
    expect(ending.isOver).toBe(true);
    expect(() => ending.step()).toThrow(/extinct/);
    expect(ending.advance(5)).toEqual([]);
  });
});

describe('saving and resuming', () => {
  it('continues a saved run exactly as if it had never stopped', () => {
    const original = GameController.startRun(species, 11, new ScriptedScheduler(MOCKUP_SCRIPT));
    for (let i = 0; i < 15; i++) original.step();
    const saved = structuredClone(original.state);

    for (let i = 0; i < 15; i++) original.step();
    const resumed = GameController.resume(saved, new ScriptedScheduler(MOCKUP_SCRIPT));
    for (let i = 0; i < 15; i++) resumed.step();

    expect(resumed.state).toEqual(original.state);
  });

  it('keeps the whole game state serializable as JSON', () => {
    const game = GameController.startRun(species, 12, new ScriptedScheduler(MOCKUP_SCRIPT));
    for (let i = 0; i < 10; i++) game.step();
    expect(JSON.parse(JSON.stringify(game.state))).toEqual(game.state);
  });

  it('is reproducible: the same seed gives the same run', () => {
    const run = (seed: number) => {
      const game = GameController.startRun(species, seed);
      for (let i = 0; i < 40 && !game.isOver; i++) game.step();
      return game.state;
    };
    expect(run(99)).toEqual(run(99));
  });
});

describe('helpers for other user stories', () => {
  it('reports environment changes as percentages', () => {
    const game = GameController.startRun(species, 13, new ScriptedScheduler([{ generation: 1, eventId: 'drought' }]));
    for (let i = 0; i < 15; i++) game.step();
    const change = game.envChangePercent(0, 15);
    expect(change.rainfall).toBeLessThan(0);
    expect(change.hardSeeds).toBeCloseTo(0, 5);
  });
});

describe('performance', () => {
  it('simulates a generation of a full flock in well under a second', () => {
    const game = GameController.startRun(species, 14, quiet());
    const big: GameState = structuredClone(game.state);
    big.population = createStartingPopulation(MEDIUM_BIRD, new RandomSource(14), SIM.MAX_POP);
    const full = GameController.resume(big, quiet());
    const start = performance.now();
    full.step();
    expect(performance.now() - start).toBeLessThan(50);
  });
});
