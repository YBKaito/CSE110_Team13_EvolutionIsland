import { ScreenController, type ScreenSwitcher } from '../ScreenController';
import type { SimulationCoordinator } from './SimulationCoordinator';
import { adjacentTargets, traitKeys, TRAITS } from '../../traits';
import type {
  EnvironmentUpdated, GenerationCompleted, TraitFocusChoice, TraitKey,
} from '../../types';
import type { EvolutionScreenPage } from './EvolutionScreenTypes';
import { EvolutionScreenModel } from './EvolutionScreenModel';
import { EvolutionScreenView } from './EvolutionScreenView';

/**
 * US5 controller: listens to US4/US3 updates and opens the choice screen at
 * every observation checkpoint. Stats and history are read-only subpages.
 * A confirmed choice changes the preference used for FUTURE offspring.
 */
export class EvolutionScreenController extends ScreenController {
  private readonly disposers: Array<() => void> = [];
  private disposed = false;
  private submitting = false;
  private page: EvolutionScreenPage = 'choice';
  private selectedTrait: TraitKey = 'beakLength';
  private selectedTarget: string | null = null;
  private shownCheckpoint: number | null = null;
  private lastCompleted = 0;

  constructor(
    readonly model: EvolutionScreenModel,
    private readonly view: EvolutionScreenView,
    private readonly coordinator: SimulationCoordinator,
    private readonly switcher: ScreenSwitcher,
  ) {
    super();
    this.view.bind({
      openPage: page => this.openPage(page),
      back: () => this.back(),
      selectTrait: trait => this.selectTrait(trait),
      selectTarget: target => this.selectTarget(target),
      submit: () => { void this.submitChoice(); },
    });
    this.disposers.push(
      coordinator.environment.subscribe(event => this.onEnvironmentUpdate(event)),
      coordinator.generations.subscribe(event => this.onGenerationComplete(event)),
    );
  }

  getView(): EvolutionScreenView { return this.view; }

