// Entry point.
// Flow: text menu (US1) -> species creation (US2) -> Konva simulation screens (US3 to US6).
// Dev URL options skip the menu and start a run with a default species:
//   ?seed=42        repeatable run
//   ?script=mockup  drought at Gen 6, predator at Gen 24

import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/silkscreen/400.css";
import "./styles/styles.css";

import { MOCKUP_SCRIPT } from "./events/eventDefinitions";
import { RandomScheduler, ScriptedScheduler, type EventScheduler } from "./events/EventFactory";
import { GameController } from "./game/GameController";
import { ScreenState, type StartingSpecies } from "./models/GameState";
import type { SpeciesTraits } from "./types";

import { MenuScreenController } from "./screens/MenuScreen/MenuScreenController";
import { MenuScreenView, renderScreen } from "./screens/MenuScreen/MenuScreenView";
import { CreationScreenController } from "./screens/CreationScreen/CreationScreenController";
import { renderCreationScreen } from "./screens/CreationScreen/CreationScreenView";

import { GameScreenController } from "./screens/GameScreen/GameScreenController";
import { ScreenHost } from "./screens/ui/ScreenHost";
import { FONT_FAMILY } from "./screens/ui/theme";

// ---------- Run setup ----------

const DEFAULT_SPECIES: StartingSpecies = {
  name: "Sparrow",
  traits: { beak: 0, body: 1, feathers: 1, color: 0 },
};

const params = new URLSearchParams(window.location.search);
const useScript = params.get("script") === "mockup";
const makeScheduler = (): EventScheduler =>
  useScript ? new ScriptedScheduler(MOCKUP_SCRIPT) : new RandomScheduler();
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

// ---------- US2 -> US3 handoff ----------

// Creation stores traits as words ("short"). The simulation stores traits as list positions (0).
// This order must match the option order in simulation/traitContent.ts.
const TRAIT_ORDER = {
  beakLength: ["short", "medium", "long"],
  bodySize: ["small", "medium", "large"],
  featherDensity: ["thin", "medium", "thick"],
  color: ["light", "brown", "dark"],
} as const;

function toStartingSpecies(name: string, traits: SpeciesTraits): StartingSpecies {
  return {
    name,
    traits: {
      beak: TRAIT_ORDER.beakLength.indexOf(traits.beakLength),
      body: TRAIT_ORDER.bodySize.indexOf(traits.bodySize),
      feathers: TRAIT_ORDER.featherDensity.indexOf(traits.featherDensity),
      color: TRAIT_ORDER.color.indexOf(traits.color),
    },
  };
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

// ---------- Boot ----------

async function boot(): Promise<void> {
  // Draw with the pixel font from the start instead of flashing the fallback font.
  try {
    await Promise.all([
      document.fonts.load(`24px ${FONT_FAMILY}`),
      document.fonts.load(`bold 24px ${FONT_FAMILY}`),
    ]);
  } catch {
    // Font unavailable (e.g. offline); the fallback font still works.
  }

  const terminal = getEl<HTMLDivElement>("terminal");
  const output = getEl<HTMLDivElement>("terminal-output");
  const input = getEl<HTMLInputElement>("terminal-input");
  const form = getEl<HTMLFormElement>("terminal-form");
  const app = getEl<HTMLDivElement>("app");

  // US1 and US2: text terminal
  const state = new ScreenState();
  const menuController = new MenuScreenController(state);
  const creationController = new CreationScreenController(state);
  const view = new MenuScreenView(output, input);

  // US3 to US6: Konva screens. Created on first use, after #app is visible, so Konva measures a real size.
  let host: ScreenHost | null = null;

  const renderCurrentScreen = (error: string | null = null): void => {
    if (state.screen === "creation") {
      view.show(renderCreationScreen(state), error);
    } else {
      view.show(renderScreen(state), error);
    }
    if (state.screen === "end") {
      view.disableInput();
    }
  };

  const showTerminal = (): void => {
    app.hidden = true;
    terminal.hidden = false;
    input.disabled = false;
    input.focus();
  };

  const showApp = (): void => {
    terminal.hidden = true;
    app.hidden = false;
  };

  const backToMenu = (): void => {
    state.goTo("menu");
    showTerminal();
    renderCurrentScreen();
  };

  const startRun = (species: StartingSpecies, seed: number): void => {
    showApp();
    const screens = host ?? (host = new ScreenHost(app));
    const game = GameController.startRun(species, seed, makeScheduler());
    screens.show(
      new GameScreenController(screens, game, {
        onQuit: backToMenu,
        onRestart: () => startRun(species, randomSeed()),
      }),
    );
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value;
    let error: string | null;

    if (state.screen === "creation") {
      // US2: species creation
      const result = creationController.handleInput(raw);
      error = result.error;

      // Creation finished: hand the species to the simulation.
      if (result.nextScreen === "simulation" && state.species) {
        startRun(toStartingSpecies(state.species.name, state.species.traits), randomSeed());
        return;
      }
    } else {
      // US1: main menu and How to Play
      const result = menuController.handleInput(raw);
      error = result.error;
      if (result.nextScreen === "creation") {
        state.resetCreation();
      }
    }

    renderCurrentScreen(error);
  });

  // Dev shortcut: a seed or script in the URL skips the menu.
  if (params.has("seed") || useScript) {
    const seed = params.has("seed") ? Number(params.get("seed")) : randomSeed();
    startRun(DEFAULT_SPECIES, seed);
  } else {
    showTerminal();
    renderCurrentScreen();
  }
}

void boot();