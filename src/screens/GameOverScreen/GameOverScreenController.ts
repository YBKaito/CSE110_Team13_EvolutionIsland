import type { GameState } from '../../models/GameState';
import type { Screen, ScreenNavigator, ScreenSpec } from '../ui/screenSpec';
import type { TraitName } from '../../types';
import { GAME_OVER_TRAITS, gameOverScreenSpec, type GameOverEndReason } from './GameOverScreenView';

export interface GameOverScreenOptions {
  onRestart: () => void;
  onReturnToMenu: () => void;
  endReason?: GameOverEndReason;
}

export class GameOverScreenController implements Screen {
  private selectedTrait: TraitName = 'beak';
  private selectedGeneration: number;
  private error?: string;
  private completed = false;

  constructor(
    private readonly nav: ScreenNavigator,
    private readonly state: Readonly<GameState>,
    private readonly options: GameOverScreenOptions,
  ) {
    this.selectedGeneration = 0;
  }

  spec(): ScreenSpec {
    return {
      ...gameOverScreenSpec(
        this.state,
        this.selectedTrait,
        this.selectedGeneration,
        this.error,
        this.options.endReason,
      ),
      outerBorder: true,
    };
  }

  handleKey(key: string): boolean {
    if (this.completed) return false;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return false;
    const next = Math.min(
      this.state.generation,
      Math.max(0, this.selectedGeneration + (key === 'ArrowLeft' ? -1 : 1)),
    );
    if (next !== this.selectedGeneration) {
      this.selectedGeneration = next;
      this.error = undefined;
    }
    return true;
  }

  submit(input: string): void {
    if (this.completed) return;
    const choice = input.trim();
    if (choice === '1' || choice === '2' || choice === '3' || choice === '4') {
      this.selectedTrait = GAME_OVER_TRAITS[Number(choice) - 1];
      this.error = undefined;
      this.nav.refresh();
      return;
    }
    if (choice === '5') {
      this.completed = true;
      this.options.onRestart();
      return;
    }
    if (choice === '6') {
      this.completed = true;
      this.options.onReturnToMenu();
      return;
    }
    this.error = 'Invalid choice. Choose a number from 1 to 6.';
    this.nav.refresh();
  }
}
