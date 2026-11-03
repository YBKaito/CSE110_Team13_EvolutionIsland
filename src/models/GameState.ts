
import type {
  ScreenId,
  SpeciesTraits,
  ActiveEvent,
  EnvironmentState,
  EventLogEntry,
  GenerationResult,
  Population,
  Traits,
} from "../types";

import { Species } from "./Species";

// ---------- US1 / US2: Menu and Species Creation ----------

export class MenuState {
  screen: ScreenId = "menu";
  cardIndex = 0;
  creationStep = 0;
  birdName = "";

  selectedTraits: Partial<SpeciesTraits> = {};
  species: Species | null = null;

  goTo(screen: ScreenId): void {
    this.screen = screen;

    if (screen === "howToPlay") {
      this.cardIndex = 0;
    }
  }

  resetCreation(): void {
    this.creationStep = 0;
    this.birdName = "";
    this.selectedTraits = {};
  }
}

// ---------- US3 / US4: Simulation State ----------

/** The species passed into the simulation. */
export interface StartingSpecies {
  name: string;
  traits: Traits;
}

/** Stores the complete state of a simulation run. */
export interface GameState {
  seed: number;
  rngState: number;
  generation: number;
  species: StartingSpecies;
  population: Population;
  environment: EnvironmentState;
  activeEvents: ActiveEvent[];
  lastStartGen: number;

  history: {
    generations: GenerationResult[];
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
    history: {
      generations: [],
      environments: [environment],
      events: [],
    },
  };
}
