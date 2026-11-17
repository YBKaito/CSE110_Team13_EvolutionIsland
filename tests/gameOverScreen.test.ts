import { describe, expect, it, vi } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import type { StartingSpecies } from '../src/models/GameState';
import { GameOverScreenController } from '../src/screens/GameOverScreen/GameOverScreenController';
import { gameOverScreenSpec } from '../src/screens/GameOverScreen/GameOverScreenView';
import type { Block, ScreenSpec } from '../src/screens/ui/screenSpec';
import { TRAIT_OPTIONS } from '../src/simulation/traitContent';
import { MEDIUM_BIRD } from './helpers/fixtures';
import { FakeNavigator } from './helpers/screens';

const species: StartingSpecies = { name: 'Sparrow', traits: MEDIUM_BIRD };

function lineChart(spec: ScreenSpec): Extract<Block, { kind: 'lineChart' }> {
  const chart = spec.blocks.find((block): block is Extract<Block, { kind: 'lineChart' }> => block.kind === 'lineChart');
  if (!chart) throw new Error('Expected the Game Over screen to contain its trait-history graph.');
  return chart;
}

describe('Game Over screen', () => {
  it('keeps the red Game Over heading and describes a quit without claiming extinction', () => {
    const game = GameController.startRun(species, 2, new ScriptedScheduler([]));
    const state = structuredClone(game.state);
    const nav = new FakeNavigator();
    const screen = new GameOverScreenController(nav, state, {
      onRestart: vi.fn(),
      onReturnToMenu: vi.fn(),
      endReason: 'quit',
    });

    const spec = screen.spec();
    expect(spec.blocks.find(block => block.kind === 'text' && block.text === 'GAME OVER'))
      .toMatchObject({ color: 'error' });
    expect(spec.blocks).toContainEqual(expect.objectContaining({
      kind: 'text',
      text: 'You left the island while your flock was still alive.',
    }));
    expect(lineChart(spec).markers).toEqual([{ x: 0, label: 'QUIT G0', color: '#ff6b6b' }]);
    expect(state.population.birds.length).toBeGreaterThan(0);
  });

  it('shows recorded trait counts and updates graph selection with category and generation input', () => {
    const game = GameController.startRun(species, 2, new ScriptedScheduler([]));
    game.step();
    const nav = new FakeNavigator();
    const screen = new GameOverScreenController(nav, game.state, {
      onRestart: vi.fn(),
      onReturnToMenu: vi.fn(),
      endReason: 'preview',
    });

    const startingSpec = screen.spec();
    const startingChart = lineChart(startingSpec);
    expect(startingChart.selectedGeneration).toBe(0);
    expect(startingChart.sidePanel?.title).toBe('Generation 0');
    expect(startingChart.series.map(series => series.label)).toEqual(['Short', 'Medium', 'Long']);
    expect(startingChart.sidePanel?.counts.map(item => item.count))
      .toEqual(game.state.history.startingTraitCounts.beak);

    screen.submit('4');
    const colorChart = lineChart(screen.spec());
    expect(colorChart.series.map(series => series.label)).toEqual(
      TRAIT_OPTIONS.color.map(option => option.charAt(0).toUpperCase() + option.slice(1)),
    );
    expect(colorChart.series.flatMap(series => series.points.map(point => point.y)))
      .not.toEqual(startingChart.series.flatMap(series => series.points.map(point => point.y)));
    expect(colorChart.sidePanel?.counts.map(item => item.count))
      .toEqual(game.state.history.startingTraitCounts.color);

    expect(screen.handleKey('ArrowRight')).toBe(true);
    const nextGenerationChart = lineChart(screen.spec());
    const result = game.state.history.generations.find(item => item.generation === 1)!;
    expect(nextGenerationChart.selectedGeneration).toBe(1);
    expect(nextGenerationChart.sidePanel?.title).toBe('Generation 1');
    expect(nextGenerationChart.sidePanel?.introLines).toContain(`${result.population} birds alive`);
    if (result.population > 0) {
      expect(nextGenerationChart.sidePanel?.counts.map(item => item.count)).toEqual(result.traitCounts.color);
    }
  });

  it('places recorded event starts at their generation and shows context for that selection', () => {
    const game = GameController.startRun(
      species,
      2,
      new ScriptedScheduler([{ generation: 1, eventId: 'drought' }]),
    );
    game.step();

    const spec = gameOverScreenSpec(game.state, 'beak', 1, undefined, 'quit');
    const chart = lineChart(spec);
    expect(chart.eventMarkers).toEqual([{ x: 1, label: 'Drought' }]);
    expect(chart.sidePanel?.footerLines).toContain('Gen 1: Drought begins.');
  });
});
