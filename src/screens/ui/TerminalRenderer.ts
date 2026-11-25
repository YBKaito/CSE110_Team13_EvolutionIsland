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

function makeText(value: string, x: number, y: number, size: TextSize, color: TextColor = 'normal', bold = false, width?: number, align: 'left' | 'center' | 'right' = 'left'): Konva.Text {
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
    align,
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
        const node = makeText(block.text, x, y, size, block.color, block.bold, CONTENT_WIDTH - (block.indent ?? 0), block.align);
        this.content.add(node);
        return y + node.height() + LINE_GAP[size];
      }
      case 'table':
        return this.drawTable(block, y);
      case 'bars':
        return this.drawBars(block, y);
      case 'statCards':
        return this.drawStatCards(block, y);
      case 'lineChart':
        return this.drawLineChart(block, y);
    }
  }

  private drawLineChart(block: Extract<Block, { kind: 'lineChart' }>, y: number): number {
    const left = MARGIN_X;
    const panelGap = block.sidePanel ? 18 : 0;
    const chartWidth = block.width - (block.sidePanel ? 316 + panelGap : 0);
    const plotX = left + 72;
    const plotY = y + 54;
    const plotWidth = chartWidth - 94;
    const plotHeight = block.height - 114;
    const plotBottom = plotY + plotHeight;
    const xMax = Math.max(1, block.xMax);
    const xFor = (generation: number) => plotX + (generation / xMax) * plotWidth;
    const yFor = (percentage: number) => plotBottom - (percentage / 100) * plotHeight;

    this.content.add(new Konva.Text({
      x: left,
      y: y + 8,
      text: block.yLabel,
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZES.small + 2,
      fill: COLORS.muted,
      wrap: 'none',
      listening: false,
    }));

    const legendCellWidth = plotWidth / Math.max(1, block.series.length);
    block.series.forEach((series, index) => {
      const legendX = plotX + index * legendCellWidth;
      this.content.add(new Konva.Line({
        points: [legendX, y + 38, legendX + 22, y + 38],
        stroke: series.color,
        strokeWidth: 3,
        listening: false,
      }));
      this.content.add(new Konva.Text({
        x: legendX + 28,
        y: y + 28,
        width: Math.max(30, legendCellWidth - 32),
        text: series.label,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZES.small + 2,
        fill: COLORS.normal,
        wrap: 'none',
        listening: false,
      }));
    });

    for (const tick of block.yTicks) {
      const tickY = yFor(tick);
      this.content.add(new Konva.Line({
        points: [plotX, tickY, plotX + plotWidth, tickY],
        stroke: tick === 0 ? COLORS.muted : '#414141',
        strokeWidth: tick === 0 ? 2 : 1,
        listening: false,
      }));
      const label = makeText(String(tick), left + 22, tickY - 10, 'small', 'muted', false, 42);
      label.align('right');
      this.content.add(label);
    }

    this.content.add(new Konva.Line({
      points: [plotX, plotY, plotX, plotBottom],
      stroke: COLORS.muted,
      strokeWidth: 2,
      listening: false,
    }));

    for (const marker of block.eventMarkers ?? []) {
      const markerX = xFor(marker.x);
      this.content.add(new Konva.Line({
        points: [markerX, plotY + 10, markerX, plotY + 24],
        stroke: '#ffd166',
        strokeWidth: 2,
        listening: false,
      }));
      this.content.add(new Konva.RegularPolygon({
        x: markerX,
        y: plotY + 8,
        sides: 4,
        radius: 6,
        rotation: 45,
        fill: '#ffd166',
        listening: false,
      }));
    }

    if (block.selectedGeneration !== undefined) {
      const selectedX = xFor(block.selectedGeneration);
      this.content.add(new Konva.Line({
        points: [selectedX, plotY, selectedX, plotBottom],
        stroke: '#ffffff',
        strokeWidth: 2,
        dash: [3, 5],
        listening: false,
      }));
    }

    for (const tick of block.xTicks) {
      const tickX = xFor(tick);
      this.content.add(new Konva.Line({
        points: [tickX, plotBottom, tickX, plotBottom + 5],
        stroke: COLORS.muted,
        strokeWidth: 1,
        listening: false,
      }));
      const label = makeText(String(tick), tickX - 25, plotBottom + 8, 'small', 'muted', false, 50);
      label.align('center');
      this.content.add(label);
    }

    for (const marker of block.markers ?? []) {
      const markerX = xFor(marker.x);
      this.content.add(new Konva.Line({
        points: [markerX, plotY, markerX, plotBottom],
        stroke: marker.color,
        strokeWidth: 2,
        dash: [6, 5],
        listening: false,
      }));
      const labelX = Math.min(markerX + 5, plotX + plotWidth - 90);
      this.content.add(new Konva.Text({
        x: Math.max(plotX + 2, labelX),
        y: plotY + 2,
        text: marker.label,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZES.small + 2,
        fill: marker.color,
        wrap: 'none',
        listening: false,
      }));
    }

    for (const series of block.series) {
      const points = series.points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
      if (points.length === 1) {
        this.content.add(new Konva.Circle({
          x: xFor(points[0].x),
          y: yFor(points[0].y),
          radius: 4,
          fill: series.color,
          listening: false,
        }));
      } else if (points.length > 1) {
        this.content.add(new Konva.Line({
          points: points.flatMap(point => [xFor(point.x), yFor(point.y)]),
          stroke: series.color,
          strokeWidth: 4,
          lineCap: 'round',
          lineJoin: 'round',
          listening: false,
        }));
      }
      if (block.selectedGeneration !== undefined) {
        for (const point of points.filter(item => item.x === block.selectedGeneration)) {
          this.content.add(new Konva.Circle({
            x: xFor(point.x),
            y: yFor(point.y),
            radius: 6,
            fill: series.color,
            stroke: '#ffffff',
            strokeWidth: 2,
            listening: false,
          }));
        }
      }
    }

    const xLabel = makeText(block.xLabel, plotX, y + block.height - 22, 'small', 'muted', false, plotWidth);
    xLabel.align('center');
    this.content.add(xLabel);

    if (block.sidePanel) {
      const panelX = left + chartWidth + panelGap;
      const panelWidth = block.width - chartWidth - panelGap;
      const textX = panelX + 12;
      const textWidth = panelWidth - 24;
      const contentTop = y + 52;
      const availableHeight = block.height - 62;
      const measureLine = (line: string, fontSize: number): number => new Konva.Text({
        text: line, fontFamily: FONT_FAMILY, fontSize, width: textWidth,
        wrap: 'word', lineHeight: 1.05,
      }).height();
      const measureContent = (fontSize: number): number =>
        block.sidePanel!.introLines.reduce((sum, line) => sum + measureLine(line, fontSize) + 2, 0) +
        measureLine(block.sidePanel!.countHeading, fontSize) + 4 +
        block.sidePanel!.counts.length * Math.max(18, fontSize + 4) +
        block.sidePanel!.footerLines.reduce((sum, line) => sum + measureLine(line, fontSize) + 2, 0) + 10 +
        (block.sidePanel!.footerDividerAfter !== undefined ? 5 : 0);
      let detailFontSize = FONT_SIZES.small;
      while (detailFontSize > 12 && measureContent(detailFontSize) > availableHeight) detailFontSize--;

      this.content.add(new Konva.Rect({
        x: panelX, y, width: panelWidth, height: block.height,
        fill: '#252525', stroke: COLORS.border, strokeWidth: 2, listening: false,
      }));
      const title = makeText(block.sidePanel.title, panelX + 12, y + 12, 'heading', 'normal', false, panelWidth - 24);
      this.content.add(title);

      let lineY = contentTop;
      const drawLine = (line: string): void => {
        const node = new Konva.Text({
          x: textX, y: lineY, text: line, fontFamily: FONT_FAMILY,
          fontSize: detailFontSize, fill: COLORS.normal, width: textWidth,
          wrap: 'word', lineHeight: 1.05, listening: false,
        });
        this.content.add(node);
        lineY += node.height() + 2;
      };
      block.sidePanel.introLines.forEach(drawLine);

      const divider = (): void => {
        this.content.add(new Konva.Line({
          points: [textX, lineY + 1, panelX + panelWidth - 12, lineY + 1],
          stroke: '#555555', strokeWidth: 1, listening: false,
        }));
        lineY += 5;
      };
      divider();
      drawLine(block.sidePanel.countHeading);

      const labelWidth = 66;
      const barWidth = Math.min(104, Math.max(54, textWidth - labelWidth - 122));
      const countX = textX + labelWidth + 8 + barWidth + 8;
      const countWidth = Math.max(40, textWidth - labelWidth - barWidth - 16);
      const rowHeight = Math.max(18, detailFontSize + 4);
      for (const item of block.sidePanel.counts) {
        this.content.add(new Konva.Text({
          x: textX, y: lineY, width: labelWidth, height: rowHeight,
          text: item.label, fontFamily: FONT_FAMILY, fontSize: detailFontSize,
          fill: COLORS.normal, wrap: 'none', listening: false,
        }));
        const barY = lineY + (rowHeight - 8) / 2;
        this.content.add(new Konva.Rect({
          x: textX + labelWidth + 8, y: barY, width: barWidth, height: 8,
          fill: '#414141', listening: false,
        }));
        const share = item.total > 0 ? Math.max(0, Math.min(1, item.count / item.total)) : 0;
        if (share > 0) {
          this.content.add(new Konva.Rect({
            x: textX + labelWidth + 8, y: barY, width: barWidth * share, height: 8,
            fill: item.color, listening: false,
          }));
        }
        this.content.add(new Konva.Text({
          x: countX, y: lineY, width: countWidth, height: rowHeight,
          text: `${item.count} birds`, fontFamily: FONT_FAMILY, fontSize: detailFontSize,
          fill: COLORS.normal, wrap: 'none', listening: false,
        }));
        lineY += rowHeight + 1;
      }

      if (block.sidePanel.footerLines.length > 0) {
        divider();
        block.sidePanel.footerLines.forEach((line, index) => {
          if (index === block.sidePanel!.footerDividerAfter) divider();
          drawLine(line);
        });
      }
    }
    return y + block.height + LINE_GAP.small;
  }

  private drawStatCards(block: Extract<Block, { kind: 'statCards' }>, y: number): number {
    const gap = 14;
    const cardWidth = (block.width - gap * (block.items.length - 1)) / block.items.length;
    const firstX = MARGIN_X + (CONTENT_WIDTH - block.width) / 2;
    block.items.forEach((item, index) => {
      const x = firstX + index * (cardWidth + gap);
      this.content.add(new Konva.Rect({
        x,
        y,
        width: cardWidth,
        height: block.height,
        fill: '#252525',
        stroke: COLORS.border,
        strokeWidth: 2,
        listening: false,
      }));
      const value = new Konva.Text({
        x: x + 12,
        y: y + 3,
        width: cardWidth - 24,
        text: item.value,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZES.heading + 8,
        fontStyle: 'bold',
        fill: item.color ?? COLORS.normal,
        wrap: 'none',
        listening: false,
      });
      value.align('center');
      const label = new Konva.Text({
        x: x + 12,
        y: y + 42,
        width: cardWidth - 24,
        text: item.label,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZES.small + 1,
        fill: COLORS.muted,
        wrap: 'none',
        listening: false,
      });
      label.align('center');
      this.content.add(value, label);
    });
    return y + block.height + LINE_GAP.small;
  }

  private drawTable(block: Extract<Block, { kind: 'table' }>, y: number): number {
    const size = block.size ?? 'body';
    const rowHeight = FONT_SIZES[size] * 1.15 + LINE_GAP[size] + (block.bordered ? 8 : 0);
    const pad = block.bordered ? 12 : 0;
    const top = y;
    const tableWidth = block.columnWidths.reduce((a, b) => a + b, 0) + 2 * pad;
    const tableX = MARGIN_X + (block.align === 'center' ? (CONTENT_WIDTH - tableWidth) / 2 : 0);
    const allRows = [block.columns, ...block.rows];
    allRows.forEach((row, r) => {
      let x = tableX + pad;
      row.forEach((cell, c) => {
        const boldHeader = block.headerBold ?? !!block.bordered;
        this.content.add(makeText(
          cell,
          x,
          y + pad / 2,
          size,
          r === 0 ? 'normal' : block.cellColors?.[r - 1]?.[c] ?? 'normal',
          r === 0 && boldHeader,
          block.columnWidths[c],
          block.align === 'center' ? 'center' : 'left',
        ));
        x += block.columnWidths[c] ?? 120;
      });
      y += rowHeight;
    });
    if (block.bordered) {
      this.content.add(new Konva.Rect({ x: tableX, y: top, width: tableWidth, height: y - top + pad / 2, stroke: COLORS.border, strokeWidth: 2 }));
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
      this.content.add(new Konva.Rect({ x, y: barY, width: BAR.barWidth * share, height: BAR.barHeight, fill: segment.color ?? COLORS.barFilled }));
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
