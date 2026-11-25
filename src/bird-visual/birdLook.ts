// What a bird looks like on screen, as plain data. No images or canvas in here, so it is easy to test.

import type { TraitName, Traits } from '../types';

/** Option indexes into TRAIT_OPTIONS, the same numbers the simulation uses. */
export interface BirdLook {
  body: number;		// 0 small, 1 medium, 2 large: picks the matching *_bird_with_outline.png
  beak: number;		// 0 short (already in the sprite), 1 medium, 2 long (overlaid)
  color: number;	// 0 brown, 1 gray, 2 yellow, 3 white
}

/** The three shades every body sprite is drawn with. Outlines (black and white) and the eye are never recolored. */
export interface BirdPalette {
  main: string;		// body
  dark: string;		// darker pattern marks
  belly: string;	// light belly
}

/** The exact colors in the PNGs. A bird with this palette is drawn unchanged. */
export const DEFAULT_PALETTE: BirdPalette = { main: '#706f70', dark: '#454545', belly: '#e3e3e3' };

/** Indexed by color option: brown, gray, yellow, white. Edit these hex codes to taste. */
export const COLOR_PALETTES: readonly BirdPalette[] = [
  { main: '#8b5a2b', dark: '#5a3a1c', belly: '#d9b98a' }, // brown
  DEFAULT_PALETTE, // gray: the sprites' own colors
  { main: '#f2c94c', dark: '#c9971c', belly: '#fff3b0' }, // yellow
  { main: '#e8e8e8', dark: '#b4b4b4', belly: '#ffffff' }, // white
];

/**
 * The part of each 1216 x 1216 sprite worth drawing. The PNGs have a wide transparent margin, so cropping makes
 * the bird fill its picture. One shared crop keeps the three sizes in proportion, with room for the long beak.
 */
export const SPRITE_CROP = { x: 150, y: 130, width: 950, height: 935 };

/** The short beak is already part of the body sprite, so only longer beaks are overlaid. */
export const hasBeakOverlay = (look: BirdLook): boolean => look.beak > 0;

export const lookFromTraits = (traits: Traits): BirdLook => ({
  body: traits.body,
  beak: traits.beak,
  color: traits.color,
});

/** The option with the most birds. Ties go to the lowest index; an empty list gives 0. */
export function dominantOption(counts: readonly number[]): number {
  let best = 0;
  counts.forEach((count, i) => {
    if (count > counts[best]) best = i;
  });
  return best;
}

/** The bird most of the flock looks like: the most common body, beak and color. */
export const dominantLook = (counts: Record<TraitName, number[]>): BirdLook => ({
  body: dominantOption(counts.body),
  beak: dominantOption(counts.beak),
  color: dominantOption(counts.color),
});
