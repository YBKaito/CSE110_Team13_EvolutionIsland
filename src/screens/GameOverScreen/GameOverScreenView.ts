import type { GameState } from '../../models/GameState';
import { DEATH_CAUSES, type DeathCause, type TraitName } from '../../types';
import { DEATH_LABELS } from '../format';
import { gap, text, type ScreenSpec } from '../ui/screenSpec';
import {
  buildTraitHistory,
  traitEventMarkers,
  traitEventsAtGeneration,
  traitSnapshotAt,
  traitTrendSummary,
} from './traitHistory';
import { simulationTraitLabel } from '../../traits';

const TRAIT_ORDER: TraitName[] = ['beak', 'body', 'feathers', 'color'];

export type GameOverEndReason = 'extinction' | 'preview' | 'quit';

export interface GameOverView {
  speciesName: string;
  generationsSurvived: number;
  endingGeneration: number;
  finalPopulation: number;
  endReason: GameOverEndReason;
  recap: string;
}

function summarizeDeaths(causes: Record<DeathCause, number>): string {
  const observed = DEATH_CAUSES
    .filter(cause => causes[cause] > 0)
    .map(cause => `${DEATH_LABELS[cause]} ${causes[cause]}`);
  return observed.length > 0
    ? `Last generation deaths: ${observed.join(', ')}.`
    : 'No deaths were recorded by cause in the last generation.';
}

export function gameOverViewFromState(
  state: Readonly<GameState>,
  endReason: GameOverEndReason = state.population.birds.length > 0 ? 'preview' : 'extinction',
): GameOverView {
  const endingGeneration = state.generation;
  const finalPopulation = state.population.birds.length;
  return {
    speciesName: state.species.name,
    generationsSurvived: endingGeneration,
    endingGeneration,
    finalPopulation,
    endReason,
    recap: endReason === 'extinction'
      ? 'Your flock has gone extinct.'
      : endReason === 'quit'
        ? 'You left the island while your flock was still alive.'
        : 'Preview complete. Your flock is still alive.',
  };
}

function trendLines(
  state: Readonly<GameState>,
  selectedTrait: TraitName,
  selectedGeneration: number,
): string[] {
  const trend = traitTrendSummary(
    state.history.generations,
    state.history.startingTraitCounts,
    state.history.startingPopulation,
    selectedTrait,
    selectedGeneration,
  );
  if (!trend || trend.unchanged) return [];
  return [
    ...trend.increased.map(item => `↑ ${item.option.charAt(0).toUpperCase()}${item.option.slice(1)}: More common`),
    ...trend.decreased.map(item => `↓ ${item.option.charAt(0).toUpperCase()}${item.option.slice(1)}: Less common`),
  ];
}

