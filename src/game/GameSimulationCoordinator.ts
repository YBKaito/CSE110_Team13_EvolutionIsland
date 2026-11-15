import { EVENTS } from '../constants';
import type { GameController, StepOptions, StepOutcome } from './GameController';
import type { SimulationCoordinator } from '../screens/EvolutionScreen/SimulationCoordinator';
import type {
  EnvironmentUpdated, GenerationCompleted, PreferredTraits, SubmitResult, TraitFocusChoice,
} from '../types';
import { toEvolutionEnvironment, toEvolutionGeneration, toEvolutionPreferences } from './EvolutionAdapters';
import { Publisher } from './Publisher';

/** Connects the real US3/US4 simulation to US5 without changing the simulation rules. */
export class GameSimulationCoordinator implements SimulationCoordinator {
  readonly environment = new Publisher<EnvironmentUpdated>();
  readonly generations = new Publisher<GenerationCompleted>();
  readonly observationInterval = EVENTS.MILESTONE_EVERY;

  private paused = false;
  private ended = false;

  constructor(readonly game: GameController) {}

  getGeneration(): number { return this.game.state.generation; }
  isCheckpoint(generation: number): boolean {
    return generation > 0 && generation % this.observationInterval === 0;
  }
  isPaused(): boolean { return this.paused; }
  isEnded(): boolean { return this.ended || this.game.isOver; }
  pause(): void { this.paused = true; }
  endRun(): void { this.ended = true; this.paused = false; }

  /** Advance one generation, sending the matching environment update first. */
  step(options: StepOptions = {}): StepOutcome {
    if (this.isEnded()) throw new Error('The simulation has ended.');
    if (this.paused) throw new Error('Finish the evolution choice before continuing.');

    const outcome = this.game.step(options);
    const generation = outcome.result.generation;
    if (outcome.result.extinct) this.endRun();
    else if (this.isCheckpoint(generation)) this.pause();

    this.environment.publish({
      generation,
      state: toEvolutionEnvironment(this.game.state.environment),
    });
    this.generations.publish(toEvolutionGeneration(outcome));
    return outcome;
  }

  /** Same stopping rules as GameController.advance(), plus the checkpoint pause. */
  advance(count: number, options: StepOptions = {}): StepOutcome[] {
    const outcomes: StepOutcome[] = [];
    for (let i = 0; i < count && !this.isEnded() && !this.paused; i++) {
      const outcome = this.step(options);
      outcomes.push(outcome);
      if (outcome.pauses.length > 0) break;
    }
    return outcomes;
  }

  /** US5 sends the full profile; only the selected trait should have changed. */
  async submitTraitFocus(choice: TraitFocusChoice, profile: PreferredTraits): Promise<SubmitResult> {
    if (this.isEnded()) return { ok: false, error: 'The simulation has ended.' };
    if (!this.paused || !this.isCheckpoint(this.getGeneration())) {
      return { ok: false, error: 'The simulation is not waiting for an evolution choice.' };
    }

    const current = toEvolutionPreferences(this.game.state);
    for (const key of Object.keys(current) as (keyof PreferredTraits)[]) {
      if (profile[key] !== (key === choice.traitKey ? choice.targetValue : current[key])) {
        return { ok: false, error: 'The submitted preferences do not match the current choice.' };
      }
    }

    try {
      this.game.applyEvolutionChoice(choice);
      this.paused = false;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not save choice.' };
    }
  }

  /** Remove subscriptions when a run is permanently abandoned. */
  dispose(): void {
    this.endRun();
    this.environment.clear();
    this.generations.clear();
  }
}
