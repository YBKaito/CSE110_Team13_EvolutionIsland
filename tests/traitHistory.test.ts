import { describe, expect, it } from 'vitest';
import type { EventLogEntry, GenerationResult, TraitName } from '../src/types';
import { TRAIT_OPTIONS } from '../src/simulation/traitContent';
import {
  buildTraitHistory,
  generationTicks,
  traitEventMarkers,
  traitSnapshotAt,
  traitTrendSummary,
} from '../src/screens/GameOverScreen/traitHistory';

function result(
  generation: number,
  population: number,
  traits: Record<TraitName, number[]>,
): GenerationResult {
  return {
    generation,
    startPopulation: 4,
    population,
    born: population,
    died: 4,
    deathsByCause: { starvation: 1, exposure: 1, predation: 1, disaster: 1 },
    traitCounts: traits,
    avgRisk: { starvation: 0, exposure: 0, predation: 0 },
    lowPopulation: false,
    extinct: population === 0,
  };
}

const counts = (beak: number[], color: number[], population: number): Record<TraitName, number[]> => ({
  beak,
  body: [population, 0, 0],
  feathers: [population, 0, 0],
  color,
});

describe('trait history data', () => {
  it('uses recorded counts and computes percentages, including the actual starting flock', () => {
    const graph = buildTraitHistory(
      [result(1, 4, counts([1, 2, 1], [0, 1, 2, 1], 4))],
      { beak: [2, 1, 1], body: [4, 0, 0], feathers: [4, 0, 0], color: [1, 1, 1, 1] },
      4,
      2,
      'beak',
    );

    expect(graph.series.map(item => item.option)).toEqual(TRAIT_OPTIONS.beak);
    expect(graph.series[0].points).toEqual([
      { generation: 0, percentage: 50 },
      { generation: 1, percentage: 25 },
    ]);
    expect(graph.series[1].points[1].percentage).toBe(50);
    expect(graph.xMax).toBe(2);
  });

  it('maps each trait category to its canonical option order', () => {
    for (const trait of Object.keys(TRAIT_OPTIONS) as TraitName[]) {
      const graph = buildTraitHistory([], {}, 0, 1, trait);
      expect(graph.series.map(item => item.option)).toEqual(TRAIT_OPTIONS[trait]);
    }
  });

  it('omits zero-population generations instead of plotting fake zero percentages', () => {
    const graph = buildTraitHistory(
      [
        result(1, 2, counts([1, 1, 0], [1, 1, 0, 0], 2)),
        result(2, 0, counts([0, 0, 0], [0, 0, 0, 0], 0)),
      ],
      { beak: [1, 2, 1] },
      4,
      2,
      'beak',
    );

    expect(graph.endingGeneration).toBe(2);
    for (const series of graph.series) {
      expect(series.points.map(point => point.generation)).toEqual([0, 1]);
      expect(series.points.every(point => Number.isFinite(point.percentage))).toBe(true);
    }
  });

  it('makes sensible ticks for short and long histories', () => {
    expect(generationTicks(1)).toEqual([0, 1]);
    const longTicks = generationTicks(5000);
    expect(longTicks[0]).toBe(0);
    expect(longTicks.at(-1)).toBe(5000);
    expect(longTicks.length).toBeLessThanOrEqual(7);
  });

  it('reports changed, unchanged, and tied option trends from initial and final valid flocks', () => {
    const generations = [
      result(1, 50, counts([24, 16, 10], [20, 15, 10, 5], 50)),
      result(2, 0, counts([0, 0, 0], [0, 0, 0, 0], 0)),
    ];
    const trend = traitTrendSummary(
      generations,
      { beak: [68, 14, 18] },
      100,
      'beak',
    )!;
    expect(trend.fromGeneration).toBe(0);
    expect(trend.toGeneration).toBe(1);
    expect(trend.increased).toHaveLength(2);
    expect(trend.increased.find(item => item.option === 'medium')).toMatchObject({ to: 32 });
    expect(trend.increased.find(item => item.option === 'medium')!.from).toBeCloseTo(14);
    expect(trend.increased.find(item => item.option === 'long')!.to).toBe(20);
    expect(trend.decreased.find(item => item.option === 'short')!.from).toBe(68);
    expect(trend.decreased.find(item => item.option === 'short')!.to).toBe(48);

    const unchanged = traitTrendSummary(
      [result(1, 4, counts([2, 1, 1], [1, 1, 1, 1], 4))],
      { beak: [2, 1, 1] },
      4,
      'beak',
    )!;
    expect(unchanged.unchanged).toBe(true);
    expect(unchanged.increased).toEqual([]);
    expect(unchanged.decreased).toEqual([]);

    const tied = traitTrendSummary(
      [result(1, 8, counts([2, 3, 3], [2, 2, 2, 2], 8))],
      { beak: [4, 2, 2] },
      8,
      'beak',
    )!;
    expect(tied.increased.map(item => item.option)).toEqual(['medium', 'long']);
    expect(tied.increased[0].to - tied.increased[0].from).toBeCloseTo(tied.increased[1].to - tied.increased[1].from);
  });

  it('keeps selected-generation percentages undefined for extinction', () => {
    const snapshot = traitSnapshotAt(
      [result(1, 0, counts([0, 0, 0], [0, 0, 0, 0], 0))],
      { beak: [2, 1, 1] },
      4,
      1,
      'beak',
    );
    expect(snapshot).toMatchObject({ generation: 1, population: 0, percentages: null });
  });

  it('never emits NaN or infinite values if historical counts are malformed', () => {
    const graph = buildTraitHistory(
      [result(1, 2, counts([Number.NaN, 1, 1], [1, 1, 0, 0], 2))],
      { beak: [Number.POSITIVE_INFINITY, 1, 1] },
      2,
      1,
      'beak',
    );
    const snapshot = traitSnapshotAt(
      [result(1, 2, counts([Number.NaN, 1, 1], [1, 1, 0, 0], 2))],
      { beak: [1, 1, 0] },
      2,
      1,
      'beak',
    );
    expect(graph.series.flatMap(series => series.points).every(point =>
      Number.isFinite(point.generation) && Number.isFinite(point.percentage))).toBe(true);
    expect(snapshot?.percentages).toBeNull();
  });

  it('marks only recorded event starts at their recorded generations', () => {
    const events: EventLogEntry[] = [
      { generation: 6, eventId: 'drought', eventName: 'Drought', kind: 'started', stage: 'warning', message: 'Drought begins.' },
      { generation: 7, eventId: 'drought', eventName: 'Drought', kind: 'stageChanged', stage: 'peak', message: 'Drought peaks.' },
      { generation: 9, eventId: 'newPredator', eventName: 'Predator', kind: 'started', stage: 'establishing', message: 'A predator arrives.' },
    ];
    expect(traitEventMarkers(events, 20)).toEqual([
      { generation: 6, eventName: 'Drought' },
      { generation: 9, eventName: 'Predator' },
    ]);
    expect(traitEventMarkers([], 20)).toEqual([]);
  });
});