  override show(): void {
    super.show();
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.onKeyDown);
    this.render();
  }

  override hide(): void {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.onKeyDown);
    super.hide();
  }

  private onEnvironmentUpdate(event: EnvironmentUpdated): void {
    if (this.disposed || event.generation <= this.lastCompleted) return;
    this.model.cacheEnvironment(event);
  }

  private onGenerationComplete(event: GenerationCompleted): void {
    if (this.disposed || event.generation <= this.lastCompleted) return;
    this.lastCompleted = event.generation;
    // Extinction ends the run, even when it occurs on a checkpoint.
    if (event.results.newPopulation === 0) {
      this.coordinator.endRun();
      this.switcher.switchToScreen({ type: 'result', score: 0 });
      return;
    }
    if (!this.coordinator.isCheckpoint(event.generation)) return;
    this.model.recordGeneration(event);
    this.coordinator.pause();
    if (!this.model.hasEnvironment(event.generation)) {
      this.model.error = `Missing environmental snapshot for Gen ${event.generation}.`;
      throw new Error(this.model.error);
    }
    if (!this.model.captureObservation(event.generation)) {
      throw new Error(`Could not capture checkpoint ${event.generation}`);
    }
    this.shownCheckpoint = event.generation;
    this.page = 'choice';
    this.selectedTrait = 'beakLength';
    this.selectedTarget = null;
    this.model.error = null;
    this.switcher.switchToScreen({ type: 'evolution-choice' });
  }

  private openPage(page: EvolutionScreenPage): void {
    if (this.disposed || this.submitting || this.shownCheckpoint === null) return;
    this.page = page;
    this.model.error = null;
    this.render();
  }

  private back(): void {
    if (this.disposed || this.submitting) return;
    if (this.page !== 'choice') this.page = 'choice';
    else this.selectedTarget = null;
    this.model.error = null;
    this.render();
  }

  private selectTrait(trait: TraitKey): void {
    if (this.disposed || this.submitting || !this.coordinator.isPaused() || this.page !== 'choice') return;
    if (!(trait in TRAITS)) return;
    this.selectedTrait = trait;
    this.selectedTarget = null;
    this.model.error = null;
    this.render();
  }

  private selectTarget(target: string): void {
    if (this.disposed || this.submitting || !this.coordinator.isPaused() || this.page !== 'choice') return;
    const current = this.model.getPreferences()[this.selectedTrait];
    if (!adjacentTargets(this.selectedTrait, current).includes(target)) {
      this.model.error = 'Choose one neighboring trait option.';
      this.render();
      return;
    }
    // Deliberately do not block variants with 0% frequency in the flock.
    this.selectedTarget = target;
    this.model.error = null;
    this.render();
  }

  async submitChoice(): Promise<void> {
    if (this.disposed || this.submitting || this.shownCheckpoint === null ||
        !this.coordinator.isPaused() || this.page !== 'choice') return;

    const choice: TraitFocusChoice = {
      generation: this.shownCheckpoint,
      traitKey: this.selectedTrait,
      fromValue: this.model.getPreferences()[this.selectedTrait],
      targetValue: this.selectedTarget ?? '',
    };
    const error = this.model.validateChoice(choice, this.coordinator.getGeneration());
    if (error) {
      this.model.error = error;
      this.render();
      return;
    }

    this.submitting = true;
    this.render();
    try {
      const profile = { ...this.model.getPreferences(), [choice.traitKey]: choice.targetValue };
      const result = await this.coordinator.submitTraitFocus(choice, profile);
      if (this.disposed) return;
      if (result.ok === false) {
        this.model.error = result.error;
        return;
      }
      this.model.recordAcceptedChoice(choice);
      this.shownCheckpoint = null;
      this.selectedTarget = null;
      this.page = 'choice';
      this.switcher.switchToScreen({ type: 'game' });
    } catch (err) {
      if (!this.disposed) {
        this.model.error = err instanceof Error ? err.message : 'Failed to save choice.';
      }
    } finally {
      this.submitting = false;
      if (!this.disposed) this.render();
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.disposed || this.submitting || this.shownCheckpoint === null || event.repeat) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (key === 'escape' || key === 'b') {
      event.preventDefault();
      this.back();
      return;
    }
    if (this.page === 'stats' || this.page === 'decisions') {
      if (key === 'enter' || key === '1') {
        event.preventDefault();
        this.back();
      }
      return;
    }
    // Choice screen: 1-4 choose a trait, 5/6 open the two other pages.
    if (key >= '1' && key <= '4') {
      event.preventDefault();
      this.selectTrait(traitKeys[Number(key) - 1]);
      return;
    }
    if (key === '5') { event.preventDefault(); this.openPage('stats'); return; }
    if (key === '6') { event.preventDefault(); this.openPage('decisions'); return; }
    if (key === 'arrowleft' || key === 'arrowright') {
      event.preventDefault();
      const current = this.model.getPreferences()[this.selectedTrait];
      const values = TRAITS[this.selectedTrait].options.map(o => o.id);
      const index = values.indexOf(current);
      const next = values[index + (key === 'arrowleft' ? -1 : 1)];
      if (next) this.selectTarget(next);
      return;
    }
    if (key === 's' || key === 'enter') {
      event.preventDefault();
      void this.submitChoice();
    }
  };

  /** Useful for automated tests or external buttons. */
  chooseTrait(trait: TraitKey): void { this.selectTrait(trait); }
  chooseTarget(target: string): void { this.selectTarget(target); }

  private render(): void {
    if (this.disposed || this.shownCheckpoint === null) return;
    this.view.render({
      model: this.model,
      generation: this.shownCheckpoint,
      interval: this.coordinator.observationInterval,
      page: this.page,
      selectedTrait: this.selectedTrait,
      selectedTarget: this.selectedTarget,
      submitting: this.submitting,
    });
  }

  /** Unsubscribe at run teardown, not when navigating to the game screen. */
  dispose(): void {
    if (this.disposed) return;
    this.hide();
    this.disposed = true;
    this.disposers.forEach(unsubscribe => unsubscribe());
    this.disposers.length = 0;
    this.view.bind({
      openPage: () => {}, back: () => {}, selectTrait: () => {},
      selectTarget: () => {}, submit: () => {},
    });
    this.view.getGroup().destroy();
  }
}
