import { describe, expect, it, vi } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import { startGameSession } from '../src/game/startGameSession';
import type { ScreenController } from '../src/screens/ScreenController';
import { EventScreenController } from '../src/screens/EventScreen/EventScreenController';
import type { ScreenHost } from '../src/screens/ui/ScreenHost';
import type { Screen } from '../src/screens/ui/screenSpec';
import { MEDIUM_BIRD } from './helpers/fixtures';

// The real view uses Konva. These tests exercise its controller and the game
// with a stand-in view so no browser canvas is needed.
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

interface FakeEvolutionView {
  handlers: Record<string, (...args: any[]) => void>;
  rendered: any;
}

class FakeHost {
  current: Screen | ScreenController | null = null;
  evolutionView: FakeEvolutionView | null = null;

  show(screen: Screen | ScreenController) {
    if (this.current && 'getView' in this.current) this.current.hide();
    this.current = screen;
    if ('getView' in screen) {
      this.evolutionView = screen.getView() as unknown as FakeEvolutionView;
      screen.show();
    } else {
      this.evolutionView = null;
    }
  }
  refresh() {}
}

const species = { name: 'Sparrow', traits: MEDIUM_BIRD };

function setup(eventAtTen = false) {
  const host = new FakeHost();
  const events = eventAtTen ? [{ generation: 10, eventId: 'drought' }] : [];
  const game = GameController.startRun(species, 2, new ScriptedScheduler(events));
  const session = startGameSession(host as unknown as ScreenHost, game, {
    onQuit: vi.fn(), onRestart: vi.fn(),
  });
  const screen = host.current as Screen;
  return { host, game, session, screen };
}

describe('playable game checkpoints', () => {
  it('returns to gameplay after a trait choice and opens the same picker at generation 20', async () => {
    const { host, game, session, screen } = setup();
    try {
      screen.submit('2');
      expect(game.state.generation).toBe(5);
      expect(host.evolutionView).toBeNull();

      screen.submit('2');
      expect(game.state.generation).toBe(10);
      expect(host.evolutionView).not.toBeNull();
      expect(host.evolutionView!.rendered.model.getCurrentObservation().generation).toBe(10);

      host.evolutionView!.handlers.selectTarget('long');
      host.evolutionView!.handlers.submit();
      await vi.waitFor(() => expect(host.evolutionView).toBeNull());

      expect(game.state.favoredTraits.beak).toBe(2);
      expect(host.current).toBe(screen);
      screen.submit('1');
      expect(game.state.generation).toBe(11);

      screen.submit('2');
      screen.submit('2');
      expect(game.state.generation).toBe(20);
      expect(host.evolutionView).not.toBeNull();
      expect(host.evolutionView!.rendered.model.getObservations().map((o: { generation: number }) => o.generation))
        .toEqual([0, 10, 20]);
      expect(host.evolutionView!.rendered.model.getDecisions()).toHaveLength(1);
    } finally {
      session.dispose();
    }
  });

  it('shows the event card before switching to the evolution screen', () => {
    const { host, game, session, screen } = setup(true);
    try {
      screen.submit('2');
      screen.submit('2');
      expect(game.state.generation).toBe(10);
      expect(host.current).toBeInstanceOf(EventScreenController);
      expect(host.evolutionView).toBeNull();

      (host.current as Screen).submit('2');
      expect(host.evolutionView).not.toBeNull();
      expect(host.evolutionView!.rendered.generation).toBe(10);
    } finally {
      session.dispose();
    }
  });

  it('shows extinction and restart without opening an evolution choice', () => {
    const start = GameController.startRun(species, 2, new ScriptedScheduler([]));
    const state = structuredClone(start.state);
    state.population.birds = state.population.birds.slice(0, 1);
    const game = GameController.resume(state, new ScriptedScheduler([]));
    const host = new FakeHost();
    const session = startGameSession(host as unknown as ScreenHost, game, {
      onQuit: vi.fn(), onRestart: vi.fn(),
    });
    try {
      (host.current as Screen).submit('1');
      expect(game.isOver).toBe(true);
      expect(host.evolutionView).toBeNull();
      expect((host.current as Screen).spec().blocks.some(block =>
        block.kind === 'text' && block.text.includes('died out'))).toBe(true);
    } finally {
      session.dispose();
    }
  });
});
