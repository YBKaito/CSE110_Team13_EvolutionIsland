
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/silkscreen/400.css";
import "./styles/styles.css";

import { MenuState } from "./models/GameState";
import type { StartingSpecies } from "./models/GameState";

import { MenuScreenController } from "./screens/MenuScreen/MenuScreenController";
import {
  MenuScreenView,
  renderScreen,
} from "./screens/MenuScreen/MenuScreenView";

import { CreationScreenController } from "./screens/CreationScreen/CreationScreenController";
import { renderCreationScreen } from "./screens/CreationScreen/CreationScreenView";

import { MOCKUP_SCRIPT } from "./events/eventDefinitions";
import {
  RandomScheduler,
  ScriptedScheduler,
  type EventScheduler,
} from "./events/EventFactory";
import { GameController } from "./game/GameController";
import { GameScreenController } from "./screens/GameScreen/GameScreenController";
import { ScreenHost } from "./screens/ui/ScreenHost";
import { FONT_FAMILY } from "./screens/ui/theme";
import { TRAIT_OPTIONS as SIM_TRAIT_OPTIONS } from "./simulation/traitContent";

const params = new URLSearchParams(window.location.search);
const useScript = params.get("script") === "mockup";

const makeScheduler = (): EventScheduler =>
  useScript
    ? new ScriptedScheduler(MOCKUP_SCRIPT)
    : new RandomScheduler();

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

async function boot(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`24px ${FONT_FAMILY}`),
      document.fonts.load(`bold 24px ${FONT_FAMILY}`),
    ]);
  } catch {
    // Font unavailable; fallback font still works.
  }

  const output = document.getElementById("terminal-output");
  const input = document.getElementById("terminal-input");
  const form = document.getElementById("terminal-form");

  if (!output || !(input instanceof HTMLInputElement) || !form) {
    return;
  }

  const state = new MenuState();

  const menuController = new MenuScreenController(state);
  const creationController = new CreationScreenController(state);

  const view = new MenuScreenView(output, input);

  let simulationStarted = false;

  function startSimulation(): void {
    if (!state.species || simulationStarted) return;

    simulationStarted = true;

    const traits = state.species.traits;

    // Convert US2's string traits into US3's numeric traits.
    // Use US3's trait definitions as the source of truth.
    const species: StartingSpecies = {
      name: state.species.name,
      traits: {
        beak: SIM_TRAIT_OPTIONS.beak.indexOf(traits.beakLength),
        body: SIM_TRAIT_OPTIONS.body.indexOf(traits.bodySize),
        feathers: SIM_TRAIT_OPTIONS.feathers.indexOf(traits.featherDensity),
        color: SIM_TRAIT_OPTIONS.color.indexOf(traits.color),
      },
    };

    const seed = params.has("seed")
      ? Number(params.get("seed"))
      : randomSeed();

    const game = GameController.startRun(species, seed, makeScheduler());

    // Replace the menu with US3's simulation screen.
    const container = document.getElementById("app") as HTMLDivElement;
    const host = new ScreenHost(container);

    const showGame = (controller: GameController): void => {
      host.show(
        new GameScreenController(host, controller, {
          onQuit: () => {
            window.location.reload();
          },
          onRestart: () => {
            showGame(
              GameController.startRun(species, randomSeed(), makeScheduler()),
            );
          },
        }),
      );
    };

    showGame(game);
  }

  function renderCurrentScreen(error: string | null = null): void {
    switch (state.screen) {
      case "creation":
        view.show(renderCreationScreen(state), error);
        break;

      case "simulation":
        startSimulation();
        return;

      default:
        view.show(renderScreen(state), error);
        break;
    }

    if (state.screen === "end") {
      view.disableInput();
    }
  }

  renderCurrentScreen();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const raw = input.value;
    let error: string | null = null;

    if (state.screen === "creation") {
      const result = creationController.handleInput(raw);
      error = result.error;
    } else if (state.screen === "simulation") {
      return;
    } else {
      const result = menuController.handleInput(raw);
      error = result.error;

      if (result.nextScreen === "creation") {
        state.resetCreation();
      }
    }

    renderCurrentScreen(error);
  });
}

void boot();
