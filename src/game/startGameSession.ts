import type { GameController } from './GameController';
import { toEvolutionInitialData } from './EvolutionAdapters';
import { GameSimulationCoordinator } from './GameSimulationCoordinator';
import { EvolutionScreenController } from '../screens/EvolutionScreen/EvolutionScreenController';
import { EvolutionScreenModel } from '../screens/EvolutionScreen/EvolutionScreenModel';
import { EvolutionScreenView } from '../screens/EvolutionScreen/EvolutionScreenView';
import type { ScreenSwitcher } from '../screens/ScreenController';
import { GameScreenController, type GameScreenOptions } from '../screens/GameScreen/GameScreenController';
import type { ScreenHost } from '../screens/ui/ScreenHost';

/** Set up one playable run and connect the generation, event, and evolution screens. */
export function startGameSession(
  host: ScreenHost,
  game: GameController,
  options: Pick<GameScreenOptions, 'onQuit' | 'onRestart'>,
): { dispose(): void } {
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
    ...options,
    simulation,
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
      // Detach a visible view before the controller destroys its Konva group.
      if (showingEvolution) host.show(gameScreen);
      evolution.dispose();
      simulation.dispose();
    },
  };
}
