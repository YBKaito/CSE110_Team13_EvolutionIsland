// US10 Hatching Rhythm: Perfect / Good / Miss timing judgment.
// Windows are measured in pixels from the box center, so a bigger box is more forgiving
// and a faster track gives less time to react.

import { isInsideBox, TRACK, type TrackSettings } from './noteTrack';

export type Judgment = 'perfect' | 'good' | 'miss';

export interface Tally {
  perfect: number;
  good: number;
  miss: number;
}

/** How much each judgment counts toward accuracy. */
export const JUDGMENT_WEIGHT: Record<Judgment, number> = { perfect: 1, good: 0.5, miss: 0 };

/** Pressing this far (px) before a bar reaches the box counts as a Miss for that bar; farther away is ignored. */
export const EARLY_MISS_MARGIN = 60;

export interface TimingWindows {
  /** Bar center within this many px of the box center: Perfect (inner half of the box). */
  perfect: number;
  /** Bar overlaps the box: Good. */
  good: number;
  /** Bar is just outside the box, about to enter: Miss (an early press). */
  early: number;
}

export function timingWindows(settings: TrackSettings): TimingWindows {
  const half = TRACK.noteWidth / 2;
  const good = settings.boxWidth / 2 + half;
  return { perfect: settings.boxWidth / 4 + half, good, early: good + EARLY_MISS_MARGIN };
}

/**
 * Judges an Enter press against a bar that is `offsetPx` from the box center.
 * Returns null when the bar is still too far away to count (the press is ignored).
 */
export function judgeOffset(offsetPx: number, settings: TrackSettings): Judgment | null {
  const windows = timingWindows(settings);
  const distance = Math.abs(offsetPx);
  if (distance <= windows.perfect) return 'perfect';
  if (isInsideBox(offsetPx, settings)) return 'good';
  if (distance <= windows.early) return 'miss';
  return null;
}

export function emptyTally(): Tally {
  return { perfect: 0, good: 0, miss: 0 };
}

export function judgedCount(tally: Tally): number {
  return tally.perfect + tally.good + tally.miss;
}

/** 0 to 1. Perfect counts fully, Good counts half, Miss counts nothing. */
export function accuracy(tally: Tally): number {
  const total = judgedCount(tally);
  if (total === 0) return 0;
  const score = tally.perfect * JUDGMENT_WEIGHT.perfect + tally.good * JUDGMENT_WEIGHT.good + tally.miss * JUDGMENT_WEIGHT.miss;
  return score / total;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
