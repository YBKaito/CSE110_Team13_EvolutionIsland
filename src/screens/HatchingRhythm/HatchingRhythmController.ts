// US10 Hatching Rhythm: runs one song. Owns the animation loop and the keyboard.
// Enter = hit, Esc = quit. When the song is over, Enter returns to the minigames menu.

import type { MinigameDifficulty } from '../../types';
import { HatchingRhythmGame } from './HatchingRhythmGame';
import { HatchingRhythmView } from './HatchingRhythmView';
import { DIFFICULTY_FITNESS, difficultyForFitness, trackForFitness } from './difficulty';
import type { HatchResult } from './hatchResult';

/** After the last bar, Enter is ignored this long before it returns to the menu. */
const RESULTS_DELAY_MS = 800;

export interface HatchingRhythmOptions {
  /** Difficulty picked in the minigames menu. */
  difficulty: MinigameDifficulty;
  /** A bird's fitness (0 to 1). When given, it sets the speed and box size instead of `difficulty`. */
  fitness?: number;
  /** Called once the player leaves the minigame, with the hatch result (null if they quit early). */
  onExit: (result: HatchResult | null) => void;
  /** Seed for the bar pattern; random by default. */
  seed?: number;
  /** Footer shown once the song is over; defaults to going back to the minigames menu. */
  finishedHint?: string;
}

export class HatchingRhythmController {
  private readonly game: HatchingRhythmGame;
  private readonly view: HatchingRhythmView;
  private startTime = 0;
  private finishedAt: number | null = null;
  private frame = 0;
  private stopped = false;

  constructor(container: HTMLDivElement, private readonly options: HatchingRhythmOptions) {
    const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
    const fitness = options.fitness ?? DIFFICULTY_FITNESS[options.difficulty];
    this.game = new HatchingRhythmGame(difficultyForFitness(fitness), trackForFitness(fitness), seed);
    this.view = new HatchingRhythmView(container, this.game, options.finishedHint);
  }

  start(): void {
    this.startTime = performance.now();
    window.addEventListener('keydown', this.onKey);
    this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    if (this.stopped) return;
    if (!this.game.isFinished) this.game.update(now - this.startTime);
    if (this.game.isFinished && this.finishedAt === null) this.finishedAt = now;
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
      // Short pause so an Enter meant for the last bar doesn't skip the results.
      const finishedAt = this.finishedAt ?? performance.now();
      if (performance.now() - finishedAt >= RESULTS_DELAY_MS) this.exit();
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
    this.options.onExit(this.game.isFinished ? this.game.result : null);
  }
}
