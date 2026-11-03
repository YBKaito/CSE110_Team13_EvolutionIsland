// Entry point. Until the menu (US1) and species creation (US2) screens exist, this starts a run
// with a default species and goes straight to the generation screen.
// URL options: ?seed=42 (repeatable run)  ?script=mockup (drought at Gen 6, predator at Gen 24)

import './styles/styles.css';
import { MOCKUP_SCRIPT } from './events/eventDefinitions';
import { RandomScheduler, ScriptedScheduler, type EventScheduler } from './events/EventFactory';
import { GameController } from './game/GameController';
import type { StartingSpecies } from './models/GameState';
import { GameScreenController } from './screens/GameScreen/GameScreenController';
import { ScreenHost } from './screens/ui/ScreenHost';
import { FONT_FAMILY } from './screens/ui/theme';

const DEFAULT_SPECIES: StartingSpecies = { name: 'Sparrow', traits: { beak: 0, body: 1, feathers: 1, color: 0 } };

const params = new URLSearchParams(window.location.search);
const useScript = params.get('script') === 'mockup';
const makeScheduler = (): EventScheduler => (useScript ? new ScriptedScheduler(MOCKUP_SCRIPT) : new RandomScheduler());
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

async function boot(): Promise<void> {
  // Draw with the pixel font from the start instead of flashing the fallback font.
  try {
    await Promise.all([document.fonts.load(`24px ${FONT_FAMILY}`), document.fonts.load(`bold 24px ${FONT_FAMILY}`)]);
  } catch {
    // Font unavailable (e.g. offline); the fallback font still works.
  }

  const container = document.getElementById('app') as HTMLDivElement;
  const host = new ScreenHost(container);

  const startRun = (seed: number) => {
    const game = GameController.startRun(DEFAULT_SPECIES, seed, makeScheduler());
    host.show(
      new GameScreenController(host, game, {
        onQuit: () => startRun(randomSeed()),
        onRestart: () => startRun(randomSeed()),
      }),
    );
  };

  startRun(params.has('seed') ? Number(params.get('seed')) : randomSeed());
}

void boot();
