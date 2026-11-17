// US10: Perfect / Good / Miss timing windows and how the game applies them.
import { describe, expect, it } from 'vitest';
import { EASY_TRACK, HARD_TRACK } from '../../src/screens/HatchingRhythm/difficulty';
import { HatchingRhythmGame } from '../../src/screens/HatchingRhythm/HatchingRhythmGame';
import { createNotes, isInsideBox, noteX, TRACK, travelTime } from '../../src/screens/HatchingRhythm/noteTrack';
import { accuracy, EARLY_MISS_MARGIN, judgeOffset, timingWindows } from '../../src/screens/HatchingRhythm/timingJudge';

/** Song time at which the first bar is `offsetPx` to the right of the box center. */
function timeAtOffset(game: HatchingRhythmGame, offsetPx: number, noteIndex = 0): number {
  return game.notes[noteIndex].hitTime - offsetPx / game.settings.speed;
}

describe('timing windows', () => {
  it('Perfect is the inner half of the box, Good is the whole box', () => {
    const w = timingWindows(EASY_TRACK);
    expect(w.perfect).toBe(EASY_TRACK.boxWidth / 4 + TRACK.noteWidth / 2);
    expect(w.good).toBe(EASY_TRACK.boxWidth / 2 + TRACK.noteWidth / 2);
    expect(w.early).toBe(w.good + EARLY_MISS_MARGIN);
  });

  it.each([
    ['dead center', 0, 'perfect'],
    ['edge of Perfect (right)', 65.5, 'perfect'],
    ['edge of Perfect (left)', -65.5, 'perfect'],
    ['just past Perfect', 66, 'good'],
    ['edge of the box', 123, 'good'],
    ['edge of the box (left)', -123, 'good'],
    ['just before the box', 124, 'miss'],
    ['edge of early Miss', 183, 'miss'],
    ['too far to count', 184, null],
  ] as const)('easy: %s (%d px) is %s', (_label, offset, expected) => {
    expect(judgeOffset(offset, EASY_TRACK)).toBe(expected);
  });

  it.each([
    [0, 'perfect'],
    [23, 'perfect'],
    [24, 'good'],
    [38, 'good'],
    [39, 'miss'],
    [98, 'miss'],
    [99, null],
  ] as const)('hard: %d px is %s', (offset, expected) => {
    expect(judgeOffset(offset, HARD_TRACK)).toBe(expected);
  });

  it('the same press is Perfect on easy but Miss on hard (smaller box)', () => {
    expect(judgeOffset(60, EASY_TRACK)).toBe('perfect');
    expect(judgeOffset(60, HARD_TRACK)).toBe('miss');
  });

  it('a bar counts as inside the box only while it overlaps it', () => {
    expect(isInsideBox(0, HARD_TRACK)).toBe(true);
    expect(isInsideBox(38, HARD_TRACK)).toBe(true);
    expect(isInsideBox(-38.5, HARD_TRACK)).toBe(false);
  });
});

describe('note track', () => {
  it('makes one bar per egg, in time order, after the lead-in', () => {
    const notes = createNotes(EASY_TRACK, 7);
    expect(notes).toHaveLength(EASY_TRACK.noteCount);
    expect(notes[0].hitTime).toBe(Math.round(TRACK.leadInMs + travelTime(EASY_TRACK)));
    for (let i = 1; i < notes.length; i++) expect(notes[i].hitTime).toBeGreaterThan(notes[i - 1].hitTime);
  });

  it('the same seed gives the same song', () => {
    expect(createNotes(HARD_TRACK, 42)).toEqual(createNotes(HARD_TRACK, 42));
  });

  it('bars start at the right edge and reach the box center on their hit time', () => {
    const [note] = createNotes(EASY_TRACK);
    expect(noteX(note, note.hitTime - travelTime(EASY_TRACK), EASY_TRACK)).toBeCloseTo(TRACK.endX, 0);
    expect(noteX(note, note.hitTime, EASY_TRACK)).toBe(TRACK.boxCenterX);
  });
});

describe('judging presses during a song', () => {
  it('pressing right on time is Perfect', () => {
    const game = new HatchingRhythmGame('easy', EASY_TRACK);
    expect(game.press(timeAtOffset(game, 0))).toBe('perfect');
    expect(game.tally).toEqual({ perfect: 1, good: 0, miss: 0 });
  });

  it('pressing while the bar is near the box edge is Good', () => {
    const game = new HatchingRhythmGame('easy', EASY_TRACK);
    expect(game.press(timeAtOffset(game, 100))).toBe('good');
  });

  it('pressing just before the bar reaches the box is a Miss', () => {
    const game = new HatchingRhythmGame('hard', HARD_TRACK);
    expect(game.press(timeAtOffset(game, 60))).toBe('miss');
    expect(game.tally.miss).toBe(1);
  });

  it('pressing with no bar close by is ignored', () => {
    const game = new HatchingRhythmGame('easy', EASY_TRACK);
    expect(game.press(0)).toBeNull();
    expect(game.tally).toEqual({ perfect: 0, good: 0, miss: 0 });
  });

  it('a bar that slides past the box without a press is a Miss', () => {
    const game = new HatchingRhythmGame('easy', EASY_TRACK);
    game.update(timeAtOffset(game, -(timingWindows(EASY_TRACK).good + 1)));
    expect(game.tally.miss).toBe(1);
    expect(game.activeNotes).toHaveLength(EASY_TRACK.noteCount - 1);
  });

  it('each bar is judged only once', () => {
    const game = new HatchingRhythmGame('easy', EASY_TRACK);
    const t = timeAtOffset(game, 0);
    game.press(t);
    game.press(t);
    expect(game.tally.perfect).toBe(1);
  });

  it('the song ends once every bar is judged', () => {
    const game = new HatchingRhythmGame('hard', HARD_TRACK, 3);
    for (const note of game.notes) game.press(note.hitTime);
    expect(game.isFinished).toBe(true);
    expect(game.tally).toEqual({ perfect: HARD_TRACK.noteCount, good: 0, miss: 0 });
    expect(game.accuracy).toBe(1);
  });
});

describe('accuracy', () => {
  it('Perfect counts fully, Good counts half, Miss counts nothing', () => {
    expect(accuracy({ perfect: 20, good: 0, miss: 0 })).toBe(1);
    expect(accuracy({ perfect: 0, good: 20, miss: 0 })).toBe(0.5);
    expect(accuracy({ perfect: 0, good: 0, miss: 20 })).toBe(0);
    expect(accuracy({ perfect: 10, good: 4, miss: 6 })).toBeCloseTo(0.6);
  });

  it('is 0 before any bar is judged', () => {
    expect(accuracy({ perfect: 0, good: 0, miss: 0 })).toBe(0);
  });
});
