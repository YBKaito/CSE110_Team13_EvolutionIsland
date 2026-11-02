// Everything about a run in one plain, serializable object, so it can be saved, restored, and read by other screens.

import type { ActiveEvent, EnvironmentState, EventLogEntry, GenerationResult, Population, Traits } from '../types';

/** The species the player designed (US2 provides this). */
export interface StartingSpecies {
  name: string;
  traits: Traits;
}

export interface GameState {
  seed: number;
  /** RandomSource state after the last step; restoring it resumes the run exactly. */
  rngState: number;
  generation: number;
  species: StartingSpecies;
  population: Population;
  environment: EnvironmentState;
  activeEvents: ActiveEvent[];
  /** Generation the most recent event started (0 if none). */
  lastStartGen: number;
  history: {
    /** Result of each generation; generations[i] is generation i + 1. */
    generations: GenerationResult[];
    /** Environment at each generation; environments[0] is the starting island. */
    environments: EnvironmentState[];
    events: EventLogEntry[];
  };
}

export function createGameState(
  species: StartingSpecies,
  seed: number,
  rngState: number,
  population: Population,
  environment: EnvironmentState,
): GameState {
  return {
    seed,
    rngState,
    generation: 0,
    species,
    population,
    environment,
    activeEvents: [],
    lastStartGen: 0,
    history: { generations: [], environments: [environment], events: [] },
  };
}
