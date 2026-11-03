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
 * This is the middle part of the evolution choice screen (the Controller).
 * It listens for environment and population updates, opens the screen every
 * observation checkpoint, and handles what the player clicks or types.
 */
export class EvolutionScreenController extends ScreenController {
  // Each subscribe() call gives us a function to unsubscribe later. These are saved here.
  private readonly disposers: Array<() => void> = [];

  /**
   * Turns true when we permanently clean up this controller.
   * An update or async request might finish later, so this stops us from changing a screen that's already been destroyed.
   */
  private disposed = false;

  /**
   * True while we're waiting for the simulation to accept a trait choice.
   * We use this to disable other inputs so someone can't submit twice.
   */
  private submitting = false;

  /**
   * Which of the three pages we're showing: choice, stats, or past choices.
   * This only affects the screen, not the simulation.
   */
  private page: EvolutionScreenPage = 'choice';

  /**
   * Which trait the player is looking at right now.
   * Beak length is selected by default whenever a checkpoint opens.
   */
  private selectedTrait: TraitKey = 'beakLength';

  /** The change option for the trait the player picked, or null if they haven't picked one. */
  private selectedTarget: string | null = null;

  /**
   * Generation currently waiting for a player choice.
   * null means there's no active checkpoint to submit for.
   */
  private shownCheckpoint: number | null = null;

  /**
   * The most recent generation result we've already processed.
   * This stops duplicate or older events from reopening the same checkpoint.
   */
  private lastCompleted = 0;

