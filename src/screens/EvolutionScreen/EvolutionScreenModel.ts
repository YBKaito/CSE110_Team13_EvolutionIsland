import {
  copyEnvironment,
  copyTraitCounts,
  validateTraitCounts,
  validateEnvironmentState,
} from "../../stats";
import { DEFAULT_PREFERENCES, isValidAdjacentChoice } from "../../traits";
import type {
  DecisionRecord,
  EnvironmentState,
  EnvironmentUpdated,
  GenerationCompleted,
  GenerationResults,
  ObservationSnapshot,
  PreferredTraits,
  TraitFocusChoice,
} from "../../types";

/** US5 Model: read-only snapshots, statistics source, and player preference/history.
 * Neither genetics nor event rules live here.
 */
export class EvolutionScreenModel {
  private readonly environmentByGeneration = new Map<
    number,
    EnvironmentState
  >();
  private readonly resultsByGeneration = new Map<
    number,
    GenerationCompleted
  >();
  private readonly observations: ObservationSnapshot[] = [];
  private readonly decisions: DecisionRecord[] = [];
  private preferences: PreferredTraits;
  error: string | null = null;

  constructor(
    startingPopulation: number,
    initialCounts: GenerationCompleted["traitCounts"],
    initialEnvironment: EnvironmentState,
    preferences: PreferredTraits = DEFAULT_PREFERENCES
  ) {
    this.preferences = { ...preferences };
    const initialResults: GenerationResults = {
      eventList: [],
      populationDecline: 0,
      populationIncrease: 0,
      newPopulation: startingPopulation,
    };
    validateTraitCounts(initialCounts, startingPopulation);
    validateEnvironmentState(initialEnvironment);
    const initial: ObservationSnapshot = {
      generation: 0,
      results: initialResults,
      environment: copyEnvironment(initialEnvironment),
      traitCounts: copyTraitCounts(initialCounts),
    };
    this.observations.push(initial);
    this.environmentByGeneration.set(
      0,
      copyEnvironment(initialEnvironment)
    );
  }

  cacheEnvironment(update: EnvironmentUpdated): void {
    if (!Number.isInteger(update.generation) || update.generation <= 0)
      return;
    if (this.environmentByGeneration.has(update.generation)) return; // stale/duplicate update ignored
    validateEnvironmentState(update.state);
    this.environmentByGeneration.set(
      update.generation,
      copyEnvironment(update.state)
    );
  }

  recordGeneration(event: GenerationCompleted): boolean {
    if (!Number.isInteger(event.generation) || event.generation <= 0)
      return false;
    if (this.resultsByGeneration.has(event.generation)) return false;
    validateTraitCounts(event.traitCounts, event.results.newPopulation);
    this.resultsByGeneration.set(event.generation, {
      generation: event.generation,
      results: {
        ...event.results,
        eventList: [...event.results.eventList],
      },
      traitCounts: copyTraitCounts(event.traitCounts),
    });
    return true;
  }

  captureObservation(generation: number): ObservationSnapshot | null {
    const prior = this.observations.at(-1);
    if (prior && generation <= prior.generation) return null;
    const environment = this.environmentByGeneration.get(generation);
    const generationData = this.resultsByGeneration.get(generation);
    if (!environment || !generationData) return null; // don't combine mismatched generations
    const snapshot: ObservationSnapshot = {
      generation,
      results: {
        ...generationData.results,
        eventList: [...generationData.results.eventList],
      },
      environment: copyEnvironment(environment),
      traitCounts: copyTraitCounts(generationData.traitCounts),
    };
    this.observations.push(snapshot);
    // US5 needs history only at checkpoints. Retain observations but discard
    // intermediate publisher records so a long run does not grow caches forever.
    for (const g of this.environmentByGeneration.keys()) {
      if (g > 0 && g <= generation)
        this.environmentByGeneration.delete(g);
    }
    for (const g of this.resultsByGeneration.keys()) {
      if (g <= generation) this.resultsByGeneration.delete(g);
    }
    return this.cloneObservation(snapshot);
  }

