// Handles input on the generation screen: next generation, skip 5, quit.
// After simulating, any events that happened are shown as event cards before returning here.

import type { GameController, StepOutcome } from '../../game/GameController';
import type { EventLogEntry } from '../../types';
import { EventScreenController } from '../EventScreen/EventScreenController';
import { GameOverScreenController } from '../GameOverScreen/GameOverScreenController';
import type { GameOverEndReason } from '../GameOverScreen/GameOverScreenView';
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
  /** Runs generations and publishes updates to the evolution screen. */
  simulation?: Pick<GameController, 'step' | 'advance'>;
  /** Opens the evolution choice after any event cards have been shown. */
  onCheckpoint?: () => boolean;
  /**
   * Back between generations with nothing else to show. Return true after
   * opening a minigame; call `resume` once it closes to come back here.
   */
  onBetweenGenerations?: (resume: () => void) => boolean;
  /**
   * The run ended (generation limit or extinction). Return true after opening
   * an end-of-run minigame; call `finish` once it closes to show Game Over.
   * Not called when the player quits.
   */
  onRunEnd?: (finish: () => void) => boolean;
}

export class GameScreenController implements Screen {
  private mode: 'generation' | 'confirmQuit' = 'generation';
  private error: string | undefined;
  private gameOverShown = false;
  private endingRun = false;

  constructor(
    private readonly nav: ScreenNavigator,
    private readonly game: GameController,
    private readonly options: GameScreenOptions,
  ) {}

  spec(): ScreenSpec {
    return {
      ...(this.mode === 'confirmQuit'
        ? quitConfirmSpec(this.error)
        : generationScreenSpec(generationViewFromState(this.game.state), this.error)),
      outerBorder: true,
    };
  }

  submit(input: string): void {
    if (this.gameOverShown || this.endingRun) return;
    if (this.mode === 'confirmQuit') return this.submitQuit(input);
    if (this.shouldShowGameOver()) return this.endRun();

    const choice = parseChoice(input, GENERATION_CHOICES);
    const simulation = this.options.simulation ?? this.game;
    if (choice === 1) return this.afterSimulating([simulation.step()]);
    if (choice === 2) return this.afterSimulating(simulation.advance(5));
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
    if (choice === 1) return this.showGameOver('quit');
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
      // US6: Show Game Over if the flock is extinct.
      if (this.shouldShowGameOver()) {
        this.endRun();
        return;
      }

      // US5: Show evolution choice after all event cards.
      if (this.options.onCheckpoint?.()) return;

      // Minigames (US8, US10) may appear between generations.
      if (this.options.onBetweenGenerations?.(() => this.nav.show(this))) return;

      // Otherwise return to the generation screen.
      this.nav.show(this);
      return;
    }

    this.nav.show(
      new EventScreenController(
        this.nav,
        this.game.state,
        next,
        () => this.showEvents(rest),
      ),
    );
  }

  /** The run is over: let the end-of-run minigame (US9 quiz) play first, then show Game Over. */
  private endRun(): void {
    if (this.gameOverShown || this.endingRun) return;
    this.endingRun = true;
    if (this.options.onRunEnd?.(() => this.showGameOver())) return;
    this.showGameOver();
  }

  private showGameOver(endReason?: GameOverEndReason): void {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    const reason = endReason ?? (this.game.state.population.birds.length === 0 ? 'extinction' : 'preview');
    this.nav.show(new GameOverScreenController(this.nav, this.game.state, {
      onRestart: this.options.onRestart,
      onReturnToMenu: this.options.onQuit,
      endReason: reason,
    }));
  }

  private shouldShowGameOver(): boolean {
    return this.game.isOver;
  }
}
