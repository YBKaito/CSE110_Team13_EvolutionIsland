// US10 Hatching Rhythm: the game state for one song.
// Knows nothing about Konva or the clock; the controller passes in the current time.

import type { MinigameDifficulty } from '../../types';
import { hatchResult, type HatchResult } from './hatchResult';
import { createNotes, hasPassedBox, offsetFromBox, type Note, type TrackSettings } from './noteTrack';
import { accuracy, emptyTally, judgeOffset, type Judgment, type Tally } from './timingJudge';

export interface JudgmentEvent {
  judgment: Judgment;
  /** Song time when it happened, used to fade the "Perfect!" popup. */
  time: number;
}

export class HatchingRhythmGame {
  readonly notes: Note[];
  /** Time (ms since the song started) of the latest update. */
  time = 0;
  /** Time of the latest Enter press, used to flash the box. */
  lastPressTime = Number.NEGATIVE_INFINITY;
  /** Most recent judgment, for the popup above the box. */
  lastJudgment: JudgmentEvent | null = null;
  private readonly judgments = new Map<number, Judgment>();

  constructor(
    readonly difficulty: MinigameDifficulty,
    readonly settings: TrackSettings,
    seed = 1,
  ) {
    this.notes = createNotes(settings, seed);
  }

  /** Moves the song forward to `timeMs`; bars that slid past the box without a press are Misses. */
  update(timeMs: number): void {
    this.time = timeMs;
    for (const note of this.activeNotes) {
      if (hasPassedBox(offsetFromBox(note, timeMs, this.settings), this.settings)) {
        this.judge(note, 'miss');
      }
    }
  }

  /**
   * The player pressed Enter at `timeMs`. Judges the closest bar that has not been judged yet.
   * Returns the judgment, or null when no bar was close enough to count.
   */
  press(timeMs: number): Judgment | null {
    this.update(timeMs);
    this.lastPressTime = timeMs;

    let closest: Note | null = null;
    let closestOffset = Number.POSITIVE_INFINITY;
    for (const note of this.activeNotes) {
      const offset = offsetFromBox(note, timeMs, this.settings);
      if (Math.abs(offset) < Math.abs(closestOffset)) {
        closest = note;
        closestOffset = offset;
      }
    }
    if (!closest) return null;

    const judgment = judgeOffset(closestOffset, this.settings);
    if (judgment) this.judge(closest, judgment);
    return judgment;
  }

  /** Bars still on their way (not judged yet). */
  get activeNotes(): Note[] {
    return this.notes.filter((note) => !this.judgments.has(note.id));
  }

  get tally(): Tally {
    const tally = emptyTally();
    for (const judgment of this.judgments.values()) tally[judgment]++;
    return tally;
  }

  /** 0 to 1, over the bars judged so far. */
  get accuracy(): number {
    return accuracy(this.tally);
  }

  get isFinished(): boolean {
    return this.judgments.size === this.notes.length;
  }

  /** Hatch rate and offspring count, one egg per bar. Final once the song is over. */
  get result(): HatchResult {
    return hatchResult(this.tally, this.notes.length);
  }

  private judge(note: Note, judgment: Judgment): void {
    this.judgments.set(note.id, judgment);
    this.lastJudgment = { judgment, time: this.time };
  }
}
