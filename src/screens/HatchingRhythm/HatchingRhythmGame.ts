// US10 Hatching Rhythm: the game state for one song.
// Knows nothing about Konva or the clock; the controller passes in the current time.

import type { MinigameDifficulty } from '../../types';
import { createNotes, hasPassedBox, offsetFromBox, type Note, type TrackSettings } from './noteTrack';

export class HatchingRhythmGame {
  readonly notes: Note[];
  /** Time (ms since the song started) of the latest update. */
  time = 0;
  /** Time of the latest Enter press, used to flash the box. */
  lastPressTime = Number.NEGATIVE_INFINITY;
  private readonly done = new Set<number>();

  constructor(
    readonly difficulty: MinigameDifficulty,
    readonly settings: TrackSettings,
    seed = 1,
  ) {
    this.notes = createNotes(settings, seed);
  }

  /** Moves the song forward to `timeMs`; bars that slid past the box are finished. */
  update(timeMs: number): void {
    this.time = timeMs;
    for (const note of this.notes) {
      if (!this.done.has(note.id) && hasPassedBox(offsetFromBox(note, timeMs, this.settings), this.settings)) {
        this.done.add(note.id);
      }
    }
  }

  /** The player pressed Enter at `timeMs`. */
  press(timeMs: number): void {
    this.update(timeMs);
    this.lastPressTime = timeMs;
  }

  /** Bars still on their way (not yet finished). */
  get activeNotes(): Note[] {
    return this.notes.filter((note) => !this.done.has(note.id));
  }

  get isFinished(): boolean {
    return this.done.size === this.notes.length;
  }
}
