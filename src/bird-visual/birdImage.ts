// Turns a BirdLook into a drawable canvas: the right body sprite, recolored, with a beak overlay on top, then cropped.

import {
  COLOR_PALETTES, hasBeakOverlay, SPRITE_CROP, SPRITE_PALETTE, type BirdLook, type BirdPalette, feetShifts
} from './birdLook';

const BODY_URLS = [
  new URL('../../graphics/small_bird_with_outline.png', import.meta.url).href,
  new URL('../../graphics/medium_bird_with_outline.png', import.meta.url).href,
  new URL('../../graphics/big_bird_with_outline.png', import.meta.url).href,
];

/** Indexed by beak option. Short (0) is drawn in the body sprite; big_beak.png is the long beak. */
const BEAK_URLS: (string | null)[] = [
  null,
  new URL('../../graphics/medium_beak.png', import.meta.url).href,
  new URL('../../graphics/big_beak.png', import.meta.url).href,
];


const images = new Map<string, Promise<HTMLImageElement | null>>();

/** Loads each file once. A missing file gives null, so the bird just draws without it. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  let image = images.get(url);
  if (!image) {
    image = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    images.set(url, image);
  }
  return image;
}

const hexToRgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** A copy of the sprite with its three gray shades swapped for the palette's. Outlines and the eye are left alone. */
function recolored(sprite: HTMLImageElement, palette: BirdPalette): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.naturalWidth;
  canvas.height = sprite.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false; // keep pixel art crisp
  ctx.drawImage(sprite, 0, 0);
  if (palette === SPRITE_PALETTE) return canvas; // gray: nothing to swap

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data; // RGBA bytes
  const swaps = (['main', 'dark', 'belly'] as const).map((shade) => ({
    from: hexToRgb(SPRITE_PALETTE[shade]),
    to: hexToRgb(palette[shade]),
  }));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // transparent background
    for (const { from, to } of swaps) {
      if (data[i] === from[0] && data[i + 1] === from[1] && data[i + 2] === from[2]) {
        data[i] = to[0];
        data[i + 1] = to[1];
        data[i + 2] = to[2];
        break;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * The y of the lowest pixel of the feet. Only the right half of the bird is scanned,
 * because the tail tip hangs lower than the feet on the bigger birds.
 */
function feetBottom(sprite: HTMLImageElement): number {
  const { naturalWidth: w, naturalHeight: h } = sprite;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(sprite, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] > 0;

  let left = w;
  let right = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (right < 0) return h - 1; // empty sprite: nothing to measure
  const middle = left + Math.floor((right - left) / 2);
  for (let y = h - 1; y >= 0; y--) {
    for (let x = middle; x <= right; x++) if (opaque(x, y)) return y;
  }
  return h - 1;
}

let shifts: Promise<number[]> | null = null;

/** How far each body sprite moves down so all three stand on the same ground line. Measured once. */
function groundShifts(): Promise<number[]> {
  shifts ??= Promise.all(BODY_URLS.map(loadImage)).then((sprites) => {
    const loaded = sprites.filter((s): s is HTMLImageElement => s !== null);
    return loaded.length === sprites.length ? feetShifts(loaded.map(feetBottom)) : sprites.map(() => 0); // a missing file: no alignment
  });
  return shifts;
}

async function compose(look: BirdLook): Promise<HTMLCanvasElement | null> {
  const body = await loadImage(BODY_URLS[look.body]);
  const shift = (await groundShifts())[look.body];
  if (!body) return null;
  const canvas = recolored(body, COLOR_PALETTES[look.color]);

  const beakUrl = hasBeakOverlay(look) ? BEAK_URLS[look.beak] : null;
  const beak = beakUrl ? await loadImage(beakUrl) : null;
  if (beak) {
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(beak, 0, 0); // the overlay is already the same size and position as the body sprite
  }
  // Crop away the empty margin so the bird fills its picture.
  const out = document.createElement('canvas');
  out.width = SPRITE_CROP.width;
  out.height = SPRITE_CROP.height;
  out.getContext('2d')!.drawImage(canvas, -SPRITE_CROP.x, -SPRITE_CROP.y + shift);
  return out;
}


const rendered = new Map<string, Promise<HTMLCanvasElement | null>>();

/** The finished bird, cached per look so redrawing a screen is cheap. null if the body PNG is missing. */
export function renderBird(look: BirdLook): Promise<HTMLCanvasElement | null> {
  const key = `${look.body}:${look.beak}:${look.color}`;
  let bird = rendered.get(key);
  if (!bird) {
    bird = compose(look);
    rendered.set(key, bird);
  }
  return bird;
}
