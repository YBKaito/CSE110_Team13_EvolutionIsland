import { describe, expect, it, vi } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import { BACK_TO_ISLAND, startGameSession, type RunMinigameLaunchers } from '../src/game/startGameSession';
import { MinigameManager, type MidRunMinigameId } from '../src/minigames/MinigameManager';
import { ExtinctionScreenController } from '../src/screens/ExtinctionScreen/ExtinctionScreenController';
import { GameOverScreenController } from '../src/screens/GameOverScreen/GameOverScreenController';
import { GameScreenController } from '../src/screens/GameScreen/GameScreenController';
import { birdFitness } from '../src/screens/HatchingRhythm/difficulty';
import type { HatchResult } from '../src/screens/HatchingRhythm/hatchResult';
import type { ScreenController } from '../src/screens/ScreenController';
import type { ScreenHost } from '../src/screens/ui/ScreenHost';
import type { Screen } from '../src/screens/ui/screenSpec';
import { MEDIUM_BIRD } from './helpers/fixtures';
import { screenText } from './helpers/screens';

// The real evolution view uses Konva; a stand-in keeps these tests canvas-free.
vi.mock('../src/screens/EvolutionScreen/EvolutionScreenView', () => ({
  EvolutionScreenView: class {
    handlers: Record<string, (...args: any[]) => void> = {};
    rendered: any = null;
    bind(handlers: Record<string, (...args: any[]) => void>) { this.handlers = handlers; }
    render(state: any) { this.rendered = state; }
    getGroup() { return { destroy() {} }; }
    show() {}
    hide() {}
  },
}));

class FakeHost {
  current: Screen | ScreenController | null = null;
  evolutionView: { handlers: Record<string, (...args: any[]) => void> } | null = null;

  show(screen: Screen | ScreenController) {
    if (this.current && 'getView' in this.current) this.current.hide();
    this.current = screen;
    if ('getView' in screen) {
      this.evolutionView = screen.getView() as any;
      screen.show();
    } else {
      this.evolutionView = null;
    }
  }
  refresh() {}

  get screen(): Screen { return this.current as Screen; }
}

/** Stand-ins for the DOM minigames; the test decides when the player leaves. */
class FakeLaunchers implements RunMinigameLaunchers {
  hatchingDone: ((result: HatchResult | null) => void) | null = null;
  quizDone: (() => void) | null = null;
  hatchingRuns = 0;
  hatchingFitness: number[] = [];
  quizRuns = 0;

  playHatching(fitness: number, done: (result: HatchResult | null) => void) {
    this.hatchingRuns++;
    this.hatchingFitness.push(fitness);
    this.hatchingDone = done;
  }
  playQuiz(done: () => void) { this.quizRuns++; this.quizDone = done; }
}

const species = { name: 'Sparrow', traits: MEDIUM_BIRD };
const HATCH: HatchResult = { hatchRate: 1, eggs: 20, hatched: 20, birthMultiplier: 1.5 };

function setup(options: {
  only?: MidRunMinigameId;
  chance?: number;
  endAt?: number | null;
  seed?: number;
  withMinigames?: boolean;
  random?: () => number;
} = {}) {
  const host = new FakeHost();
  const game = GameController.startRun(species, options.seed ?? 2, new ScriptedScheduler([]), options.endAt ?? null);
  const launchers = new FakeLaunchers();
  const manager = new MinigameManager({
    chance: options.chance ?? 1,
    midRun: options.only ? [options.only] : undefined,
  });
  const callbacks = { onQuit: vi.fn(), onRestart: vi.fn() };
  const session = startGameSession(host as unknown as ScreenHost, game, {
    ...callbacks,
    ...(options.withMinigames === false ? {} : { minigames: launchers, manager, random: options.random }),
  });
  const gameScreen = host.current as GameScreenController;
  return { host, game, launchers, manager, session, gameScreen, callbacks };
}

/** Play one Extinction Prediction round and leave with "Back to your island". */
function playExtinctionRound(host: FakeHost, leave = true) {
  host.screen.submit(''); // intro
  for (let i = 0; i < 3; i++) host.screen.submit('1'); // rainfall, temperature, arrival
  host.screen.submit('1'); // run it
  host.screen.submit(''); // result
  expect(screenText(host.screen.spec())).toContain(`2. ${BACK_TO_ISLAND}`);
  host.screen.submit(leave ? '2' : '1');
}