  // Return defensive copies: UI/test code must not mutate checkpoint history.
  private cloneObservation(
    snapshot: ObservationSnapshot
  ): ObservationSnapshot {
    return {
      generation: snapshot.generation,
      results: {
        ...snapshot.results,
        eventList: [...snapshot.results.eventList],
      },
      environment: copyEnvironment(snapshot.environment),
      traitCounts: copyTraitCounts(snapshot.traitCounts),
    };
  }
  getObservations(): readonly ObservationSnapshot[] {
    return this.observations.map((snapshot) =>
      this.cloneObservation(snapshot)
    );
  }
  getCurrentObservation(): ObservationSnapshot {
    return this.cloneObservation(
      this.observations[this.observations.length - 1]
    );
  }
  getPreviousObservation(): ObservationSnapshot | null {
    const snapshot = this.observations.at(-2);
    return snapshot ? this.cloneObservation(snapshot) : null;
  }
  getDecisions(): readonly DecisionRecord[] {
    return this.decisions.map((d) => ({ ...d }));
  }
  getLastDecision(): DecisionRecord | null {
    const decision = this.decisions.at(-1);
    return decision ? { ...decision } : null;
  }
  getPreferences(): PreferredTraits {
    return { ...this.preferences };
  }
  hasEnvironment(generation: number): boolean {
    return this.environmentByGeneration.has(generation);
  }

  validateScreen(
    choice: TraitFocusChoice,
    checkpoint: number
  ): string | null {
    if (choice.generation !== checkpoint)
      return "Screen must match the current checkpoint.";
    if (this.decisions.some((d) => d.generation === checkpoint))
      return "A decision has already been recorded here.";
    if (!(choice.traitKey in this.preferences))
      return "Unknown trait category.";
    if (choice.fromValue !== this.preferences[choice.traitKey])
      return "Trait preference has changed.";
    if (
      !isValidAdjacentChoice(
        choice.traitKey,
        choice.fromValue,
        choice.targetValue
      )
    ) {
      return "Choose exactly one adjacent option. You cannot skip a level.";
    }
    // Deliberately NO check for whether targetValue occurs in the existing population.
    return null;
  }

  recordAcceptedScreen(choice: TraitFocusChoice): void {
    const error = this.validateScreen(
      choice,
      this.getCurrentObservation().generation
    );
    if (error) throw new Error(error);
    this.preferences = {
      ...this.preferences,
      [choice.traitKey]: choice.targetValue,
    };
    this.decisions.push({
      ...choice,
      populationAtDecision:
        this.getCurrentObservation().results.newPopulation,
    });
    this.error = null;
  }

  validateChoice(
    choice: TraitFocusChoice,
    checkpoint: number
  ): string | null {
    if (choice.generation !== checkpoint) {
      return "Choice must match the current checkpoint.";
    }

    if (this.decisions.some((d) => d.generation === checkpoint)) {
      return "A decision has already been recorded.";
    }

    if (choice.fromValue !== this.preferences[choice.traitKey]) {
      return "Trait preference has changed.";
    }

    if (
      !isValidAdjacentChoice(
        choice.traitKey,
        choice.fromValue,
        choice.targetValue
      )
    ) {
      return "Choose exactly one adjacent trait option.";
    }

    return null;
  }

  recordAcceptedChoice(choice: TraitFocusChoice): void {
    const error = this.validateChoice(
      choice,
      this.getCurrentObservation().generation
    );

    if (error) {
      throw new Error(error);
    }

    this.preferences = {
      ...this.preferences,
      [choice.traitKey]: choice.targetValue,
    };

    this.decisions.push({
      ...choice,
      populationAtDecision:
        this.getCurrentObservation().results.newPopulation,
    });

    this.error = null;
  }
}
