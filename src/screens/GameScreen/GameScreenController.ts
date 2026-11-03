// Handles input on the generation screen: next generation, skip 5, quit.
// After simulating, any events that happened are shown as event cards before returning here.

import type { GameController, StepOutcome } from '../../game/GameController';
import type { EventLogEntry } from '../../types';
import { EventScreenController } from '../EventScreen/EventScreenController';
import { invalidChoiceMessage, parseChoice } from '../format';
import type { Screen, ScreenNavigator, ScreenSpec } from '../ui/screenSpec';
import {
  EXTINCT_CHOICES,
  GENERATION_CHOICES,
  generationScreenSpec,
  generationViewFromState,
  QUIT_CHOICES,
  quitConfirmSpec,
} from './GameScreenView';

export interface GameScreenOptions {
  /** Player confirmed they want to leave the island. */
  onQuit: () => void;
  /** Player wants a fresh run after extinction. */
  onRestart: () => void;
}

export class GameScreenController implements Screen {
  private mode: 'generation' | 'confirmQuit' = 'generation';
  private error: string | undefined;

  constructor(
    private readonly nav: ScreenNavigator,
    private readonly game: GameController,
    private readonly options: GameScreenOptions,
  ) {}

  spec(): ScreenSpec {
    if (this.mode === 'confirmQuit') return quitConfirmSpec(this.error);
    return generationScreenSpec(generationViewFromState(this.game.state), this.error);
  }

  submit(input: string): void {
    if (this.mode === 'confirmQuit') return this.submitQuit(input);
    if (this.game.isOver) return this.submitExtinct(input);

    const choice = parseChoice(input, GENERATION_CHOICES);
    if (choice === 1) return this.afterSimulating([this.game.step()]);
    if (choice === 2) return this.afterSimulating(this.game.advance(5));
    if (choice === 3) {
      this.mode = 'confirmQuit';
      this.error = undefined;
    } else {
      this.error = invalidChoiceMessage(GENERATION_CHOICES);
    }
    this.nav.refresh();
  }

  private submitQuit(input: string): void {
    const choice = parseChoice(input, QUIT_CHOICES);
    if (choice === 1) return this.options.onQuit();
    if (choice === 2) {
      this.mode = 'generation';
      this.error = undefined;
    } else {
      this.error = invalidChoiceMessage(QUIT_CHOICES);
    }
    this.nav.refresh();
  }

  private submitExtinct(input: string): void {
    if (parseChoice(input, EXTINCT_CHOICES) === 1) return this.options.onRestart();
    this.error = 'Invalid. Type 1.';
    this.nav.refresh();
  }

  /** Shows a card for each event that happened, in order, then comes back to the generation screen. */
  private afterSimulating(outcomes: StepOutcome[]): void {
    this.error = undefined;
    const events = outcomes.flatMap((o) => o.events);
    this.showEvents(events);
  }

  private showEvents(queue: EventLogEntry[]): void {
    const [next, ...rest] = queue;
    if (!next) {
      this.nav.show(this);
      return;
    }
    this.nav.show(new EventScreenController(this.nav, this.game.state, next, () => this.showEvents(rest)));
  }
}