describe('US8 Extinction Prediction during a run', () => {
  it('appears no earlier than generation 5 and returns to the same generation', () => {
    const { host, game, gameScreen, manager, session } = setup({ only: 'extinction' });
    try {
      for (let gen = 1; gen <= 4; gen++) {
        gameScreen.submit('1');
        expect(host.current).toBe(gameScreen);
      }
      gameScreen.submit('1');
      expect(game.state.generation).toBe(5);
      expect(host.current).toBeInstanceOf(ExtinctionScreenController);
      expect(manager.active).toBe('extinction');

      const before = structuredClone(game.state);
      playExtinctionRound(host);
      expect(host.current).toBe(gameScreen);
      expect(manager.active).toBeNull();
      expect(game.state).toEqual(before); // the run is untouched

      gameScreen.submit('1');
      expect(game.state.generation).toBe(6);
    } finally {
      session.dispose();
    }
  });

  it('can be replayed with "Try again" before going back to the island', () => {
    const { host, gameScreen, session } = setup({ only: 'extinction' });
    try {
      gameScreen.submit('2');
      const first = host.current;
      playExtinctionRound(host, false);
      expect(host.current).toBeInstanceOf(ExtinctionScreenController);
      expect(host.current).not.toBe(first);
      playExtinctionRound(host);
      expect(host.current).toBe(gameScreen);
    } finally {
      session.dispose();
    }
  });

  it('does not change how the simulation plays out', () => {
    const control = setup({ withMinigames: false, seed: 9 });
    const played = setup({ only: 'extinction', seed: 9 });
    try {
      played.gameScreen.submit('2');
      playExtinctionRound(played.host);
      control.gameScreen.submit('2');
      for (let i = 0; i < 4; i++) {
        played.gameScreen.submit('1');
        control.gameScreen.submit('1');
      }
      expect(played.game.state.generation).toBe(9);
      expect(played.game.state).toEqual(control.game.state);
    } finally {
      control.session.dispose();
      played.session.dispose();
    }
  });
});

describe('US10 Hatching Rhythm during a run', () => {
  it('boosts hatching for the next generation only, then resumes', () => {
    const { host, game, gameScreen, launchers, session } = setup({ only: 'hatching' });
    const step = vi.spyOn(game, 'step');
    try {
      gameScreen.submit('2');
      expect(launchers.hatchingRuns).toBe(1);
      expect(host.current).toBe(gameScreen); // the DOM minigame covers it; the host is unchanged

      launchers.hatchingDone!(HATCH);
      expect(host.current).toBe(gameScreen);

      step.mockClear();
      gameScreen.submit('1');
      gameScreen.submit('1');
      expect(step.mock.calls.map(([options]) => options?.birthMultiplier)).toEqual([1.5, undefined]);
    } finally {
      session.dispose();
    }
  });

  it('sets the song difficulty from the fitness of a bird in the current flock', () => {
    const { game, gameScreen, launchers, session } = setup({ only: 'hatching', random: () => 0 });
    try {
      gameScreen.submit('2');
      const [first] = game.state.population.birds; // random() = 0 picks the first bird
      expect(launchers.hatchingFitness).toEqual([birdFitness(first.traits, game.state.environment)]);
    } finally {
      session.dispose();
    }
  });

  it('applies the bonus to the first generation of a "Skip 5" only', () => {
    const { game, gameScreen, launchers, session } = setup({ only: 'hatching' });
    const step = vi.spyOn(game, 'step');
    try {
      gameScreen.submit('2');
      launchers.hatchingDone!(HATCH);
      step.mockClear();
      gameScreen.submit('2'); // 6 to 10
      expect(step.mock.calls.map(([options]) => options?.birthMultiplier))
        .toEqual([1.5, undefined, undefined, undefined, undefined]);
    } finally {
      session.dispose();
    }
  });

  it('changes nothing when the player quits the song early', () => {
    const { game, gameScreen, launchers, session } = setup({ only: 'hatching' });
    const step = vi.spyOn(game, 'step');
    try {
      gameScreen.submit('2');
      launchers.hatchingDone!(null);
      step.mockClear();
      gameScreen.submit('1');
      expect(step.mock.calls[0][0]?.birthMultiplier).toBeUndefined();
    } finally {
      session.dispose();
    }
  });

  it('blocks a second minigame while one is open', () => {
    const { gameScreen, launchers, manager, session } = setup({ only: 'hatching' });
    try {
      gameScreen.submit('2');
      expect(manager.active).toBe('hatching');
      expect(manager.startMidRun(100)).toBeNull();
      expect(launchers.hatchingRuns).toBe(1);
      launchers.hatchingDone!(null);
      expect(manager.active).toBeNull();
    } finally {
      session.dispose();
    }
  });
});