  /** Connect the view buttons and start listening for environment and generation updates. */
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
    /**
     * We still need environment and generation updates while this screen is hidden, otherwise we'd miss the next checkpoint. 
     * The returned functions are saved in disposers so we can unsubscribe when we're completely done.
     */
    this.disposers.push(
      coordinator.environment.subscribe(event => this.onEnvironmentUpdate(event)),
      coordinator.generations.subscribe(event => this.onGenerationComplete(event)),
    );
  }

  /** Return the Konva view used by the main screen switcher. */
  getView(): EvolutionScreenView { return this.view; }

  /** Show the screen and enable keyboard controls. */
  override show(): void {
    super.show();
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.onKeyDown);
    this.render();
  }

  /** Hide the screen and stop listening for keyboard input. */
  override hide(): void {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.onKeyDown);
    super.hide();
  }

  /** Save the latest environment update when the environment changes. */
  private onEnvironmentUpdate(event: EnvironmentUpdated): void {
    if (this.disposed || event.generation <= this.lastCompleted) return;
    this.model.cacheEnvironment(event);
  }

  /**
   * Called after a generation finishes simulating.
   * We first check for extinction, then see if this is an observation checkpoint.
   * At a checkpoint we pair the population results with the environment values from that SAME generation, pause the game, and open the choice screen.
   */
  private onGenerationComplete(event: GenerationCompleted): void {
    if (this.disposed || event.generation <= this.lastCompleted) return;
    // Mark this generation as handled before doing anything else, so a repeated notification can't open the screen or end the run twice.
    this.lastCompleted = event.generation;
    // No choice is shown at population 0.
    if (event.results.newPopulation === 0) {
      this.coordinator.endRun();
      this.switcher.switchToScreen({ type: 'result', score: 0 });
      return;
    }
    // Most generations just continue. We only ask the player to choose at configured intervals (10, 20, 30, 40, ... by default).
    if (!this.coordinator.isCheckpoint(event.generation)) return;
    // Pause before showing the choice screen so the game cannot skip a decision.
    this.model.recordGeneration(event);
    this.coordinator.pause();
    if (!this.model.hasEnvironment(event.generation)) {
      this.model.error = `Missing environmental snapshot for Gen ${event.generation}.`;
      throw new Error(this.model.error);
    }
    if (!this.model.captureObservation(event.generation)) {
      throw new Error(`Could not capture checkpoint ${event.generation}`);
    }
    // Reset any selections left over from the previous checkpoint.
    // The saved preferences still come from the Model; we're only clearing the temporary UI selection here.
    this.shownCheckpoint = event.generation;
    this.page = 'choice';
    this.selectedTrait = 'beakLength';
    this.selectedTarget = null;
    this.model.error = null;
    this.switcher.switchToScreen({ type: 'evolution-choice' });
  }

  /**
   * Switch between the choice, current stats, and previous choices pages.
   */
  private openPage(page: EvolutionScreenPage): void {
    if (this.disposed || this.submitting || this.shownCheckpoint === null) return;
    this.page = page;
    this.model.error = null;
    this.render();
  }

  /**
   * Go back to the main choice page. 
   * If we're already on it, pressing Back clears the option we picked but doesn't change the saved preference.
   */
  private back(): void {
    if (this.disposed || this.submitting) return;
    if (this.page !== 'choice') this.page = 'choice';
    else this.selectedTarget = null;
    this.model.error = null;
    this.render();
  }

  /** 
   * Pick which trait the player wants to adjust. 
   */
  private selectTrait(trait: TraitKey): void {
    if (this.disposed || this.submitting || !this.coordinator.isPaused() || this.page !== 'choice') return;
    if (!(trait in TRAITS)) return;
    this.selectedTrait = trait;
    this.selectedTarget = null;
    this.model.error = null;
    this.render();
  }

  /** 
   * Select one neighboring trait option. 
   */
  private selectTarget(target: string): void {
    if (this.disposed || this.submitting || !this.coordinator.isPaused() || this.page !== 'choice') return;
    // Check the options next to the CURRENT saved preference, not a previous click. 
    // A checkpoint only allows one step.
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

  /** 
   * Validate the choice, submit it for future offspring, and return to the game. 
   */
  async submitChoice(): Promise<void> {
    if (this.disposed || this.submitting || this.shownCheckpoint === null ||
      !this.coordinator.isPaused() || this.page !== 'choice') return;

    // Build a single object describing what changed and at which checkpoint.
    // An empty target will fail validation and show an error to the player.
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

    // Disable the picker right away. 
    // Otherwise two fast clicks could send the same request twice before the first one finishes.
    this.submitting = true;
    this.render();
    try {
      // Make a new preference object with only this trait changed.
      // We don't update the Model yet because the simulation might reject it.
      const profile = { ...this.model.getPreferences(), [choice.traitKey]: choice.targetValue };
      const result = await this.coordinator.submitTraitFocus(choice, profile);
      // The request might finish after the player leaves or the run ends.
      // In that case, don't touch the old Model or View.
      if (this.disposed) return;
      if (result.ok === false) {
        this.model.error = result.error;
        return;
      }
      // Only save the choice locally after the simulation confirms it.
      this.model.recordAcceptedChoice(choice);
      // There is no longer a pending choice for this generation.
      // Clear temporary selections before going back to gameplay.
      this.shownCheckpoint = null;
      this.selectedTarget = null;
      this.page = 'choice';
      this.switcher.switchToScreen({ type: 'game' });
    } catch (err) {
      // Covers unexpected errors
      if (!this.disposed) {
        this.model.error = err instanceof Error ? err.message : 'Failed to save choice.';
      }
    } finally {
      // This runs whether the submission succeeds, fails, or throws.
      // Make sure the buttons aren't stuck in the 'Saving...' state.
      this.submitting = false;
      if (!this.disposed) this.render();
    }
  }

  /**
   * Keyboard version of the same actions as the clickable buttons.
   */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Ignore held-down keys, input while saving, or keys after cleanup.
    if (this.disposed || this.submitting || this.shownCheckpoint === null || event.repeat) return;
    // Leave system shortcuts alone, and don't steal input from text fields.
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (key === 'escape' || key === 'b') {
      event.preventDefault();
      this.back();
      return;
    }
    // On the other two pages, Enter/1 means Back instead of confirming a trait.
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
    // Move one position left or right in the ORDERED trait options.
    // selectTarget() still checks that the requested value is actually valid.
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

  /** 
   * Let tests or another controller select a trait. 
   */
  chooseTrait(trait: TraitKey): void { this.selectTrait(trait); }
  /** 
   * Let tests or another controller select an option. 
   */
  chooseTarget(target: string): void { this.selectTarget(target); }

  /** 
   * Send the current model and UI selections to the Konva view.
   */
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

  /** 
   * Unsubscribe when the run is finished so old listeners do not stay active. 
   */
  dispose(): void {
    if (this.disposed) return;
    this.hide();
    this.disposed = true;
    // Call each unsubscribe function we saved in the constructor.
    this.disposers.forEach(unsubscribe => unsubscribe());
    this.disposers.length = 0;
    // Replace callbacks with no-ops so a leftover click can't reach this controller after the screen has been disposed.
    this.view.bind({
      openPage: () => { }, back: () => { }, selectTrait: () => { },
      selectTarget: () => { }, submit: () => { },
    });
    this.view.getGroup().destroy();
  }
}
