import type { EnvironmentUpdated, GenerationCompleted, PreferredTraits, SubmitResult, TraitFocusChoice } from '../../types';

export interface Subscribable<T> {
  subscribe(observer: (value: T) => void): () => void;
}

export interface SimulationCoordinator {
  readonly environment: Subscribable<EnvironmentUpdated>;
  readonly generations: Subscribable<GenerationCompleted>;
  readonly observationInterval: number;
  getGeneration(): number;
  isCheckpoint(generation: number): boolean;
  isPaused(): boolean;
  isEnded(): boolean;
  pause(): void;
  endRun(): void;
  submitTraitFocus(choice: TraitFocusChoice, profile: PreferredTraits): Promise<SubmitResult>;
}