describe('minigame timing in the run', () => {
  it('keeps 5 generations between minigames and never opens one over the evolution choice', async () => {
    const { host, game, gameScreen, launchers, session } = setup({ only: 'hatching' });
    try {
      gameScreen.submit('2'); // gen 5: minigame
      launchers.hatchingDone!(null);
      for (let gen = 6; gen <= 9; gen++) gameScreen.submit('1');
      expect(launchers.hatchingRuns).toBe(1);

      gameScreen.submit('1'); // gen 10: evolution choice comes first
      expect(game.state.generation).toBe(10);
      expect(host.evolutionView).not.toBeNull();
      expect(launchers.hatchingRuns).toBe(1);

      host.evolutionView!.handlers.selectTarget('long');
      host.evolutionView!.handlers.submit();
      await vi.waitFor(() => expect(host.current).toBe(gameScreen));

      gameScreen.submit('1'); // gen 11 is 6 after the last one
      expect(launchers.hatchingRuns).toBe(2);
    } finally {
      session.dispose();
    }
  });

  it('does not open a minigame when the random chance misses', () => {
    const { host, gameScreen, launchers, session } = setup({ chance: 0 });
    try {
      gameScreen.submit('2');
      gameScreen.submit('1');
      expect(host.current).toBe(gameScreen);
      expect(launchers.hatchingRuns).toBe(0);
    } finally {
      session.dispose();
    }
  });
});

describe('US9 quiz at the end of the run', () => {
  it('plays the quiz once the last generation is reached, then shows Game Over', () => {
    const { host, gameScreen, launchers, session } = setup({ endAt: 3 });
    try {
      gameScreen.submit('2');
      expect(launchers.quizRuns).toBe(1);
      expect(host.current).toBe(gameScreen);
      gameScreen.submit('1'); // keys are ignored while the quiz is up
      expect(launchers.quizRuns).toBe(1);

      launchers.quizDone!();
      expect(host.current).toBeInstanceOf(GameOverScreenController);
    } finally {
      session.dispose();
    }
  });

  it('plays the quiz after extinction too', () => {
    const start = GameController.startRun(species, 2, new ScriptedScheduler([]));
    const state = structuredClone(start.state);
    state.population.birds = state.population.birds.slice(0, 1);
    const game = GameController.resume(state, new ScriptedScheduler([]));
    const host = new FakeHost();
    const launchers = new FakeLaunchers();
    const session = startGameSession(host as unknown as ScreenHost, game, {
      onQuit: vi.fn(), onRestart: vi.fn(), minigames: launchers,
    });
    try {
      host.screen.submit('1');
      expect(game.isOver).toBe(true);
      expect(launchers.quizRuns).toBe(1);
      launchers.quizDone!();
      expect(host.current).toBeInstanceOf(GameOverScreenController);
    } finally {
      session.dispose();
    }
  });

  it('skips the quiz when the player quits', () => {
    const { host, gameScreen, launchers, session } = setup();
    try {
      gameScreen.submit('3');
      gameScreen.submit('1');
      expect(launchers.quizRuns).toBe(0);
      expect(host.current).toBeInstanceOf(GameOverScreenController);
    } finally {
      session.dispose();
    }
  });

  it('never opens a mid-run minigame on the final generation', () => {
    const { launchers, gameScreen, session } = setup({ endAt: 5, only: 'hatching' });
    try {
      gameScreen.submit('2');
      expect(launchers.hatchingRuns).toBe(0);
      expect(launchers.quizRuns).toBe(1);
    } finally {
      session.dispose();
    }
  });
});

describe('runs without minigames', () => {
  it('keeps the old flow when no launchers are given', () => {
    const { host, gameScreen, session } = setup({ withMinigames: false, endAt: 6 });
    try {
      gameScreen.submit('2');
      expect(host.current).toBe(gameScreen);
      gameScreen.submit('1');
      expect(host.current).toBeInstanceOf(GameOverScreenController);
    } finally {
      session.dispose();
    }
  });
});
