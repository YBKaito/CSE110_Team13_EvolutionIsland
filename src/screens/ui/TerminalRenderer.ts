// Draws a ScreenSpec with Konva: text lines, tables, trait bars, and the typed-input prompt.

import Konva from 'konva';
import type { Block, PromptSpec, ScreenSpec, TextColor, TextSize } from './screenSpec';
import {
  BAR,
  COLORS,
  FONT_FAMILY,
  FONT_SIZES,
  LINE_GAP,
  MARGIN_BOTTOM,
  MARGIN_TOP,
  MARGIN_X,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from './theme';

const CONTENT_WIDTH = SCREEN_WIDTH - 2 * MARGIN_X;

function makeText(value: string, x: number, y: number, size: TextSize, color: TextColor = 'normal', bold = false, width?: number): Konva.Text {
  return new Konva.Text({
    x,
    y,
    text: value,
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZES[size],
    fontStyle: bold ? 'bold' : 'normal',
    fill: COLORS[color],
    width,
    wrap: width ? 'word' : 'none',
    lineHeight: 1.15,
  });
}

export class TerminalRenderer {
  private readonly content = new Konva.Group();
  private cursor: Konva.Text | null = null;

  constructor(private readonly layer: Konva.Layer) {
    layer.add(this.content);
  }

  /** Redraws the whole screen. `typed` is what the player has typed so far at the prompt. */
  render(spec: ScreenSpec, typed: string): void {
    this.content.destroyChildren();
    this.content.scale({ x: 1, y: 1 });
    let y = MARGIN_TOP;
    for (const block of spec.blocks) y = this.drawBlock(block, y);
    y = this.drawPrompt(spec.prompt, typed, y + LINE_GAP.body);

    // Shrink to fit if a screen has more lines than the canvas.
    const available = SCREEN_HEIGHT - MARGIN_BOTTOM;
    if (y > available) {
      const factor = (available - MARGIN_TOP) / (y - MARGIN_TOP);
      this.content.scale({ x: factor, y: factor });
      this.content.position({ x: (SCREEN_WIDTH * (1 - factor)) / 2, y: MARGIN_TOP * (1 - factor) });
    } else {
      this.content.position({ x: 0, y: 0 });
    }
    this.layer.batchDraw();
  }

  /** Blinks the input cursor. */
  toggleCursor(): void {
    if (!this.cursor) return;
    this.cursor.visible(!this.cursor.visible());
    this.layer.batchDraw();
  }

  private drawBlock(block: Block, y: number): number {
    switch (block.kind) {
      case 'gap':
        return y + (block.size ?? 16);
      case 'text': {
        const size = block.size ?? 'body';
        const x = MARGIN_X + (block.indent ?? 0);
        const node = makeText(block.text, x, y, size, block.color, block.bold, CONTENT_WIDTH - (block.indent ?? 0));
        this.content.add(node);
        return y + node.height() + LINE_GAP[size];
      }
      case 'table':
        return this.drawTable(block, y);
      case 'bars':
        return this.drawBars(block, y);
    }
  }

  private drawTable(block: Extract<Block, { kind: 'table' }>, y: number): number {
    const size = block.size ?? 'body';
    const rowHeight = FONT_SIZES[size] * 1.15 + LINE_GAP[size] + (block.bordered ? 8 : 0);
    const pad = block.bordered ? 12 : 0;
    const top = y;
    const allRows = [block.columns, ...block.rows];
    allRows.forEach((row, r) => {
      let x = MARGIN_X + pad;
      row.forEach((cell, c) => {
        this.content.add(makeText(cell, x, y + pad / 2, size, 'normal', r === 0 && !!block.bordered));
        x += block.columnWidths[c] ?? 120;
      });
      y += rowHeight;
    });
    if (block.bordered) {
      const width = block.columnWidths.reduce((a, b) => a + b, 0) + 2 * pad;
      this.content.add(new Konva.Rect({ x: MARGIN_X, y: top, width, height: y - top + pad / 2, stroke: COLORS.border, strokeWidth: 2 }));
      y += pad;
    }
    return y + LINE_GAP[size];
  }

  private drawBars(block: Extract<Block, { kind: 'bars' }>, y: number): number {
    const size: TextSize = 'small';
    const textY = y;
    const barY = y + (FONT_SIZES[size] * 1.15 - BAR.barHeight) / 2;
    this.content.add(makeText(block.label, MARGIN_X, textY, size));
    let x = MARGIN_X + BAR.labelWidth;
    for (const segment of block.segments) {
      this.content.add(makeText(segment.option, x, textY, size));
      x += BAR.optionWidth;
      const share = segment.total > 0 ? segment.count / segment.total : 0;
      this.content.add(new Konva.Rect({ x, y: barY, width: BAR.barWidth, height: BAR.barHeight, fill: COLORS.barEmpty }));
      this.content.add(new Konva.Rect({ x, y: barY, width: BAR.barWidth * share, height: BAR.barHeight, fill: COLORS.barFilled }));
      x += BAR.barWidth + 8;
      this.content.add(makeText(String(segment.count), x, textY, size));
      x += BAR.countWidth;
    }
    return y + FONT_SIZES[size] * 1.15 + LINE_GAP[size] + 4;
  }

  private drawPrompt(prompt: PromptSpec, typed: string, y: number): number {
    const size = prompt.size ?? 'body';
    if (prompt.error) {
      const error = makeText(prompt.error, MARGIN_X, y, size, 'error', false, CONTENT_WIDTH);
      this.content.add(error);
      y += error.height() + LINE_GAP[size];
    }
    const label = makeText(prompt.label, MARGIN_X, y, size);
    this.content.add(label);
    if (prompt.mode === 'choice') {
      const typedNode = makeText(typed, MARGIN_X + label.width(), y, size);
      this.content.add(typedNode);
      this.cursor = makeText('_', MARGIN_X + label.width() + typedNode.width(), y, size);
      this.content.add(this.cursor);
    } else {
      this.cursor = null;
    }
    return y + label.height();
  }
}
