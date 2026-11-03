import Konva from 'konva';
import type { Group } from 'konva/lib/Group';
import { STAGE_WIDTH, STAGE_HEIGHT } from './constants';

export const COLORS = {
  bg: '#081320', panel: '#122337', panel2: '#182c40', border: '#284158',
  text: '#f2f7fb', muted: '#a4b9c7', teal: '#60dfba', blue: '#80bfff',
  orange: '#f7bc76', red: '#ff9b94', line: '#254056'
};

export function rectangle(parent: Group, x: number, y: number, width: number, height: number, fill: string, radius = 15, stroke?: string): Konva.Rect {
  const r = new Konva.Rect({ x, y, width, height, fill, cornerRadius: radius, stroke, strokeWidth: stroke ? 1 : 0 });
  parent.add(r);
  return r;
}

export interface TextOptions {
  size?: number; fill?: string; bold?: boolean; width?: number; align?: 'left' | 'right' | 'center';
  height?: number; lineHeight?: number; ellipsis?: boolean;
}
export function label(parent: Group, text: string, x: number, y: number, options: TextOptions = {}): Konva.Text {
  const t = new Konva.Text({
    x, y, text, fontFamily: 'Arial', fontSize: options.size ?? 15,
    fontStyle: options.bold ? 'bold' : 'normal', fill: options.fill ?? COLORS.text,
    width: options.width, align: options.align ?? 'left', height: options.height,
    lineHeight: options.lineHeight ?? 1.2, ellipsis: options.ellipsis ?? false,
    listening: false
  });
  parent.add(t);
  return t;
}

export function rule(parent: Group, x: number, y: number, width: number): void {
  parent.add(new Konva.Line({ points: [x, y, x + width, y], stroke: COLORS.line, strokeWidth: 1 }));
}

export function button(
  parent: Group, x: number, y: number, width: number, height: number,
  text: string, onClick: () => void, options: {
    selected?: boolean; enabled?: boolean; primary?: boolean; subtitle?: string;
  } = {}
): Konva.Group {
  const group = new Konva.Group({ x, y });
  const enabled = options.enabled ?? true;
  const selected = options.selected ?? false;
  const primary = options.primary ?? false;
  const normalFill = primary ? (enabled ? COLORS.teal : '#35566a') : selected ? '#254b5d' : '#1b3448';
  const background = rectangle(group, 0, 0, width, height, normalFill, 10, selected ? COLORS.teal : COLORS.border);
  label(group, text, 12, options.subtitle ? 10 : Math.max(9, height / 2 - 9), {
    size: primary ? 16 : 15, bold: true, fill: primary && enabled ? '#06212a' : enabled ? COLORS.text : COLORS.muted,
    width: width - 24, align: primary ? 'center' : 'left'
  });
  if (options.subtitle) label(group, options.subtitle, 12, 34, { size: 12, fill: COLORS.muted, width: width - 24 });
  if (enabled) {
    group.on('click tap', onClick);
    group.on('mouseenter', () => {
      document.body.style.cursor = 'pointer';
      background.fill(primary ? '#8bf0d0' : selected ? '#2c6471' : '#2a445a');
      group.getLayer()?.batchDraw();
    });
    group.on('mouseleave', () => {
      document.body.style.cursor = 'default';
      background.fill(normalFill);
      group.getLayer()?.batchDraw();
    });
  }
  parent.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Shared Konva styling for the screens.
// ---------------------------------------------------------------------------

export const STYLE = {
  background: '#1d1d1d',
  text: '#f7f7f7',
  muted: '#c1c1c1',
  dim: '#858585',
  warning: '#f04444',
  hover: '#343434',
  selected: '#3c3c3c',
  border: '#737373',
  fontFamily: 'Pixelify Sans, monospace',
} as const;

export type StyleTextOptions = {
  size?: number;
  width?: number;
  fill?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
};

/** Text styled with Pixelify Sans to match the shared game UI. */
export function styleText(
  parent: Group, value: string, x: number, y: number,
  options: StyleTextOptions = {},
): Konva.Text {
  const node = new Konva.Text({
    x, y,
    text: value,
    width: options.width,
    fill: options.fill ?? STYLE.text,
    fontFamily: STYLE.fontFamily,
    fontSize: options.size ?? 28,
    fontStyle: options.bold ? 'bold' : 'normal',
    align: options.align ?? 'left',
    lineHeight: 1.22,
    wrap: 'word',
    listening: false,
  });
  parent.add(node);
  return node;
}

/** Draw a full-stage background using the shared dimensions in constants.ts. */
export function styleCanvas(root: Group): Group {
  root.destroyChildren();
  root.add(new Konva.Rect({
    x: 0,
    y: 0,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    fill: STYLE.background,
  }));
  // No second coordinate system or scaling: children use stage coordinates.
  return root;
}

/** Decorative slot; replace with actual Konva.Image when art is available. */
export function styleFeatherImageSlot(parent: Group, x: number, y: number): void {
  Konva.Image.fromURL("graphics/feather.png", function (image) {
    image.x(x);
    image.y(y);
    image.width(125);
    image.height(125);
    parent.add(image);
  });
}

export function styleRule(parent: Group, y: number, x = 105, width = 990): void {
  parent.add(new Konva.Line({
    points: [x, y, x + width, y],
    stroke: STYLE.border,
    strokeWidth: 1,
  }));
}

/** Clickable, keyboard-compatible action row styled like a numbered menu. */
export function styleOption(
  parent: Group, value: string, x: number, y: number, onClick: () => void,
  options: { width?: number; size?: number; disabled?: boolean } = {},
): Konva.Group {
  const width = options.width ?? 600;
  const size = options.size ?? 26;
  const row = new Konva.Group({ x, y });
  const background = new Konva.Rect({
    x: -9, y: -5, width, height: size + 20,
    fill: STYLE.background,
  });
  row.add(background);
  styleText(row, value, 0, 0, {
    size, width: width - 18,
    fill: options.disabled ? STYLE.dim : STYLE.text,
  });
  if (!options.disabled) {
    row.on('click tap', onClick);
    row.on('mouseenter', () => {
      background.fill(STYLE.hover);
      if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
      row.getLayer()?.batchDraw();
    });
    row.on('mouseleave', () => {
      background.fill(STYLE.background);
      if (typeof document !== 'undefined') document.body.style.cursor = 'default';
      row.getLayer()?.batchDraw();
    });
  }
  parent.add(row);
  return row;
}

/** White square-cell bar like the generation results in the PDF mockup. */
export function styleBar(
  parent: Group, x: number, y: number, width: number, fraction: number,
  cells = 22,
): void {
  const n = Math.max(1, Math.floor(cells));
  const filled = Math.round(n * Math.max(0, Math.min(1, fraction)));
  for (let i = 0; i < n; i++) {
    parent.add(new Konva.Rect({
      x: x + (width / n) * i, y,
      width: Math.max(1, width / n - 2), height: 12,
      fill: i < filled ? STYLE.text : '#414141',
    }));
  }
}
