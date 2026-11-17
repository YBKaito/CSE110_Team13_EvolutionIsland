// US10 Hatching Rhythm: runs one song. Owns the animation loop and the keyboard.
// Enter = hit, Esc = quit. When the song is over, Enter returns to the minigames menu.

import type { MinigameDifficulty } from '../../types';
import { HatchingRhythmGame } from './HatchingRhythmGame';
import { HatchingRhythmView } from './HatchingRhythmView';
import { DEFAULT_TRACK } from './noteTrack';

export interface HatchingRhythmOptions {
  difficulty: MinigameDifficulty;
  /** Called once the player leaves the minigame. */
  onExit: () => void;
  /** Seed for the bar pattern; random by default. */
  seed?: number;
}

export class HatchingRhythmController {
  private readonly game: HatchingRhythmGame;
  private readonly view: HatchingRhythmView;
  private startTime = 0;
  private frame = 0;
  private stopped = false;

  constructor(container: HTMLDivElement, private readonly options: HatchingRhythmOptions) {
    const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.game = new HatchingRhythmGame(options.difficulty, DEFAULT_TRACK, seed);
    this.view = new HatchingRhythmView(container, this.game);
  }

  start(): void {
    this.startTime = performance.now();
    window.addEventListener('keydown', this.onKey);
    this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    if (this.stopped) return;
    if (!this.game.isFinished) this.game.update(now - this.startTime);
    this.view.render(this.game);
    this.frame = requestAnimationFrame(this.tick);
  };

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.exit();
      return;
    }
    if (event.key !== 'Enter' || event.repeat) return;
    event.preventDefault();
    if (this.game.isFinished) {
      this.exit();
      return;
    }
    this.game.press(performance.now() - this.startTime);
  };

  private exit(): void {
    if (this.stopped) return;
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKey);
    this.view.destroy();
    this.options.onExit();
  }
}
