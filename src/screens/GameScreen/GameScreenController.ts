// Handles input on the generation screen: next generation, skip 5, quit.
// After simulating, any events that happened are shown as event cards before returning here.

import type { GameController, StepOutcome } from '../../game/GameController';
import type { EventLogEntry } from '../../types';
import { EventScreenController } from '../EventScreen/EventScreenController';
import { GameOverScreenController } from '../GameOverScreen/GameOverScreenController';
import { invalidChoiceMessage, parseChoice } from '../format';
import type { Screen, ScreenNavigator, ScreenSpec } from '../ui/screenSpec';
import {
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
  private gameOverShown = false;

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
    if (this.gameOverShown) return;
    if (this.mode === 'confirmQuit') return this.submitQuit(input);
    if (this.shouldShowGameOver()) return this.showGameOver();

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

  /** Shows a card for each event that happened, in order, then comes back to the generation screen. */
  private afterSimulating(outcomes: StepOutcome[]): void {
    this.error = undefined;
    const events = outcomes.flatMap((o) => o.events);
    this.showEvents(events);
  }

  private showEvents(queue: EventLogEntry[]): void {
    const [next, ...rest] = queue;
    if (!next) {
      if (this.shouldShowGameOver()) this.showGameOver();
      else this.nav.show(this);
      return;
    }
    this.nav.show(new EventScreenController(this.nav, this.game.state, next, () => this.showEvents(rest)));
  }

  private showGameOver(): void {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    this.nav.show(new GameOverScreenController(this.nav, this.game.state, {
      onRestart: this.options.onRestart,
      onReturnToMenu: this.options.onQuit,
    }));
  }

  private shouldShowGameOver(): boolean {
    return this.game.isOver;
  }
}
