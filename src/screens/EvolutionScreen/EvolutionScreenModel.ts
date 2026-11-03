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

/**
 * This is where we keep the data for the evolution choice screen.
 * It saves the island conditions, population results, and previous choices.
 */
export class EvolutionScreenModel {
  // Temporary island updates keyed by generation number.
  // For example, generation 20 maps to the island conditions at generation 20.
  // We hold these until we can pair them with that generation's bird results.
  private readonly environmentByGeneration = new Map<
    number,
    EnvironmentState
  >();

  // Temporary population results keyed the same way.
  private readonly resultsByGeneration = new Map<
    number,
    GenerationCompleted
  >();

  // The full snapshots we keep at checkpoints (including generation 0).
  private readonly observations: ObservationSnapshot[] = [];

  // Every trait preference the player successfully submitted, in order.
  private readonly decisions: DecisionRecord[] = [];

  // The preferred option for EACH of the four traits.
  // This is the player's chosen breeding preference.
  private preferences: PreferredTraits;

  // Message shown in red when something goes wrong or a choice is invalid.
  // null means there's nothing to show.
  error: string | null = null;

  /**
   * Set up generation 0 before the simulation starts.
   */
  constructor(
    startingPopulation: number,
    initialCounts: GenerationCompleted["traitCounts"],
    initialEnvironment: EnvironmentState,
    preferences: PreferredTraits = DEFAULT_PREFERENCES
  ) {
    // Copy the starting preferences
    this.preferences = { ...preferences };
    const initialResults: GenerationResults = {
      eventList: [],
      populationDecline: 0,
      populationIncrease: 0,
      newPopulation: startingPopulation,
    };
    // Catch bad starting data: trait counts need to match the number of birds, and environment values have to stay in their allowed ranges.
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

  /** Save one environment update per generation. Ignore old or repeated updates. */
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

  /** Save the generation results. Return false if we already received them. */
  recordGeneration(event: GenerationCompleted): boolean {
    if (!Number.isInteger(event.generation) || event.generation <= 0)
      return false;
    if (this.resultsByGeneration.has(event.generation)) return false;
    validateTraitCounts(event.traitCounts, event.results.newPopulation);
    // Copy the event list and trait counts before saving them. 
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

  /** Save a checkpoint snapshot only when the environment and generation results are both ready. */
  captureObservation(generation: number): ObservationSnapshot | null {
    // The most recent saved checkpoint
    const prior = this.observations.at(-1);
    if (prior && generation <= prior.generation) return null;
    // The two updates must have the same generation number.
    // Otherwise we could show new bird stats with old environment stats.
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
    // Keep this checkpoint permanently in observation history.
    this.observations.push(snapshot);
    // Save full history only at checkpoints. Remove updates between checkpoints
    // so the cache does not keep growing during a long run.
    for (const g of this.environmentByGeneration.keys()) {
      if (g > 0 && g <= generation)
        this.environmentByGeneration.delete(g);
    }
    for (const g of this.resultsByGeneration.keys()) {
      if (g <= generation) this.resultsByGeneration.delete(g);
    }
    return this.cloneObservation(snapshot);
  }

  /** Return a copy so another part of the game cannot change saved history. */
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

  /** Get copies of all saved checkpoint snapshots. */
  getObservations(): readonly ObservationSnapshot[] {
    return this.observations.map((snapshot) =>
      this.cloneObservation(snapshot)
    );
  }
  /** Get the newest checkpoint (the one we're currently showing). */
  getCurrentObservation(): ObservationSnapshot {
    return this.cloneObservation(
      this.observations[this.observations.length - 1]
    );
  }

  /** Get the checkpoint before the current one, if there is one. */
  getPreviousObservation(): ObservationSnapshot | null {
    const snapshot = this.observations.at(-2);
    return snapshot ? this.cloneObservation(snapshot) : null;
  }

  /** Get a copy of every choice the player has made. */
  getDecisions(): readonly DecisionRecord[] {
    return this.decisions.map((d) => ({ ...d }));
  }

  /** Get the latest choice, if there is one. */
  getLastDecision(): DecisionRecord | null {
    const decision = this.decisions.at(-1);
    return decision ? { ...decision } : null;
  }

  /** Get the current preferred option for each trait. */
  getPreferences(): PreferredTraits {
    return { ...this.preferences };
  }

  /** Check whether we received the environment update for this generation. */
  hasEnvironment(generation: number): boolean {
    return this.environmentByGeneration.has(generation);
  }

  /**
   * Check whether a requested choice is actually allowed.
   * The generation must match the open checkpoint, we can't accept two choices at the same checkpoint, and the target must be ONE neighboring option from the currently saved preference.
   * Return an error message for the View, or null if everything looks good.
   */
  validateChoice(
    choice: TraitFocusChoice,
    checkpoint: number
  ): string | null {
    // The player should only be submitting for the generation that's paused.
    if (choice.generation !== checkpoint)
      return "Choice must match the current checkpoint.";
    // Each checkpoint gets one accepted change, so don't let it be saved twice.
    if (this.decisions.some((d) => d.generation === checkpoint))
      return "A decision has already been recorded here.";
    if (!(choice.traitKey in this.preferences))
      return "Unknown trait category.";
    // The choice must start from the current preference, not an outdated one.
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
    // A trait may be selected even if no birds currently have it.
    // The generation simulation handles how this trait appears in future offspring.
    return null;
  }

  /**
   * Record a successfully accepted trait choice and update the preferences.
   * We validate again in case anything changed while the request was pending.
   * This only changes the stored preference; it does not edit existing birds.
   */
  recordAcceptedChoice(choice: TraitFocusChoice): void {
    const error = this.validateChoice(
      choice,
      this.getCurrentObservation().generation
    );
    if (error) throw new Error(error);
    // Only replace the one selected trait; keep the other three as they were.
    this.preferences = {
      ...this.preferences,
      [choice.traitKey]: choice.targetValue,
    };
    // Save the flock size too, so the history can show what the population looked like when the player made this decision.
    this.decisions.push({
      ...choice,
      populationAtDecision:
        this.getCurrentObservation().results.newPopulation,
    });
    this.error = null;
  }
}
