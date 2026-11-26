import { describe, expect, it } from 'vitest';
import {
  COLOR_PALETTES, dominantLook, dominantOption, feetShifts, hasBeakOverlay, lookFromChoices, SPRITE_CROP,
  SPRITE_PALETTE,
} from '../src/bird-visual/birdLook';
import { DEFAULT_SPECIES } from '../src/minigames/ExtinctionPrediction/ExtinctionModel';
import { conditionSpec, introSpec } from '../src/screens/ExtinctionScreen/ExtinctionScreenView';
import { generationScreenSpec, type GenerationView } from '../src/screens/GameScreen/GameScreenView';
import { TRAIT_OPTIONS } from '../src/simulation/traitContent';

// Most common in this flock: large body (index 2), long beak (2), yellow (2).
const counts = { beak: [2, 3, 5], body: [0, 0, 10], feathers: [10, 0, 0], color: [1, 2, 7, 0] };

function viewWith(overrides: Partial<GenerationView> = {}): GenerationView {
  return {
    generation: 3, flock: 10, stats: null,
    islandRows: [['Weather:', 'Rainfall - Normal'], ['Food:', 'Soft plants - Normal'], ['Habitat:', 'Predators - Moderate']],
    traitCounts: counts, lowPopulation: false, extinct: false, ...overrides,
  };
}

describe('bird data', () => {
  it('has a palette for every color', () => {
    expect(COLOR_PALETTES).toHaveLength(TRAIT_OPTIONS.color.length);
  });

  it('leaves gray as the sprites own colors, since they are already gray', () => {
    expect(COLOR_PALETTES[TRAIT_OPTIONS.color.indexOf('gray')]).toBe(SPRITE_PALETTE);
  });

  it('uses valid hex codes, with three different shades in each palette', () => {
    for (const palette of COLOR_PALETTES) {
      const shades = [palette.main, palette.dark, palette.belly];
      for (const shade of shades) expect(shade).toMatch(/^#[0-9a-f]{6}$/i);
      expect(new Set(shades).size).toBe(3);
    }
  });

  it('gives every color its own look', () => {
    expect(new Set(COLOR_PALETTES.map((p) => p.main)).size).toBe(COLOR_PALETTES.length);
  });

  it('crops wide and tall enough to hold every bird and the long beak', () => {
    // Measured from the PNGs: the art spans x 171-1082 and y 152-1044 across all sizes.
    expect(SPRITE_CROP.x).toBeLessThanOrEqual(171);
    expect(SPRITE_CROP.x + SPRITE_CROP.width).toBeGreaterThanOrEqual(1082);
    expect(SPRITE_CROP.y).toBeLessThanOrEqual(152);
    expect(SPRITE_CROP.y + SPRITE_CROP.height).toBeGreaterThanOrEqual(1044 + 19);
  });

  it('overlays only the medium and long beaks', () => {
    expect([0, 1, 2].map((beak) => hasBeakOverlay({ body: 1, beak, color: 1 }))).toEqual([false, true, true]);
  });

  it('builds a look from a species', () => {
    expect(lookFromChoices({ beak: 2, body: 0, feathers: 1, color: 3 })).toEqual({ body: 0, beak: 2, color: 3 });
  });
});

describe('dominant look', () => {
  it('picks the most common option', () => {
    expect(dominantOption([1, 2, 7, 0])).toBe(2);
  });

  it('breaks ties toward the lowest index and handles empty or all-zero lists', () => {
    expect(dominantOption([3, 3, 1])).toBe(0);
    expect(dominantOption([0, 0, 0])).toBe(0);
    expect(dominantOption([])).toBe(0);
  });

  it('takes the majority body, beak and color of the flock', () => {
    expect(dominantLook(counts)).toEqual({ body: 2, beak: 2, color: 2 });
  });
});

describe('feet alignment', () => {
  it('moves every sprite down onto the lowest feet', () => {
    expect(feetShifts([740, 854, 968])).toEqual([228, 114, 0]); // the small, medium and big sprites
  });

  it('moves nothing when the feet already line up', () => {
    expect(feetShifts([500, 500, 500])).toEqual([0, 0, 0]);
  });

  it('never moves a sprite up, and handles no sprites', () => {
    expect(feetShifts([10, 300, 40]).every((shift) => shift >= 0)).toBe(true);
    expect(feetShifts([])).toEqual([]);
  });

  it('leaves the lowest sprite where it is', () => {
    expect(feetShifts([300, 900, 600])[1]).toBe(0);
  });
});


describe('screens with a bird', () => {
  it('the game screen shows the majority bird', () => {
    expect(generationScreenSpec(viewWith()).art?.look).toEqual({ body: 2, beak: 2, color: 2 });
  });

  it('the game screen shows no bird, and so no caption, once the flock is extinct', () => {
    expect(generationScreenSpec(viewWith({ extinct: true, flock: 0 })).art).toBeUndefined();
  });

  it('the minigame intro, and so the species review, shows the species', () => {
    expect(introSpec(DEFAULT_SPECIES).art?.look).toEqual(lookFromChoices(DEFAULT_SPECIES.traits));
  });

  it('the minigame intro has no caption', () => {
    expect(introSpec(DEFAULT_SPECIES).art?.caption).toBeUndefined();
  });

  it('a minigame question shows the species only when it is given one', () => {
    expect(conditionSpec(0, undefined, DEFAULT_SPECIES).art?.look).toEqual(lookFromChoices(DEFAULT_SPECIES.traits));
    expect(conditionSpec(0).art).toBeUndefined();
  });
});
