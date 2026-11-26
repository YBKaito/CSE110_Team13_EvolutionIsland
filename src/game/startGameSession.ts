import type { GameController } from './GameController';
import { toEvolutionInitialData } from './EvolutionAdapters';
import { GameSimulationCoordinator } from './GameSimulationCoordinator';
import { EvolutionScreenController } from '../screens/EvolutionScreen/EvolutionScreenController';
import { EvolutionScreenModel } from '../screens/EvolutionScreen/EvolutionScreenModel';
import { EvolutionScreenView } from '../screens/EvolutionScreen/EvolutionScreenView';
import type { ScreenSwitcher } from '../screens/ScreenController';
import { GameScreenController, type GameScreenOptions } from '../screens/GameScreen/GameScreenController';
import type { ScreenHost } from '../screens/ui/ScreenHost';
import { ExtinctionScreenController } from '../screens/ExtinctionScreen/ExtinctionScreenController';
import type { HatchResult } from '../screens/HatchingRhythm/hatchResult';
import { MinigameManager, type MidRunMinigameId } from '../minigames/MinigameManager';
import { randomFlockBirdFitness } from '../screens/HatchingRhythm/difficulty';

/** Wording for leaving a minigame that was opened during a run. */
export const BACK_TO_ISLAND = 'Back to your island';

/**
 * Minigames that draw outside the Konva host. main.ts swaps the visible
 * container, starts the game, and calls `done` once the player leaves it.
 */
export interface RunMinigameLaunchers {
  /**
   * US10. `fitness` (0 to 1) comes from a bird in the current flock and sets the
   * song's speed and box size. `done` gets the hatch result, or null when the player quit early.
   */
  playHatching(fitness: number, done: (result: HatchResult | null) => void): void;
  /** US9, at the end of the run. */
  playQuiz(done: () => void): void;
}

export interface GameSessionOptions extends Pick<GameScreenOptions, 'onQuit' | 'onRestart'> {
  /** Leave out to run without minigames (tests, dev URLs). */
  minigames?: RunMinigameLaunchers;
  /** Scheduling rules; a default manager is made when minigames are given. */
  manager?: MinigameManager;
  /** Picks the bird whose fitness sets Hatching Rhythm's difficulty. Defaults to Math.random. */
  random?: () => number;
}

/** Set up one playable run and connect the generation, event, and evolution screens. */
export function startGameSession(
  host: ScreenHost,
  game: GameController,
  options: GameSessionOptions,
): { dispose(): void } {
  const { minigames, manager = new MinigameManager(), random = Math.random, ...screenOptions } = options;
  const simulation = new GameSimulationCoordinator(game);
  const initial = toEvolutionInitialData(game.state);
  const model = new EvolutionScreenModel(
    initial.startingPopulation,
    initial.initialCounts,
    initial.initialEnvironment,
    initial.preferences,
  );
  const evolutionView = new EvolutionScreenView();
  let pendingChoice = false;
  let showingEvolution = false;
  let gameScreen: GameScreenController;
  let disposed = false;

  // Each launcher shows a minigame and calls `done` once; `done` hands control back to the run.
  const launch: Record<MidRunMinigameId, (done: () => void) => void> = {
    extinction(done) {
      const round = (avoidSpecies?: string): void => host.show(new ExtinctionScreenController(host, {
        seed: Math.floor(Math.random() * 2 ** 31),
        avoidSpecies,
        exitLabel: BACK_TO_ISLAND,
        onRestart: (played) => round(played.name),
        onExit: done,
      }));
      round();
    },
    hatching(done) {
      const fitness = randomFlockBirdFitness(game.state.population.birds, game.state.environment, random);
      if (!minigames || fitness === null) return done();
      minigames.playHatching(fitness, (result) => {
        // A finished song boosts or cuts hatching in the next generation only.
        if (result && !disposed) simulation.setNextBirthMultiplier(result.birthMultiplier);
        done();
      });
    },
  };

  // A checkpoint is announced during simulation. Let the generation screen
  // finish showing event cards before opening the evolution screen.
  const switcher: ScreenSwitcher = {
    switchToScreen(screen) {
      if (screen.type === 'evolution-choice') {
        pendingChoice = true;
      } else if (screen.type === 'game') {
        showingEvolution = false;
        host.show(gameScreen);
      } else if (screen.type === 'result') {
        // The generation screen already displays extinction and restart options.
        pendingChoice = false;
      }
    },
  };

  const evolution = new EvolutionScreenController(model, evolutionView, simulation, switcher);
  gameScreen = new GameScreenController(host, game, {
    ...screenOptions,
    simulation,
    onBetweenGenerations: minigames && ((resume) => {
      if (simulation.isEnded()) return false;
      const id = manager.startMidRun(game.state.generation);
      if (!id) return false;
      launch[id](() => {
        manager.finish(id);
        if (!disposed) resume();
      });
      return true;
    }),
    onRunEnd: minigames && ((finish) => {
      if (manager.startEndOfRun() !== 'quiz') return false;
      minigames.playQuiz(() => {
        manager.finish('quiz');
        if (!disposed) finish();
      });
      return true;
    }),
    onCheckpoint: () => {
      if (!pendingChoice || !simulation.isPaused()) return false;
      showingEvolution = true;
      host.show(evolution);
      pendingChoice = false;
      return true;
    },
  });

  host.show(gameScreen);

  return {
    dispose() {
      disposed = true;
      // Detach a visible view before the controller destroys its Konva group.
      if (showingEvolution) host.show(gameScreen);
      evolution.dispose();
      simulation.dispose();
    },
  };
}
