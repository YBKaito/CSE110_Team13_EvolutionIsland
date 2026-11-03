import { Publisher } from '../events/Publisher';
import { copyTraitCounts, validateTraitCounts } from '../stats';
import { DEFAULT_PREFERENCES, TRAITS, traitKeys } from '../traits';
import type {
  EnvironmentState, GenerationCompleted, GenerationResults, PreferredTraits, TraitCounts, TraitKey
} from '../types';

/** A reproducible mock RNG, independent of UI code. */
class SeededRandom {
  constructor(private state: number) { this.state >>>= 0; }
  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
}

export interface MockGenerationOptions {
  seed?: number;
  initialPopulation?: number;
  /** For testing extinction routing; no fixed generation cap is imposed. */
  forceExtinctionAt?: number;
}

/** Mock US3: synthetic counts demonstrate integration, not a real fitness model.
 * Each generation samples independent trait marginals and applies a mild preferred-option
 * offspring weight. Real US3 must replace this inheritance/survival approximation.
 */
export class MockGenerationPublisher extends Publisher<GenerationCompleted> {
  private readonly rng: SeededRandom;
  private population: number;
  private lastGeneration = 0;
  private preferences: PreferredTraits = { ...DEFAULT_PREFERENCES };
  private counts: TraitCounts;
  private readonly forceExtinctionAt?: number;
  private readonly preferenceWeight = 1.25; // PROPOSED, not team-agreed
  private readonly variationChance = 0.025; // MOCK ONLY

  constructor(options: MockGenerationOptions = {}) {
    super();
    this.rng = new SeededRandom(options.seed ?? 6783);
    this.population = options.initialPopulation ?? 120;
    if (!Number.isInteger(this.population) || this.population < 0) throw new Error('Invalid initial population');
    this.forceExtinctionAt = options.forceExtinctionAt;
    this.counts = this.initialCounts(this.population);
  }

  private initialCounts(population: number): TraitCounts {
    const result = {} as TraitCounts;
    for (const key of traitKeys) {
      const options = TRAITS[key].options;
      const first = Math.floor(population * 0.18);
      const last = Math.floor(population * 0.14);
      result[key] = { [options[0].id]: first, [options[1].id]: population - first - last, [options[2].id]: last };
    }
    return result;
  }

  getInitialCounts(): TraitCounts { return copyTraitCounts(this.counts); }
  getPopulation(): number { return this.population; }
  getPreferences(): PreferredTraits { return { ...this.preferences }; }

  applyPreference(profile: PreferredTraits): void {
    for (const key of traitKeys) {
      if (!TRAITS[key].options.some(o => o.id === profile[key])) throw new Error(`Invalid ${key} preference`);
    }
    this.preferences = { ...profile };
  }

  private nextTraitCounts(key: TraitKey, population: number): Record<string, number> {
    const options = TRAITS[key].options;
    const oldTotal = Object.values(this.counts[key]).reduce((a, b) => a + b, 0);
    const weights = options.map(option => {
      const inherited = oldTotal === 0 ? 1 / options.length : (this.counts[key][option.id] ?? 0) / oldTotal;
      // Even zero-carrier options retain a small random-variation probability.
      const base = inherited * (1 - this.variationChance) + this.variationChance / options.length;
      return base * (option.id === this.preferences[key] ? this.preferenceWeight : 1);
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    const cumulative: number[] = [];
    let total = 0;
    for (const weight of weights) { total += weight / sum; cumulative.push(total); }
    const counts: Record<string, number> = Object.fromEntries(options.map(o => [o.id, 0]));
    for (let i = 0; i < population; i++) {
      const roll = this.rng.next();
      const index = cumulative.findIndex(p => roll < p);
      counts[options[index < 0 ? options.length - 1 : index].id]++;
    }
    return counts;
  }

  advance(generation: number, _environment: EnvironmentState, eventList: string[]): GenerationCompleted {
    if (generation !== this.lastGeneration + 1) throw new Error('US3 mock generations must be sequential');
    this.lastGeneration = generation;
    const previous = this.population;
    const pressure = eventList.length > 0 ? 1 : 0;
    const slowDecline = generation >= 35 ? 2 : 0;
    const delta = Math.floor(this.rng.next() * 12) - 5 - pressure - slowDecline;
    this.population = Math.max(0, previous + delta);
    if (this.forceExtinctionAt === generation) this.population = 0;
    for (const key of traitKeys) this.counts[key] = this.nextTraitCounts(key, this.population);
    validateTraitCounts(this.counts, this.population);
    const net = this.population - previous;
    const results: GenerationResults = {
      eventList: [...eventList],
      populationIncrease: Math.max(net, 0),
      populationDecline: Math.max(-net, 0),
      newPopulation: this.population
    };
    const event: GenerationCompleted = {
      generation, results, traitCounts: copyTraitCounts(this.counts)
    };
    this.publish(event);
    return event;
  }
}
