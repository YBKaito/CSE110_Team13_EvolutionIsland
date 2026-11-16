import type { EventLogEntry, GenerationResult, TraitName } from '../../types';
import { TRAIT_OPTIONS } from '../../simulation/traitContent';

export const TRAIT_LABELS: Record<TraitName, string> = {
  beak: 'Beak length',
  body: 'Body size',
  feathers: 'Feather density',
  color: 'Color',
};

const SERIES_COLORS = ['#55d6be', '#ffd166', '#ef476f', '#7aa2ff'] as const;
const COLOR_SERIES_COLORS: Record<string, string> = {
  brown: '#d18b45',
  gray: '#aeb8c4',
  yellow: '#ffdf4d',
  white: '#f5f5f0',
};

export interface TraitHistoryPoint {
  generation: number;
  percentage: number;
}

export interface TraitHistorySeries {
  option: string;
  color: string;
  points: TraitHistoryPoint[];
}

export interface TraitHistoryGraph {
  trait: TraitName;
  traitLabel: string;
  xMax: number;
  xTicks: number[];
  endingGeneration: number;
  series: TraitHistorySeries[];
}

export type StartingTraitCounts = Partial<Record<TraitName, readonly number[]>>;

export interface TraitSnapshot {
  generation: number;
  population: number;
  counts: { option: string; count: number }[] | null;
  percentages: { option: string; percentage: number }[] | null;
}

export interface TraitFrequencyChange {
  option: string;
  from: number;
  to: number;
}

export interface TraitTrendSummary {
  fromGeneration: number;
  toGeneration: number;
  increased: TraitFrequencyChange[];
  decreased: TraitFrequencyChange[];
  unchanged: boolean;
}

export interface TraitEventMarker {
  generation: number;
  eventName: string;
}

/** Pick a readable 1/2/5 × power-of-ten tick interval, with at most six intervals. */
export function generationTicks(maxGeneration: number): number[] {
  const max = Math.max(1, Math.floor(maxGeneration));
  const roughStep = max / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let tick = 0; tick <= max; tick += step) ticks.push(Math.round(tick));
  if (ticks.at(-1) !== max) ticks.push(max);
  return [...new Set(ticks)];
}

/** Convert recorded trait counts into percentages. Zero-population generations are omitted. */
export function buildTraitHistory(
  generations: readonly GenerationResult[],
  startingTraitCounts: StartingTraitCounts,
  startingPopulation: number,
  endingGeneration: number,
  trait: TraitName,
): TraitHistoryGraph {
  const options = TRAIT_OPTIONS[trait];
  const series = options.map((option, optionIndex): TraitHistorySeries => ({
    option,
    color: trait === 'color'
      ? COLOR_SERIES_COLORS[option] ?? SERIES_COLORS[optionIndex % SERIES_COLORS.length]
      : SERIES_COLORS[optionIndex % SERIES_COLORS.length],
    points: [],
  }));

  if (Number.isFinite(startingPopulation) && startingPopulation > 0) {
    for (let i = 0; i < series.length; i++) {
      const count = startingTraitCounts[trait]?.[i];
      if (typeof count === 'number' && Number.isFinite(count)) {
        series[i].points.push({ generation: 0, percentage: (count / startingPopulation) * 100 });
      }
    }
  }

  for (const result of generations) {
    if (!Number.isFinite(result.population) || result.population <= 0) continue;
    for (let i = 0; i < series.length; i++) {
      const count = result.traitCounts[trait][i];
      if (Number.isFinite(count)) {
        series[i].points.push({ generation: result.generation, percentage: (count / result.population) * 100 });
      }
    }
  }

  const xMax = Math.max(1, endingGeneration, generations.at(-1)?.generation ?? 0);
  return {
    trait,
    traitLabel: TRAIT_LABELS[trait],
    xMax,
    xTicks: generationTicks(xMax),
    endingGeneration,
    series,
  };
}

/** Read the exact saved distribution for one generation. Missing and empty populations stay undefined. */
export function traitSnapshotAt(
  generations: readonly GenerationResult[],
  startingTraitCounts: StartingTraitCounts,
  startingPopulation: number,
  generation: number,
  trait: TraitName,
): TraitSnapshot | null {
  const options = TRAIT_OPTIONS[trait];
  let population: number;
  let counts: readonly number[] | undefined;

  if (generation === 0) {
    population = startingPopulation;
    counts = startingTraitCounts[trait];
  } else {
    const result = generations.find(item => item.generation === generation);
    if (!result) return null;
    population = result.population;
    counts = result.traitCounts[trait];
  }

  if (!Number.isFinite(population) || population <= 0 || !counts || options.some((_, index) =>
    typeof counts![index] !== 'number' || !Number.isFinite(counts![index]))) {
    return {
      generation,
      population: Number.isFinite(population) ? Math.max(0, population) : 0,
      counts: null,
      percentages: null,
    };
  }

  return {
    generation,
    population,
    counts: options.map((option, index) => ({ option, count: counts![index] })),
    percentages: options.map((option, index) => ({
      option,
      percentage: (counts![index] / population) * 100,
    })),
  };
}

/** Compare generation zero with the final generation that had a measurable population. */
export function traitTrendSummary(
  generations: readonly GenerationResult[],
  startingTraitCounts: StartingTraitCounts,
  startingPopulation: number,
  trait: TraitName,
  selectedGeneration?: number,
): TraitTrendSummary | null {
  const initial = traitSnapshotAt(generations, startingTraitCounts, startingPopulation, 0, trait);
  if (!initial?.percentages) return null;

  const finalResult = selectedGeneration === undefined
    ? [...generations].reverse().find(result => result.population > 0)
    : undefined;
  const targetGeneration = selectedGeneration ?? finalResult?.generation ?? initial.generation;
  const final = traitSnapshotAt(generations, startingTraitCounts, startingPopulation, targetGeneration, trait);
  if (!final?.percentages) return null;

  const increased: TraitFrequencyChange[] = [];
  const decreased: TraitFrequencyChange[] = [];
  initial.percentages.forEach((before, index) => {
    const after = final.percentages![index];
    const delta = after.percentage - before.percentage;
    const change = { option: before.option, from: before.percentage, to: after.percentage };
    if (delta > 0.01) increased.push(change);
    else if (delta < -0.01) decreased.push(change);
  });

  return {
    fromGeneration: initial.generation,
    toGeneration: final.generation,
    increased,
    decreased,
    unchanged: increased.length === 0 && decreased.length === 0,
  };
}

/** Only event starts become chart markers; stage transitions and aftermath are left in the journal. */
export function traitEventMarkers(
  events: readonly EventLogEntry[],
  endingGeneration: number,
): TraitEventMarker[] {
  const seen = new Set<string>();
  return events
    .filter(event => event.kind === 'started' && event.generation <= endingGeneration)
    .filter(event => {
      const key = `${event.generation}:${event.eventId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(event => ({ generation: event.generation, eventName: event.eventName }));
}

export function traitEventsAtGeneration(
  events: readonly EventLogEntry[],
  generation: number,
): string[] {
  return traitEventMarkers(events, generation)
    .filter(marker => marker.generation === generation)
    .map(marker => marker.eventName);
}

export function latestValidTraitGeneration(generations: readonly GenerationResult[]): number {
  return [...generations].reverse().find(result => result.population > 0)?.generation ?? 0;
}
