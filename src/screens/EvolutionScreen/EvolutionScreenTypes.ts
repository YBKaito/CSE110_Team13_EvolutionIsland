import type { EvolutionScreenModel } from './EvolutionScreenModel';
import type { TraitKey } from '../../types';

/**
 * The three possible pages inside this one screen.
 * 'choice' is the main trait picker; 'stats' and 'decisions' are just for review.
 */
export type EvolutionScreenPage = 'choice' | 'stats' | 'decisions';

/** Actions the View sends to the Controller when the player clicks something. */
export interface EvolutionScreenViewHandlers {
  openPage(page: EvolutionScreenPage): void;
  back(): void;
  selectTrait(trait: TraitKey): void;
  selectTarget(target: string): void;
  submit(): void;
}

/** All of the information the Controller passes to the View for rendering. */
export interface EvolutionScreenRenderState {
  model: EvolutionScreenModel; // Current stats, previous snapshots, and preferences
  generation: number;
  interval: number; // Usually 10 generations
  page: EvolutionScreenPage;
  selectedTrait: TraitKey;
  selectedTarget: string | null; // Nothing selected yet when null
  submitting: boolean;
}
