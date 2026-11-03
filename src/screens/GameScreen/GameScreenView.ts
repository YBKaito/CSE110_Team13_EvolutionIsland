// What the generation screen shows (mockup p.15-17) and the quit confirmation (p.3).
// Pure functions: game state in, ScreenSpec out. The Konva renderer draws the result.

import type { GameState } from '../../models/GameState';
import { countTraits } from '../../simulation/Population';
import { TRAIT_NAMES, TRAIT_OPTIONS } from '../../simulation/traitContent';
import { DEATH_CAUSES, type TraitName } from '../../types';
import {
  amountLabel,
  capitalize,
  competitionLabel,
  DEATH_LABELS,
  predatorLabel,
  signed,
  temperatureLabel,
} from '../format';
import { CHOICE_PROMPT, gap, text, type Block, type ScreenSpec } from '../ui/screenSpec';

export const GENERATION_CHOICES = 3;
export const QUIT_CHOICES = 2;
export const EXTINCT_CHOICES = 1;

const TRAIT_LABELS: Record<TraitName, string> = { beak: 'Beak', body: 'Body', feathers: 'Feathers', color: 'Color' };

export interface GenerationView {
  generation: number;
  flock: number;
  /** Null before the first generation has been simulated. */
  stats: { adults: number; died: number; chicks: number; change: number; diedFrom: string } | null;
  /** Island conditions as rows of [label, entry, entry, ...], drawn as aligned columns. */
  islandRows: string[][];
  traitCounts: Record<TraitName, number[]>;
  lowPopulation: boolean;
  extinct: boolean;
}

export function generationViewFromState(state: Readonly<GameState>): GenerationView {
  const env = state.environment;
  const last = state.history.generations.at(-1);
  const flock = state.population.birds.length;

  const islandRows = [
    ['Weather:', `Rainfall - ${amountLabel(env.rainfall)}`, `Temperature - ${temperatureLabel(env.temperature)}`],
    [
      'Food:',
      `Soft plants - ${amountLabel(env.food.softPlants)}`,
      `Small seeds - ${amountLabel(env.food.smallSeeds)}`,
      `Hard seeds - ${amountLabel(env.food.hardSeeds)}`,
      `Insects - ${amountLabel(env.food.insects)}`,
    ],
    [
      'Habitat:',
      `Trees and bushes - ${amountLabel(env.cover)}`,
      `Predators - ${predatorLabel(env.predation)}`,
      ...(env.competition >= 1 ? [`Competing birds - ${competitionLabel(env.competition)}`] : []),
    ],
  ];

  let stats: GenerationView['stats'] = null;
  if (last) {
    const causes = DEATH_CAUSES.filter((c) => last.deathsByCause[c] > 0).map((c) => `${DEATH_LABELS[c]} ${last.deathsByCause[c]}`);
    stats = {
      adults: last.startPopulation,
      died: DEATH_CAUSES.reduce((sum, c) => sum + last.deathsByCause[c], 0),
      chicks: last.born,
      change: last.population - last.startPopulation,
      diedFrom: causes.length > 0 ? causes.join(', ') : 'none',
    };
  }

  return {
    generation: state.generation,
    flock,
    stats,
    islandRows,
    traitCounts: last ? last.traitCounts : countTraits(state.population.birds),
    lowPopulation: last?.lowPopulation ?? false,
    extinct: flock === 0,
  };
}

export function generationScreenSpec(view: GenerationView, error?: string): ScreenSpec {
  const blocks: Block[] = [
    text(`Generation ${view.generation}        Your flock: ${view.flock} birds`, { size: 'heading', bold: true }),
    gap(6),
    {
      kind: 'table',
      size: 'small',
      columns: view.islandRows[0],
      rows: view.islandRows.slice(1),
      columnWidths: [110, 260, 260, 250, 220],
    },
    gap(10),
  ];

  if (view.stats) {
    blocks.push(
      {
        kind: 'table',
        size: 'small',
        columns: ['Adults', 'Died', 'Chicks born', 'Change'],
        rows: [[String(view.stats.adults), String(view.stats.died), String(view.stats.chicks), signed(view.stats.change)]],
        columnWidths: [150, 120, 190, 140],
      },
      text(`Died from: ${view.stats.diedFrom}`, { size: 'small' }),
      gap(8),
    );
  } else {
    blocks.push(text('Your flock has just arrived on the island.', { size: 'small' }), gap(8));
  }

  if (view.extinct) {
    blocks.push(text(`Your flock died out at Generation ${view.generation}.`, { color: 'error' }), gap(8));
    blocks.push(text('You may:'), text('1. Start a new run', { indent: 16 }));
    return { blocks, prompt: { mode: 'choice', label: CHOICE_PROMPT, error } };
  }

  if (view.lowPopulation) {
    blocks.push(
      text(`Warning: Only ${view.flock} birds left. Your flock is close to extinction.`, { color: 'error' }),
      text('Check which traits are disappearing.', { size: 'small' }),
      gap(6),
    );
  }

  blocks.push(text('Birds with each trait:', { size: 'small' }));
  for (const trait of TRAIT_NAMES) {
    blocks.push({
      kind: 'bars',
      label: TRAIT_LABELS[trait],
      segments: TRAIT_OPTIONS[trait].map((option, i) => ({
        option: capitalize(option),
        count: view.traitCounts[trait][i],
        total: view.flock,
      })),
    });
  }

  blocks.push(
    gap(10),
    text('You may:'),
    text('1. Next generation', { indent: 16 }),
    text('2. Skip 5 generations', { indent: 16 }),
    text('3. Quit', { indent: 16 }),
  );
  return { blocks, prompt: { mode: 'choice', label: CHOICE_PROMPT, error } };
}

export function quitConfirmSpec(error?: string): ScreenSpec {
  return {
    blocks: [
      gap(120),
      text('Leave the island?', { size: 'heading' }),
      text('Your current run will not be saved.', { size: 'heading', color: 'error' }),
      text('1. Yes, quit', { size: 'heading', indent: 24 }),
      text('2. No, go back', { size: 'heading', indent: 24 }),
    ],
    prompt: { mode: 'choice', label: CHOICE_PROMPT, error, size: 'heading' },
  };
}
