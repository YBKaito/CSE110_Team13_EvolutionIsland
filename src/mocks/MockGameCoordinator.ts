import type { PreferredTraits, SubmitResult, TraitFocusChoice } from '../types';
import { MockEnvironmentPublisher } from './MockEnvironmentPublisher';
import { MockGenerationPublisher } from './MockGenerationPublisher';

/** Thin mock coordinator: US4 publishes first, then US3, then US5 observes both.
 * In production the existing game coordinator should implement this contract.
 */
export class MockGameCoordinator {
  private generation = 0;
  private paused = false;
  private ended = false;
  private acceptedGeneration: number | null = null;
  readonly observationInterval: number;

  constructor(
    readonly environment: MockEnvironmentPublisher,
    readonly generations: MockGenerationPublisher,
    interval = 10
  ) {
    if (!Number.isInteger(interval) || interval < 1) throw new Error('Checkpoint interval must be positive');
    this.observationInterval = interval;
    if (generations.getPopulation() === 0) this.ended = true;
  }

  getGeneration(): number { return this.generation; }
  isPaused(): boolean { return this.paused; }
  isEnded(): boolean { return this.ended; }
  isCheckpoint(generation: number): boolean {
    return generation > 0 && generation % this.observationInterval === 0;
  }
  pause(): void {
    if (!this.ended && this.isCheckpoint(this.generation)) this.paused = true;
  }
  endRun(): void { this.ended = true; this.paused = false; }

  advanceOne(): boolean {
    if (this.paused || this.ended) return false;
    const generation = ++this.generation;
    const environment = this.environment.advance(generation); // Publishes EnvironmentUpdated(g)
    const results = this.generations.advance(generation, environment, this.environment.getEventList(generation));
    // GenerationCompleted(g) has already been published. Controller pauses synchronously.
    if (results.results.newPopulation === 0) this.endRun();
    return true;
  }

  advanceToNextCheckpoint(): void {
    if (this.paused || this.ended) return;
    const remaining = this.observationInterval - (this.generation % this.observationInterval);
    for (let i = 0; i < remaining && !this.paused && !this.ended; i++) this.advanceOne();
  }

  /** Simulates the coordinator accepting the command before resuming. */
  async submitTraitFocus(choice: TraitFocusChoice, profile: PreferredTraits): Promise<SubmitResult> {
    if (this.ended) return { ok: false, error: 'The flock is extinct.' };
    if (!this.paused || !this.isCheckpoint(this.generation)) {
      return { ok: false, error: 'Trait choices are only allowed at paused checkpoints.' };
    }
    if (choice.generation !== this.generation || this.acceptedGeneration === choice.generation) {
      return { ok: false, error: 'This checkpoint has already been completed or is no longer current.' };
    }
    try { this.generations.applyPreference(profile); }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Invalid preference' }; }
    this.acceptedGeneration = choice.generation;
    this.paused = false;
    return { ok: true };
  }
}
