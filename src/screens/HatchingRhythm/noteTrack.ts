// US10 Hatching Rhythm: the note track.
// Bars (notes) slide from the right edge toward the yellow input box on the left.
// Pure timing and geometry, no Konva, so every rule can be unit-tested.

import { RandomSource } from '../../simulation/Random';

/** What changes between easy and hard: how fast bars move, how often they come, how big the box is. */
export interface TrackSettings {
  /** How fast bars slide left, in logical pixels per millisecond. */
  speed: number;
  /** Average time between bars, in ms. */
  beatInterval: number;
  /** Width of the yellow input box, in logical pixels. */
  boxWidth: number;
  /** Number of bars in one song (one bar per egg). */
  noteCount: number;
}

/** Fixed layout of the track on the 1280 x 800 logical screen. */
export const TRACK = {
  startX: 40,
  endX: 1240,
  y: 560,
  lineHeight: 10,
  boxCenterX: 250,
  boxHeight: 150,
  noteWidth: 16,
  noteHeight: 80,
  /** Quiet time before the first bar appears, so the player can get ready. */
  leadInMs: 1000,
} as const;

/** Settings used until difficulty is chosen from the bird's fitness. */
export const DEFAULT_TRACK: TrackSettings = {
  speed: 0.4,
  beatInterval: 650,
  boxWidth: 160,
  noteCount: 20,
};

/** Gap between bars, as a multiple of the beat interval. Mostly steady, with some doubles and rests. */
const GAP_PATTERN = [1, 1, 1, 0.5, 1.5] as const;

export interface Note {
  id: number;
  /** Time (ms from song start) when the bar's center is exactly at the box's center. */
  hitTime: number;
}

/** Time a bar takes to slide from the right edge to the center of the box. */
export function travelTime(settings: TrackSettings): number {
  return (TRACK.endX - TRACK.boxCenterX) / settings.speed;
}

/** The bars for one song. The same seed always gives the same song. */
export function createNotes(settings: TrackSettings, seed = 1): Note[] {
  const rng = new RandomSource(seed);
  const notes: Note[] = [];
  let time = TRACK.leadInMs + travelTime(settings);
  for (let id = 0; id < settings.noteCount; id++) {
    notes.push({ id, hitTime: Math.round(time) });
    time += settings.beatInterval * rng.pick(GAP_PATTERN);
  }
  return notes;
}

/** Horizontal distance from the box center to the bar (positive = still to the right of the box). */
export function offsetFromBox(note: Note, timeMs: number, settings: TrackSettings): number {
  return (note.hitTime - timeMs) * settings.speed;
}

/** Where to draw a bar's center at a given time. */
export function noteX(note: Note, timeMs: number, settings: TrackSettings): number {
  return TRACK.boxCenterX + offsetFromBox(note, timeMs, settings);
}

/** True when any part of the bar overlaps the input box. */
export function isInsideBox(offsetPx: number, settings: TrackSettings): boolean {
  return Math.abs(offsetPx) <= settings.boxWidth / 2 + TRACK.noteWidth / 2;
}

/** True once a bar has slid fully past the left edge of the box. */
export function hasPassedBox(offsetPx: number, settings: TrackSettings): boolean {
  return offsetPx < -(settings.boxWidth / 2 + TRACK.noteWidth / 2);
}

/** True while the bar is on the visible part of the track. */
export function isOnTrack(x: number): boolean {
  return x >= TRACK.startX && x <= TRACK.endX;
}
