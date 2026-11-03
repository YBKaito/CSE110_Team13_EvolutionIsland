// Visual style from the design mockups: dark background, white pixel font, red error lines.

import type { TextColor, TextSize } from './screenSpec';

/** Logical canvas size; the stage scales this to fit the window. */
export const SCREEN_WIDTH = 1280;
export const SCREEN_HEIGHT = 800;
export const MARGIN_X = 90;
export const MARGIN_TOP = 60;
export const MARGIN_BOTTOM = 40;

export const FONT_FAMILY = '"Pixelify Sans", "Courier New", monospace';

export const COLORS: Record<TextColor, string> & { background: string; barFilled: string; barEmpty: string; border: string } = {
  background: '#1f1f1f',
  normal: '#ffffff',
  error: '#ff2020',
  success: '#22e022',
  muted: '#a8a8a8',
  barFilled: '#ffffff',
  barEmpty: '#4a4a4a',
  border: '#8a8a8a',
};

export const FONT_SIZES: Record<TextSize, number> = {
  title: 44,
  heading: 30,
  body: 24,
  small: 19,
};

/** Extra vertical space after each line, by size. */
export const LINE_GAP: Record<TextSize, number> = {
  title: 14,
  heading: 10,
  body: 7,
  small: 5,
};

export const BAR = {
  labelWidth: 130,
  optionWidth: 90,
  barWidth: 100,
  barHeight: 16,
  countWidth: 52,
};
