import { describe, expect, it, vi } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import type { GameState } from '../src/models/GameState';
import { EventScreenController } from '../src/screens/EventScreen/EventScreenController';
import { GameScreenController } from '../src/screens/GameScreen/GameScreenController';
import { generationScreenSpec, generationViewFromState } from '../src/screens/GameScreen/GameScreenView';
import { TRAIT_NAMES } from '../src/simulation/traitContent';
import { MEDIUM_BIRD } from './helpers/fixtures';
import { FakeNavigator, screenText } from './helpers/screens';

const species = { name: 'Sparrow', traits: MEDIUM_BIRD };

function setup(script: { generation: number; eventId: string }[] = [], seed = 1) {
  const nav = new FakeNavigator();
  const game = GameController.startRun(species, seed, new ScriptedScheduler(script));
  const options = { onQuit: vi.fn(), onRestart: vi.fn() };
  const screen = new GameScreenController(nav, game, options);
  nav.show(screen);
  return { nav, game, options, screen };
}

const lines = (screen: { spec(): Parameters<typeof screenText>[0] }) => screenText(screen.spec());

describe('generation screen content', () => {
  it('shows the starting flock before any generation runs', () => {
    const { screen } = setup();
    const text = lines(screen);
    expect(text[0]).toContain('Generation 0');
    expect(text[0]).toContain('Your flock: 80 birds');
    expect(text).toContain('Your flock has just arrived on the island.');
    expect(text).toEqual(expect.arrayContaining(['1. Next generation', '2. Skip 5 generations', '3. Quit']));
  });

  it('shows island conditions, the generation table, causes of death, and trait bars', () => {
    const { screen } = setup();
    screen.submit('1');
    const text = lines(screen);
    expect(text).toContain('Weather: | Rainfall - Normal | Temperature - Normal');
    expect(text).toContain('Food: | Soft plants - Normal | Small seeds - Normal | Hard seeds - Normal | Insects - Normal');
    expect(text).toContain('Habitat: | Trees and bushes - Normal | Predators - Moderate');
    expect(text).toContain('Adults | Died | Chicks born | Change');
    expect(text.some((l) => l.startsWith('Died from:'))).toBe(true);
    for (const label of ['Beak', 'Body', 'Feathers', 'Color']) {
      expect(text.some((l) => l.startsWith(`${label}:`))).toBe(true);
    }
  });

  it('reports numbers that match the simulation', () => {
    const { screen, game } = setup();
    screen.submit('1');
    const result = game.generationHistory().at(-1)!;
    const view = generationViewFromState(game.state);
    expect(view.stats!.adults).toBe(result.startPopulation);
    expect(view.stats!.chicks).toBe(result.born);
    expect(view.stats!.change).toBe(result.population - result.startPopulation);
    expect(view.stats!.died).toBe(Object.values(result.deathsByCause).reduce((a, b) => a + b, 0));
    for (const trait of TRAIT_NAMES) {
      expect(view.traitCounts[trait].reduce((a, b) => a + b, 0)).toBe(view.flock);
    }
  });

  it('warns when the flock is close to extinction', () => {
    const { game } = setup();
    game.step();
    const state: GameState = structuredClone(game.state);
    state.population.birds = state.population.birds.slice(0, 7);
    state.history.generations.at(-1)!.lowPopulation = true;
    const text = screenText(generationScreenSpec(generationViewFromState(state)));
    expect(text).toContain('Warning: Only 7 birds left. Your flock is close to extinction.');
  });
});

describe('generation screen input', () => {
  it('rejects invalid input with the mockup error message', () => {
    const { screen, nav, game } = setup();
    for (const input of ['', 'x', '4', '0']) {
      screen.submit(input);
      expect(screen.spec().prompt.error).toBe('Invalid. Type 1, 2, or 3.');
    }
    expect(game.state.generation).toBe(0);
    expect(nav.refreshes).toBe(4);
  });

  it('1 runs the next generation and clears any error', () => {
    const { screen, nav, game } = setup();
    screen.submit('x');
    screen.submit('1');
    expect(game.state.generation).toBe(1);
    expect(screen.spec().prompt.error).toBeUndefined();
    expect(nav.current).toBe(screen);
  });

  it('2 skips 5 generations when nothing happens', () => {
    const { screen, game } = setup();
    screen.submit('2');
    expect(game.state.generation).toBe(5);
  });

  it('2 stops early and shows the event card when an event starts', () => {
    const { screen, nav, game } = setup([{ generation: 3, eventId: 'drought' }]);
    screen.submit('2');
    expect(game.state.generation).toBe(3);
    expect(nav.current).toBeInstanceOf(EventScreenController);
    nav.current!.submit('2');
    expect(nav.current).toBe(screen);
  });

  it('3 asks for confirmation before quitting', () => {
    const { screen, options } = setup();
    screen.submit('3');
    expect(lines(screen)).toEqual(expect.arrayContaining(['Leave the island?', 'Your current run will not be saved.']));
    screen.submit('7');
    expect(screen.spec().prompt.error).toBe('Invalid. Type 1 or 2.');
    screen.submit('2');
    expect(lines(screen)[0]).toContain('Generation 0');
    screen.submit('3');
    screen.submit('1');
    expect(options.onQuit).toHaveBeenCalledOnce();
  });
});

describe('extinction', () => {
  it('shows that the flock died out and offers a new run', () => {
    const nav = new FakeNavigator();
    const start = GameController.startRun(species, 2, new ScriptedScheduler([]));
    start.step();
    const state: GameState = structuredClone(start.state);
    state.population.birds = state.population.birds.slice(0, 1);
    const game = GameController.resume(state, new ScriptedScheduler([]));
    const options = { onQuit: vi.fn(), onRestart: vi.fn() };
    const screen = new GameScreenController(nav, game, options);

    screen.submit('1');
    expect(game.isOver).toBe(true);
    expect(lines(screen)).toEqual(expect.arrayContaining(['Your flock died out at Generation 2.', '1. Start a new run']));

    screen.submit('2');
    expect(screen.spec().prompt.error).toBe('Invalid. Type 1.');
    screen.submit('1');
    expect(options.onRestart).toHaveBeenCalledOnce();
  });
});
