import type { EnvironmentUpdated, GenerationCompleted, PreferredTraits, SubmitResult, TraitFocusChoice } from '../../types';

/**
 * Defines what the evolution choice screen needs from the simulation.
 */

/** Subscribe to updates. Call the returned function to stop listening. */
export interface Subscribable<T> {
  subscribe(observer: (value: T) => void): () => void;
}

export interface SimulationCoordinator {
  // Receive environment values tagged with the generation they belong to.
  readonly environment: Subscribable<EnvironmentUpdated>;
  
  // Receive population results after each generation finishes.
  readonly generations: Subscribable<GenerationCompleted>;

  // How often the player gets to observe and choose a trait.
  readonly observationInterval: number;

  getGeneration(): number;
  isCheckpoint(generation: number): boolean;
  isPaused(): boolean;
  isEnded(): boolean;
  pause(): void;
  endRun(): void;

  // Apply the new preference to future offspring and resume after it is accepted.
  submitTraitFocus(choice: TraitFocusChoice, profile: PreferredTraits): Promise<SubmitResult>;
}
