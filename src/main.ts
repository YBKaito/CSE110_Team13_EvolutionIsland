// Entry point.
// Flow: text menu (US1) -> species creation (US2) -> Konva simulation screens (US3 to US6).
// Dev URL options skip the menu and start a run with a default species:
//   ?seed=42        repeatable run
//   ?script=mockup  drought at Gen 6, predator at Gen 24
//   &minigames=always  a minigame every 5 generations (no random chance), for testing

import "@fontsource/vt323/400.css";
import "./styles/styles.css";

import { MOCKUP_SCRIPT } from "./events/eventDefinitions";
import { RandomScheduler, ScriptedScheduler, type EventScheduler } from "./events/EventFactory";
import { GAME_OVER_PREVIEW_GENERATION, GameController } from "./game/GameController";
import { BACK_TO_ISLAND, startGameSession, type RunMinigameLaunchers } from "./game/startGameSession";
import { startQuizSession } from "./minigames/quiz/startQuizSession";
import { MinigameManager } from "./minigames/MinigameManager";
import { ScreenState, type StartingSpecies } from "./models/GameState";
import { toStartingSpecies } from "./models/Species";

import { MenuScreenController } from "./screens/MenuScreen/MenuScreenController";
import { MenuScreenView, renderScreen } from "./screens/MenuScreen/MenuScreenView";
import { CreationScreenController } from "./screens/CreationScreen/CreationScreenController";
import { renderCreationScreen } from "./screens/CreationScreen/CreationScreenView";

import { ExtinctionScreenController } from './screens/ExtinctionScreen/ExtinctionScreenController';

import { GameScreenController } from "./screens/GameScreen/GameScreenController";
import { HatchingRhythmController } from "./screens/HatchingRhythm/HatchingRhythmController";
import { difficultyForFitness } from "./screens/HatchingRhythm/difficulty";
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
const makeMinigameManager = (): MinigameManager =>
  new MinigameManager(params.get("minigames") === "always" ? { chance: 1 } : {});

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
  const minigame = getEl<HTMLDivElement>("minigame");

  // US1 and US2: text terminal
  const state = new ScreenState();
  const menuController = new MenuScreenController(state);
  const creationController = new CreationScreenController(state);
  const view = new MenuScreenView(output, input);

  // US3 to US6: Konva screens. Created on first use, after #app is visible, so Konva measures a real size.
  let host: ScreenHost | null = null;
  let session: { dispose(): void } | null = null;


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
    minigame.hidden = true;
    terminal.hidden = false;
    input.disabled = false;
    input.focus();
  };

  const showApp = (): void => {
    terminal.hidden = true;
    app.hidden = false;
  };

  const backToMenu = (): void => {
    session?.dispose();
    session = null;
    state.goTo("menu");
    showTerminal();
    renderCurrentScreen();
  };
  
    // US10: Hatching Rhythm minigame (main menu option 3).
    const startHatchingRhythm = (): void => {
      terminal.hidden = true;
      input.blur();
      minigame.hidden = false;
      new HatchingRhythmController(minigame, {
        difficulty: state.minigameDifficulty,
        onExit: () => {
          state.goTo("minigames");
          showTerminal();
          renderCurrentScreen();
        },
      }).start();
    };

    // US8/US9/US10 during a run: the Konva game screens hide while a DOM minigame
    // is up, so ScreenHost ignores the keys meant for the minigame.
    const showRunMinigame = (): void => {
      app.hidden = true;
      minigame.hidden = false;
    };
    const backToRun = (): void => {
      minigame.hidden = true;
      app.hidden = false;
    };
    const runMinigames: RunMinigameLaunchers = {
      playHatching(fitness, done) {
        showRunMinigame();
        // The flock's own fitness sets the song, not the minigames menu's difficulty.
        new HatchingRhythmController(minigame, {
          fitness,
          difficulty: difficultyForFitness(fitness),
          finishedHint: `Song over! Press Enter to go ${BACK_TO_ISLAND.toLowerCase()}.`,
          onExit: (result) => {
            backToRun();
            done(result);
          },
        }).start();
      },
      playQuiz(done) {
        showRunMinigame();
        const finish = (): void => {
          backToRun();
          done();
        };
        try {
          // Required: no Back or Exit; the run ends once the player presses Done.
          startQuizSession(minigame, { onExit: finish, required: true });
        } catch {
          finish(); // No quiz available: go straight to Game Over.
        }
      },
    };

    const startRun = (species: StartingSpecies, seed: number): void => {
    
    session?.dispose();
    showApp();

    const screens = host ?? (host = new ScreenHost(app));
    const game = GameController.startRun(
      species,
      seed,
      makeScheduler(),
      GAME_OVER_PREVIEW_GENERATION,
    );

    session = startGameSession(screens, game, {
      onQuit: backToMenu,
      onRestart: () => startRun(species, randomSeed()),
      minigames: runMinigames,
      manager: makeMinigameManager(),
    });
  };

  const startExtinction = (seed: number, avoidSpecies?: string): void => {
    showApp();
    const screens = host ?? (host = new ScreenHost(app));
    screens.show(
      new ExtinctionScreenController(screens, {
        seed,
        avoidSpecies,
        onRestart: (played) => startExtinction(randomSeed(), played.name),
        onExit: backToMenu, // no minigames menu yet, so "Back to minigames" returns to the main menu
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
      if (result.nextScreen === "hatchingRhythm") {
        startHatchingRhythm();
        return;
      }
    }

    renderCurrentScreen(error);
  });

  // Dev shortcut: a seed or script in the URL skips the menu.
  console.log("minigame param:", params.get("minigame"), "seed param:", params.get("seed"));
  
  if (params.get("minigame") === "extinction") {
    startExtinction(params.has("seed") ? Number(params.get("seed")) : randomSeed());
  }
  else if (params.has("seed") || useScript) {
    const seed = params.has("seed") ? Number(params.get("seed")) : randomSeed();
    startRun(DEFAULT_SPECIES, seed);
  }
  else {
    showTerminal();
    renderCurrentScreen();
  }


}

void boot();
