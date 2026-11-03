// Coordinates a run: events -> environment -> generation, one step per generation (design report §8.1).
// Holds no event or fitness rules itself; it just calls the systems in order and decides when to pause.

import { EVENTS } from '../constants';
import { RandomScheduler, type EventScheduler } from '../events/EventFactory';
import { advanceEvents } from '../events/EventManager';
import { createBaselineEnvironment, ENV_VARIABLES, getValue, regenerate } from '../models/Environment';
import { createGameState, type GameState, type StartingSpecies } from '../models/GameState';
import { createStartingPopulation } from '../simulation/Population';
import { RandomSource } from '../simulation/Random';
import { runGeneration } from '../simulation/SimulationEngine';
import type { EnvVariable, EventLogEntry, GenerationResult } from '../types';

/** A reason to stop and show the player something before simulating further. */
export type Pause =
  | { kind: 'event'; entry: EventLogEntry }
  | { kind: 'milestone'; generation: number }
  | { kind: 'lowPopulation'; population: number }
  | { kind: 'extinct'; generation: number };

export interface StepOutcome {
  result: GenerationResult;
  events: EventLogEntry[];
  pauses: Pause[];
}

export interface StepOptions {
  /** Hatching multiplier for this generation (Hatching Rhythm minigame, US10). */
  birthMultiplier?: number;
}

export class GameController {
  private rng: RandomSource;
  private gameState: GameState;

  private constructor(state: GameState, private readonly scheduler: EventScheduler) {
    this.gameState = state;
    this.rng = new RandomSource(state.seed);
    this.rng.setState(state.rngState);
  }

  /** Starts a new run from the player's species. */
  static startRun(species: StartingSpecies, seed: number, scheduler: EventScheduler = new RandomScheduler()): GameController {
    const rng = new RandomSource(seed);
    const population = createStartingPopulation(species.traits, rng);
    const state = createGameState(species, seed, rng.getState(), population, createBaselineEnvironment());
    return new GameController(state, scheduler);
  }

  /** Continues a saved run exactly where it left off. */
  static resume(state: GameState, scheduler: EventScheduler = new RandomScheduler()): GameController {
    return new GameController(structuredClone(state), scheduler);
  }

  get state(): Readonly<GameState> {
    return this.gameState;
  }

  get isOver(): boolean {
    return this.gameState.population.birds.length === 0;
  }

  /** Simulates exactly one generation. */
  step(options: StepOptions = {}): StepOutcome {
    if (this.isOver) throw new Error('The flock is extinct; start a new run.');
    const s = this.gameState;
    const generation = s.generation + 1;

    const events = advanceEvents(s.environment, s.activeEvents, generation, this.scheduler, this.rng, s.lastStartGen);
    const environment = regenerate(events.env, this.rng, events.held);
    const { population, result } = runGeneration(s.population, environment, this.rng, {
      birthMultiplier: options.birthMultiplier,
      disasterFraction: events.mortality,
    });

    s.generation = generation;
    s.environment = environment;
    s.activeEvents = events.active;
    s.lastStartGen = events.lastStartGen;
    s.population = population;
    s.rngState = this.rng.getState();
    s.history.generations.push(result);
    s.history.environments.push(environment);
    s.history.events.push(...events.log);

    const pauses: Pause[] = events.log.map((entry) => ({ kind: 'event', entry }));
    if (generation % EVENTS.MILESTONE_EVERY === 0) pauses.push({ kind: 'milestone', generation });
    if (result.lowPopulation) pauses.push({ kind: 'lowPopulation', population: result.population });
    if (result.extinct) pauses.push({ kind: 'extinct', generation });

    return { result, events: events.log, pauses };
  }

  /** Simulates up to `count` generations ("Skip 5"), stopping early at the first pause so no decision is skipped. */
  advance(count: number, options: StepOptions = {}): StepOutcome[] {
    const outcomes: StepOutcome[] = [];
    for (let i = 0; i < count && !this.isOver; i++) {
      const outcome = this.step(options);
      outcomes.push(outcome);
      if (outcome.pauses.length > 0) break;
    }
    return outcomes;
  }

  /** Percent change of each environment variable between two generations (for the US5 review pages). */
  envChangePercent(fromGen: number, toGen: number): Record<EnvVariable, number> {
    const envs = this.gameState.history.environments;
    const from = envs[Math.max(0, Math.min(fromGen, envs.length - 1))];
    const to = envs[Math.max(0, Math.min(toGen, envs.length - 1))];
    const change = {} as Record<EnvVariable, number>;
    for (const variable of ENV_VARIABLES) {
      const before = getValue(from, variable);
      const after = getValue(to, variable);
      change[variable] = before === 0 ? (after === 0 ? 0 : 100) : ((after - before) / before) * 100;
    }
    return change;
  }

  eventHistory(): readonly EventLogEntry[] {
    return this.gameState.history.events;
  }

  generationHistory(): readonly GenerationResult[] {
    return this.gameState.history.generations;
  }
}
