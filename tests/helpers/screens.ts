import type { Screen, ScreenNavigator, ScreenSpec } from '../../src/screens/ui/screenSpec';

/** Records what a controller asked the host to do, instead of drawing with Konva. */
export class FakeNavigator implements ScreenNavigator {
  shown: Screen[] = [];
  refreshes = 0;

  get current(): Screen | undefined {
    return this.shown.at(-1);
  }

  show(screen: Screen): void {
    this.shown.push(screen);
  }

  refresh(): void {
    this.refreshes++;
  }
}

/** All the words on a screen, one entry per line/cell, for easy assertions. */
export function screenText(spec: ScreenSpec): string[] {
  const lines: string[] = [];
  for (const block of spec.blocks) {
    if (block.kind === 'text') lines.push(block.text);
    if (block.kind === 'table') lines.push(block.columns.join(' | '), ...block.rows.map((r) => r.join(' | ')));
    if (block.kind === 'bars') lines.push(`${block.label}: ${block.segments.map((s) => `${s.option} ${s.count}`).join(', ')}`);
  }
  if (spec.prompt.error) lines.push(spec.prompt.error);
  lines.push(spec.prompt.label);
  return lines;
}
