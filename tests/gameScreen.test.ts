import { describe, expect, it, vi } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GAME_OVER_PREVIEW_GENERATION, GameController } from '../src/game/GameController';
import type { GameState } from '../src/models/GameState';
import { EventScreenController } from '../src/screens/EventScreen/EventScreenController';
import { GameOverScreenController } from '../src/screens/GameOverScreen/GameOverScreenController';
import { GameScreenController } from '../src/screens/GameScreen/GameScreenController';
import { generationScreenSpec, generationViewFromState } from '../src/screens/GameScreen/GameScreenView';
import { TRAIT_NAMES } from '../src/simulation/traitContent';
import { MEDIUM_BIRD } from './helpers/fixtures';
import { FakeNavigator, screenText } from './helpers/screens';

const species = { name: 'Sparrow', traits: MEDIUM_BIRD };

function setup(
  script: { generation: number; eventId: string }[] = [],
  seed = 1,
  previewEndGeneration: number | null = null,
) {
  const nav = new FakeNavigator();
  const game = GameController.startRun(species, seed, new ScriptedScheduler(script), previewEndGeneration);
  const options = { onQuit: vi.fn(), onRestart: vi.fn() };
  const screen = new GameScreenController(nav, game, options);
  nav.show(screen);
  return { nav, game, options, screen };
}

const lines = (screen: { spec(): Parameters<typeof screenText>[0] }) => screenText(screen.spec());

