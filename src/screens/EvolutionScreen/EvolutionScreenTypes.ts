import type { EvolutionScreenModel } from './EvolutionScreenModel';
import type { TraitKey } from '../../types';

/** The US5 interface has exactly three pages. */
export type EvolutionScreenPage = 'choice' | 'stats' | 'decisions';

export interface EvolutionScreenViewHandlers {
  openPage(page: EvolutionScreenPage): void;
  back(): void;
  selectTrait(trait: TraitKey): void;
  selectTarget(target: string): void;
  submit(): void;
}

export interface EvolutionScreenRenderState {
  model: EvolutionScreenModel;
  generation: number;
  interval: number;
  page: EvolutionScreenPage;
  selectedTrait: TraitKey;
  selectedTarget: string | null;
  submitting: boolean;
}
