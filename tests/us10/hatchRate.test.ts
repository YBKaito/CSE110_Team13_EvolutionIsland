// US10: the hatch rate matches timing accuracy, and sets the offspring count and egg sprite.
import { describe, expect, it } from 'vitest';
import { EASY_TRACK } from '../../src/screens/HatchingRhythm/difficulty';
import { eggStage, EGG_SPRITES } from '../../src/screens/HatchingRhythm/eggSprite';
import { HatchingRhythmGame } from '../../src/screens/HatchingRhythm/HatchingRhythmGame';
import {
  birthMultiplierForHatchRate,
  hatchRate,
  hatchResult,
  MAX_BIRTH_MULTIPLIER,
  MIN_BIRTH_MULTIPLIER,
  offspringCount,
} from '../../src/screens/HatchingRhythm/hatchResult';
import { accuracy, type Tally } from '../../src/screens/HatchingRhythm/timingJudge';

const tally = (perfect: number, good: number, miss: number): Tally => ({ perfect, good, miss });

describe('hatch rate matches accuracy', () => {
  it.each([
    tally(20, 0, 0),
    tally(0, 2, 18),
    tally(10, 4, 6),
    tally(0, 0, 20),
    tally(7, 7, 6),
  ])('tally %o', (t) => {
    expect(hatchRate(t)).toBe(accuracy(t));
  });

  it('holds for every possible 20-bar song', () => {
    for (let perfect = 0; perfect <= 20; perfect++) {
      for (let good = 0; perfect + good <= 20; good++) {
        const t = tally(perfect, good, 20 - perfect - good);
        const result = hatchResult(t, 20);
        expect(result.hatchRate).toBe(accuracy(t));
        // Hatched eggs are the accuracy share of the clutch, rounded to a whole chick.
        expect(Math.abs(result.hatched - accuracy(t) * 20)).toBeLessThanOrEqual(0.5 + 1e-9);
      }
    }
  });

  it('a played song reports the same hatch rate as its accuracy', () => {
    const game = new HatchingRhythmGame('easy', EASY_TRACK, 5);
    game.notes.forEach((note, i) => {
      // Perfect, Good, then let the third bar go by (Miss), repeating.
      if (i % 3 === 0) game.press(note.hitTime);
      if (i % 3 === 1) game.press(note.hitTime - 100 / EASY_TRACK.speed);
    });
    game.update(game.notes.at(-1)!.hitTime + 10_000);
    expect(game.isFinished).toBe(true);
    expect(game.result.hatchRate).toBe(game.accuracy);
    expect(game.tally).toEqual(tally(7, 7, 6));
  });
});

describe('hatch rate to offspring count', () => {
  it.each([
    [1, 20, 20],
    [0, 20, 0],
    [0.6, 20, 12],
    [0.05, 20, 1],
    [0.5, 7, 4],
  ])('rate %d of %d eggs hatches %d', (rate, eggs, hatched) => {
    expect(offspringCount(rate, eggs)).toBe(hatched);
  });

  it('never hatches more eggs than the clutch, or fewer than none', () => {
    expect(offspringCount(1.4, 20)).toBe(20);
    expect(offspringCount(-0.2, 20)).toBe(0);
    expect(offspringCount(0.5, -3)).toBe(0);
  });

  it('a better hatch rate gives a bigger birth multiplier for the simulation', () => {
    expect(birthMultiplierForHatchRate(0)).toBe(MIN_BIRTH_MULTIPLIER);
    expect(birthMultiplierForHatchRate(1)).toBe(MAX_BIRTH_MULTIPLIER);
    expect(birthMultiplierForHatchRate(0.5)).toBeCloseTo(1);
  });

  it('matches the mockups: 20 Perfect hatches all 20, 2 Good / 18 Miss hatches 1', () => {
    expect(hatchResult(tally(20, 0, 0), 20)).toMatchObject({ hatchRate: 1, hatched: 20, eggs: 20 });
    expect(hatchResult(tally(0, 2, 18), 20)).toMatchObject({ hatchRate: 0.05, hatched: 1 });
  });
});

describe('egg sprite', () => {
  it('starts as a whole egg', () => {
    expect(eggStage(tally(0, 0, 0), false)).toBe('egg');
    expect(eggStage(tally(0, 0, 3), false)).toBe('egg');
  });

  it('cracks after the first good hit', () => {
    expect(eggStage(tally(1, 0, 0), false)).toBe('cracked');
    expect(eggStage(tally(0, 1, 4), false)).toBe('cracked');
  });

  it('hatches into a chick when the song ends with a good hatch rate', () => {
    expect(eggStage(tally(20, 0, 0), true)).toBe('hatched');
    expect(eggStage(tally(5, 10, 5), true)).toBe('hatched');
  });

  it('stays cracked when the song ends with a poor hatch rate', () => {
    expect(eggStage(tally(0, 2, 18), true)).toBe('cracked');
  });

  it('has a sprite for every stage', () => {
    expect(Object.keys(EGG_SPRITES).sort()).toEqual(['cracked', 'egg', 'hatched']);
  });
});
