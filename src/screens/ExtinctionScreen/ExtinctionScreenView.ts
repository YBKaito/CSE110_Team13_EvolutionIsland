import { CONDITIONS, type Scenario } from '../../minigames/ExtinctionPrediction/ExtinctionModel';
import type { StartingSpecies } from '../../models/GameState';
import { TRAIT_NAMES, TRAIT_OPTIONS } from '../../simulation/traitContent';
import type { TraitName } from '../../types';
import { capitalize } from '../format';
import { CHOICE_PROMPT, gap, text, type Block, type ScreenSpec } from '../ui/screenSpec';
import type { ResultView } from './ExtinctionExplanation';

export const SUMMARY_CHOICES = 2;
export const WHY_CHOICES = 2;

const TRAIT_LABELS: Record<TraitName, string> = { beak: 'Beak', body: 'Body', feathers: 'Feathers', color: 'Color' };

export function introSpec(species: StartingSpecies): ScreenSpec {
  return {
    blocks: [
      text('Extinction Prediction', { size: 'title', bold: true }),
      gap(10),
      text('Your job: make this species die out as fast as possible.'),
      gap(10),
      {
        kind: 'table',
        columns: ['Species:', species.name],
        rows: TRAIT_NAMES.map((t) => [`${TRAIT_LABELS[t]}:`, capitalize(TRAIT_OPTIONS[t][species.traits[t]])]),
        columnWidths: [220, 300],
      },
      gap(10),
      text(`Think about how each change to the island affects ${species.name}.`),
    ],
    prompt: { mode: 'enter', label: 'Press Enter to continue.' },
  };
}

export function conditionSpec(index: number, error?: string): ScreenSpec {
  const condition = CONDITIONS[index];
  return {
    blocks: [
      text(`Condition ${index + 1} of ${CONDITIONS.length}: ${condition.title}`, { size: 'heading', bold: true }),
      gap(12),
      ...condition.choices.map((choice, i) => text(`${i + 1}. ${choice.label}`, { indent: 16 })),
    ],
    prompt: { mode: 'choice', label: CHOICE_PROMPT, error },
  };
}

export function summarySpec(scenario: Scenario, error?: string): ScreenSpec {
  const [first, ...rest] = CONDITIONS.map((c) => [`${c.title}:`, c.choices[scenario[c.key]].label]);
  return {
    blocks: [
      text('Your island:'),
      { kind: 'table', columns: first, rows: rest, columnWidths: [300, 520] },
      gap(12),
      text('1. Run the simulation', { indent: 16 }),
      text('2. Change my choices', { indent: 16 }),
    ],
    prompt: { mode: 'choice', label: CHOICE_PROMPT, error },
  };
}

export function resultSpec(view: ResultView): ScreenSpec {
  const headline = view.extinctAt !== null
    ? `${view.speciesName} went extinct in ${view.extinctAt} generations.`
    : `${view.speciesName} survived all ${view.populations.length} generations.`;
  const fastest = view.fastestAt !== null
    ? `Fastest possible: ${view.fastestAt} generations.`
    : `No island could wipe out ${view.speciesName}.`;
  const total = view.populations[0];
  const rows: Block[] = view.populations.map((count, i) => ({
    kind: 'bars',
    label: `Gen ${i + 1}`,
    segments: [{ option: '', count, total }],
  }));
  return {
    blocks: [text(headline), text(fastest), gap(12), ...rows, gap(12)],
    prompt: { mode: 'enter', label: 'Press Enter to see why.' },
  };
}

//How the player's choices differ from the fastest extinction choices
export function whySpec(view: ResultView, error?: string): ScreenSpec {
  const lines = view.missed.length > 0
    ? view.missed
    : [view.matchedFastest || view.fastestAt === null
      ? 'You found the fastest way!'
      : 'Your choices were just as harsh. The dice made the difference.'];
  return {
    blocks: [
      text('What you missed:'),
      ...lines.map((line) => text(line, { indent: 16 })),
      gap(16),
      text('You may:'),
      text('1. Try again', { indent: 16 }),
      text('2. Back to minigames', { indent: 16 }),
    ],
    prompt: { mode: 'choice', label: CHOICE_PROMPT, error },
  };
}