describe('generation screen content', () => {
  it('shows the starting flock before any generation runs', () => {
    const { screen, game } = setup();
    const text = lines(screen);
    expect(text[0]).toContain('Generation 0');
    expect(text[0]).toContain('Your flock: 80 birds');
    expect(text).toContain('Your flock has just arrived on the island.');
    expect(text).toEqual(expect.arrayContaining(['1. Next generation', '2. Skip 5 generations', '3. Quit']));
    expect(game.state.history.startingTraitCounts.beak.reduce((sum, count) => sum + count, 0)).toBe(80);
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
  function setupOneBird(script: { generation: number; eventId: string }[] = []) {
    const nav = new FakeNavigator();
    const scheduler = new ScriptedScheduler(script);
    const start = GameController.startRun(species, 2, scheduler);
    const state: GameState = structuredClone(start.state);
    state.population.birds = state.population.birds.slice(0, 1);
    const game = GameController.resume(state, scheduler);
    const options = { onQuit: vi.fn(), onRestart: vi.fn() };
    const screen = new GameScreenController(nav, game, options);
    nav.show(screen);
    return { nav, game, options, screen };
  }

  it('Next Generation automatically opens the dedicated Game Over screen at extinction', () => {
    const { nav, game, screen } = setupOneBird();
    screen.submit('1');

    expect(game.isOver).toBe(true);
    expect(game.state.generation).toBe(1);
    expect(nav.current).toBeInstanceOf(GameOverScreenController);
    expect(screenText(nav.current!.spec())).toEqual(expect.arrayContaining([
      'GAME OVER',
      'Species: Sparrow',
      'Your flock has gone extinct.',
      '1 — Generations survived',
      '0 — Birds remaining',
      '5. START A NEW FLOCK       6. MAIN MENU',
    ]));
    const chart = nav.current!.spec().blocks.find(block => block.kind === 'lineChart');
    expect(chart?.kind === 'lineChart' && chart.markers?.[0]).toMatchObject({ x: 1, label: 'EXTINCT G1' });
    if (chart?.kind === 'lineChart') {
      expect(chart.series.every(series => series.points.every(point => point.x < 1))).toBe(true);
    }
  });

  it('Skip 5 stops immediately at extinction and opens Game Over', () => {
    const { nav, game, screen } = setupOneBird();
    screen.submit('2');

    expect(game.isOver).toBe(true);
    expect(game.state.generation).toBe(1);
    expect(nav.current).toBeInstanceOf(GameOverScreenController);
  });

  it('gives extinction priority when it lands on a milestone generation', () => {
    const scheduler = new ScriptedScheduler([]);
    const progressed = GameController.startRun(species, 8, scheduler);
    for (let generation = 0; generation < 9; generation++) progressed.step();
    const state: GameState = structuredClone(progressed.state);
    state.population.birds = state.population.birds.slice(0, 1);
    const game = GameController.resume(state, scheduler);
    const nav = new FakeNavigator();
    const screen = new GameScreenController(nav, game, { onQuit: vi.fn(), onRestart: vi.fn() });
    nav.show(screen);

    screen.submit('1');
    expect(game.state.generation).toBe(10);
    expect(game.isOver).toBe(true);
    expect(nav.current).toBeInstanceOf(GameOverScreenController);
  });

  it('shows final-generation event cards before Game Over, exactly once', () => {
    const { nav, game, screen } = setupOneBird([{ generation: 1, eventId: 'drought' }]);
    screen.submit('2');

    expect(game.isOver).toBe(true);
    expect(nav.current).toBeInstanceOf(EventScreenController);
    expect(nav.shown.filter(item => item instanceof GameOverScreenController)).toHaveLength(0);
    nav.current!.submit('2');
    expect(nav.current).toBeInstanceOf(GameOverScreenController);
    const gameOver = nav.current;
    nav.shown.find(item => item instanceof EventScreenController)!.submit('2');
    expect(nav.current).toBe(gameOver);
    expect(nav.shown.filter(item => item instanceof GameOverScreenController)).toHaveLength(1);
  });

  it('does not advance after extinction and routes restart and menu choices through callbacks', () => {
    const first = setupOneBird();
    first.screen.submit('1');
    const gameOver = first.nav.current!;
    expect(() => first.game.step()).toThrow(/extinct/);
    gameOver.submit('1'); // Switch the graph to body size; simulation remains ended.
    expect(first.game.state.generation).toBe(1);
    expect(first.nav.current).toBe(gameOver);
    gameOver.submit('5');
    expect(first.options.onRestart).toHaveBeenCalledOnce();

    const second = setupOneBird();
    second.screen.submit('1');
    second.nav.current!.submit('6');
    expect(second.options.onQuit).toHaveBeenCalledOnce();
  });

  it('switching trait categories changes the graph data and legend', () => {
    const { nav, screen } = setupOneBird();
    screen.submit('1');
    const gameOver = nav.current!;
    const initialChart = gameOver.spec().blocks.find(block => block.kind === 'lineChart');
    expect(initialChart?.kind === 'lineChart' && initialChart.series.map(series => series.label)).toEqual(['Short', 'Medium', 'Long']);

    gameOver.submit('2');
    const changedSpec = gameOver.spec();
    expect(screenText(changedSpec)).toContain('FIELD JOURNAL  •  Body size');
    const changedChart = changedSpec.blocks.find(block => block.kind === 'lineChart');
    expect(changedChart?.kind === 'lineChart' && changedChart.series.map(series => series.label)).toEqual(['Small', 'Medium', 'Large']);
  });

  it('summarizes recorded causes and final-generation events without assigning a definitive cause', () => {
    const { nav, screen } = setupOneBird([{ generation: 1, eventId: 'drought' }]);
    screen.submit('2');
    nav.current!.submit('2');
    const gameOver = nav.current!;
    expect(gameOver.handleKey?.('ArrowRight')).toBe(true);
    const spec = gameOver.spec();
    const text = screenText(spec);
    expect(text.some(line => line.includes('No deaths were recorded by cause in the last generation.'))).toBe(true);
    expect(text.some(line => line.startsWith('Gen 1 — Drought begins.'))).toBe(true);
    const chart = spec.blocks.find(block => block.kind === 'lineChart');
    expect(chart?.kind === 'lineChart' && chart.eventMarkers).toEqual([{ x: 1, label: 'Drought' }]);
    expect(text).toContain('Your flock has gone extinct.');
  });

  it('explores exact recorded generations with arrow keys and keeps selection in range', () => {
    const { nav, screen } = setupOneBird();
    screen.submit('1');
    const gameOver = nav.current!;

    expect(gameOver.handleKey?.('ArrowLeft')).toBe(true);
    expect(screenText(gameOver.spec()).some(line => line.startsWith('Gen 0  •'))).toBe(true);
    expect(gameOver.handleKey?.('ArrowRight')).toBe(true);
    const spec = gameOver.spec();
    expect(screenText(spec).some(line => line.startsWith('Gen 1  •  No living birds to measure.'))).toBe(true);
    const chart = spec.blocks.find(block => block.kind === 'lineChart');
    expect(chart?.kind === 'lineChart' && chart.selectedGeneration).toBe(1);
    expect(gameOver.handleKey?.('ArrowRight')).toBe(true);
    expect(screenText(gameOver.spec()).some(line => line.startsWith('Gen 1  •'))).toBe(true);
  });

  it('has no environmental event markers when the run recorded no events', () => {
    const { nav, screen } = setupOneBird();
    screen.submit('1');
    const chart = nav.current!.spec().blocks.find(block => block.kind === 'lineChart');
    expect(chart?.kind === 'lineChart' && chart.eventMarkers).toEqual([]);
    expect(screenText(nav.current!.spec()).some(line => line.includes('begins.'))).toBe(false);
  });
});

describe('temporary Generation 100 preview trigger', () => {
  it('automatically opens the preview Game Over screen at Gen 100 while birds remain alive', () => {
    const { nav, game, screen } = setup([], 1, GAME_OVER_PREVIEW_GENERATION);
    for (let generation = 0; generation < GAME_OVER_PREVIEW_GENERATION - 1; generation++) game.step();
    expect(game.isOver).toBe(false);

    screen.submit('1');

    expect(game.state.generation).toBe(GAME_OVER_PREVIEW_GENERATION);
    expect(game.isOver).toBe(true);
    expect(game.state.population.birds.length).toBeGreaterThan(0);
    expect(nav.current).toBeInstanceOf(GameOverScreenController);
    const spec = nav.current!.spec();
    expect(screenText(spec)).toContain('Preview mode: your flock is still alive.');
    expect(screenText(spec)).toContain(`${game.state.population.birds.length} — Birds remaining`);
    const chart = spec.blocks.find(block => block.kind === 'lineChart');
    expect(chart?.kind === 'lineChart' && chart.markers?.[0].label).toBe('PREVIEW G100');
  });
});