export function gameOverScreenSpec(
  state: Readonly<GameState>,
  selectedTrait: TraitName,
  selectedGeneration: number = 0,
  error?: string,
  endReason?: GameOverEndReason,
): ScreenSpec {
  const view = gameOverViewFromState(state, endReason);
  const startingPopulation = state.history.startingPopulation;
  const graph = buildTraitHistory(
    state.history.generations,
    state.history.startingTraitCounts,
    startingPopulation,
    view.endingGeneration,
    selectedTrait,
  );
  const selected = traitSnapshotAt(
    state.history.generations,
    state.history.startingTraitCounts,
    startingPopulation,
    selectedGeneration,
    selectedTrait,
  );
  const selectedEvents = traitEventsAtGeneration(state.history.events, selectedGeneration);
  const eventLine = selectedEvents.length > 0
    ? `Gen ${selectedGeneration}: ${selectedEvents.join(', ')} begins.`
    : null;
  const endingResult = state.history.generations.find(item => item.generation === view.endingGeneration);
  const deathContext = view.endReason === 'extinction' && selectedGeneration === view.endingGeneration && endingResult
    ? summarizeDeaths(endingResult.deathsByCause)
    : null;

  const seriesColors = new Map(graph.series.map(series => [series.option, series.color]));
  const countBars = selected?.counts?.map(item => ({
    label: `${item.option.charAt(0).toUpperCase()}${item.option.slice(1)}`,
    count: item.count,
    total: selected.population,
    color: seriesColors.get(item.option) ?? '#ffffff',
  })) ?? [];
  const selectedTrends = selected?.percentages
    ? trendLines(state, selectedTrait, selectedGeneration)
    : [];
  const eventLines = [
    ...(eventLine ? [eventLine] : []),
    ...(deathContext ? [deathContext] : []),
  ];
  const footerLines = [
    'Compared to the start',
    ...(selected?.percentages
      ? (selectedTrends.length > 0 ? selectedTrends : ['No options changed in frequency.'])
      : ['No comparison available for this generation.']),
  ];

  const traitChoices = `1 ${simulationTraitLabel('beak', 'shortLabel')}   2 ${simulationTraitLabel('body', 'shortLabel')}   3 ${simulationTraitLabel('feathers', 'shortLabel')}   4 ${simulationTraitLabel('color', 'shortLabel')}   |   LEFT/RIGHT: Explore generations`;

  return {
    blocks: [
      text('GAME OVER', {
        size: 'title', bold: true, color: 'error', align: 'center',
      }),
      gap(2),
      text(`Species: ${view.speciesName}`, { size: 'heading', align: 'center' }),
      text(view.recap, { size: 'body', color: view.endReason === 'extinction' ? 'normal' : 'success', align: 'center' }),
      {
        kind: 'statCards',
        width: 720,
        height: 68,
        items: [
          { value: String(view.generationsSurvived), label: 'Generations survived' },
          { value: String(view.finalPopulation), label: 'Birds remaining', color: view.finalPopulation > 0 ? '#55d6be' : '#ff6b6b' },
        ],
      },
      gap(3),
      text(`FIELD JOURNAL - ${simulationTraitLabel(selectedTrait)}`, { size: 'heading', align: 'center' }),
      text(traitChoices, {
        size: 'small', color: 'muted', align: 'center',
      }),
      {
        kind: 'lineChart',
        xLabel: 'Generation',
        yLabel: 'Flock with trait (%)',
        width: 1080,
        height: 292,
        xMax: graph.xMax,
        xTicks: graph.xTicks,
        yTicks: [0, 20, 40, 60, 80, 100],
        selectedGeneration,
        markers: [{
          x: graph.endingGeneration,
          label: view.endReason === 'extinction'
            ? `EXTINCT G${graph.endingGeneration}`
            : view.endReason === 'quit'
              ? `QUIT G${graph.endingGeneration}`
              : `PREVIEW G${graph.endingGeneration}`,
          color: '#ff6b6b',
        }],
        eventMarkers: traitEventMarkers(state.history.events, view.endingGeneration)
          .map(marker => ({ x: marker.generation, label: marker.eventName })),
        series: graph.series.map(series => ({
          label: series.option.charAt(0).toUpperCase() + series.option.slice(1),
          color: series.color,
          points: series.points.map(point => ({ x: point.generation, y: point.percentage })),
        })),
        sidePanel: {
          title: `Generation ${selectedGeneration}`,
          introLines: [selected ? `${selected.population} birds alive` : 'No recorded data for this generation.'],
          countHeading: countBars.length > 0 ? `${simulationTraitLabel(selectedTrait)} counts` : 'No trait counts to show',
          counts: countBars,
          footerLines: [...eventLines, ...footerLines],
          footerDividerAfter: eventLines.length > 0 ? eventLines.length : undefined,
        },
      },
      gap(5),
      {
        kind: 'table',
        columns: ['5. Start a New Flock', '6. Main Menu'],
        rows: [],
        columnWidths: [440, 440],
        bordered: true,
        headerBold: false,
        align: 'center',
        size: 'body',
      },
    ],
    prompt: { mode: 'choice', label: 'Choose 1–6: ', error, size: 'small' },
  };
}

export const GAME_OVER_TRAITS = TRAIT_ORDER;
