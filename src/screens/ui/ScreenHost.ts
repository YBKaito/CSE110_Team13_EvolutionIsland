/**
 * This handles showing and switching between the game's screens.
 * The generation and event screens give us a ScreenSpec to draw, while the
 * Evolution Choice screen already has its own Konva view.
 * Both can use the same stage, so we only need one place to manage navigation.
 */

import Konva from 'konva';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../../constants';
import type { ScreenController } from '../ScreenController';
import type { Screen, ScreenNavigator } from './screenSpec';
import { TerminalRenderer } from './TerminalRenderer';
import { COLORS, SCREEN_HEIGHT, SCREEN_WIDTH } from './theme';

const MAX_INPUT_LENGTH = 12;

// Both types of screens can be passed into show(), even though they draw differently.
type HostedScreen = Screen | ScreenController;

/** Check if the screen has its own view instead of a ScreenSpec we need to render. */
function isVisualScreen(screen: HostedScreen): screen is ScreenController {
  return 'getView' in screen;
}

export class ScreenHost implements ScreenNavigator {
  private readonly stage: Konva.Stage;
  private readonly layer = new Konva.Layer();
  private readonly background = new Konva.Rect({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: COLORS.background });
  // Keep custom views on a separate layer so they don't replace the text screen's objects.
  private readonly visualLayer = new Konva.Layer();
  private readonly renderer: TerminalRenderer;
  private current: HostedScreen | null = null;
  private typed = '';

  constructor(private readonly container: HTMLDivElement) {
    this.stage = new Konva.Stage({ container, width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    this.layer.add(this.background);
    this.stage.add(this.layer);
    this.stage.add(this.visualLayer);
    // There isn't a custom view on screen when the game first starts.
    this.visualLayer.hide();
    this.renderer = new TerminalRenderer(this.layer);

    window.addEventListener('resize', () => this.fitToWindow());
    window.addEventListener('keydown', (event) => this.onKey(event));
    window.setInterval(() => this.renderer.toggleCursor(), 500);
    this.fitToWindow();
  }

  /**
   * Switch to the requested screen using the same method for both screen types.
   * If the previous screen had its own Konva view, we hide and detach it first.
   * We don't destroy that view because the player might need it again at a later checkpoint.
   */
  show(screen: HostedScreen): void {
    if (this.current && isVisualScreen(this.current)) {
      this.current.hide();
      // Remove it from the layer without deleting the view or its saved state.
      this.current.getView().getGroup().remove();
    }
    // Clear anything left from the previous visual screen before showing the next one.
    this.visualLayer.destroyChildren();
    this.visualLayer.hide();
    this.current = screen;
    this.typed = '';
    if (isVisualScreen(screen)) {
      // The two screen layouts use different dimensions, so scale and center
      // the custom view to fit the same stage as the generation and event screens.
      const scale = Math.min(SCREEN_WIDTH / STAGE_WIDTH, SCREEN_HEIGHT / STAGE_HEIGHT);
      const group = new Konva.Group({
        x: (SCREEN_WIDTH - STAGE_WIDTH * scale) / 2,
        y: (SCREEN_HEIGHT - STAGE_HEIGHT * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      });
      group.add(screen.getView().getGroup());
      this.visualLayer.add(
        new Konva.Rect({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: COLORS.background }),
        group,
      );
      this.visualLayer.show();
      screen.show();
    } else {
      // Text-style screens are drawn from their ScreenSpec by the existing renderer.
      this.draw();
    }
  }

  /** Clear the typed input and redraw the current text screen after it changes. */
  refresh(): void {
    this.typed = '';
    this.draw();
  }

  private draw(): void {
    if (this.current && !isVisualScreen(this.current)) {
      this.renderer.render(this.current.spec(), this.typed);
    }
  }

  private onKey(event: KeyboardEvent): void {
    // The Evolution Choice controller already handles its own keyboard input.
    // We also ignore keys when the game is hidden so typing in the main menu
    // doesn't accidentally send input to the previous game screen.
    if (this.container.hidden || !this.current || isVisualScreen(this.current) ||
      event.metaKey || event.ctrlKey || event.altKey) return;
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

  /**
   * The game uses a fixed coordinate system, but the browser window can be any size.
   * Scale the stage evenly so the whole screen fits without getting stretched.
   */
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
