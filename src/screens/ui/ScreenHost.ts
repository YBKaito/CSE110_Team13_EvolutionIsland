// Owns the Konva stage: scales the screen to the window, collects typed input, and shows one Screen at a time.

import Konva from 'konva';
import type { Screen, ScreenNavigator } from './screenSpec';
import { TerminalRenderer } from './TerminalRenderer';
import { COLORS, SCREEN_HEIGHT, SCREEN_WIDTH } from './theme';

const MAX_INPUT_LENGTH = 12;

export class ScreenHost implements ScreenNavigator {
  private readonly stage: Konva.Stage;
  private readonly layer = new Konva.Layer();
  private readonly background = new Konva.Rect({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: COLORS.background });
  private readonly renderer: TerminalRenderer;
  private current: Screen | null = null;
  private typed = '';

  constructor(private readonly container: HTMLDivElement) {
    this.stage = new Konva.Stage({ container, width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    this.layer.add(this.background);
    this.stage.add(this.layer);
    this.renderer = new TerminalRenderer(this.layer);

    window.addEventListener('resize', () => this.fitToWindow());
    window.addEventListener('keydown', (event) => this.onKey(event));
    window.setInterval(() => this.renderer.toggleCursor(), 500);
    this.fitToWindow();
  }

  show(screen: Screen): void {
    this.current = screen;
    this.typed = '';
    this.draw();
  }

  refresh(): void {
    this.typed = '';
    this.draw();
  }

  private draw(): void {
    if (this.current) this.renderer.render(this.current.spec(), this.typed);
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.current || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = this.typed.trim();
      this.typed = '';
      this.current.submit(input);
      return;
    }
    if (this.current.spec().prompt.mode !== 'choice') return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.typed = this.typed.slice(0, -1);
      this.draw();
    } else if (event.key.length === 1 && this.typed.length < MAX_INPUT_LENGTH) {
      event.preventDefault();
      this.typed += event.key;
      this.draw();
    }
  }

  /** Scales the fixed-size screen to fit the browser window, keeping its shape. */
  private fitToWindow(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const scale = Math.min(width / SCREEN_WIDTH, height / SCREEN_HEIGHT);
    this.stage.width(SCREEN_WIDTH * scale);
    this.stage.height(SCREEN_HEIGHT * scale);
    this.stage.scale({ x: scale, y: scale });
    this.stage.batchDraw();
  }
}
