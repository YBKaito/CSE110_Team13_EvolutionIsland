// US10 Hatching Rhythm: draws the minigame with Konva.
// Layout follows the mockup: title, instructions, egg, note track with the yellow input box, score line.

import Konva from 'konva';
import { COLORS, FONT_FAMILY, SCREEN_HEIGHT, SCREEN_WIDTH } from '../ui/theme';
import type { HatchingRhythmGame } from './HatchingRhythmGame';
import { isOnTrack, noteX, TRACK } from './noteTrack';

const MARGIN_X = 30;
const BOX_COLOR = '#ffff00';
const TRACK_COLOR = '#5a5a5a';
const DIFFICULTY_COLORS = { easy: '#00ff00', hard: '#a00000' } as const;
const FLASH_MS = 120;

export class HatchingRhythmView {
  private readonly stage: Konva.Stage;
  private readonly layer = new Konva.Layer();
  private readonly notesGroup = new Konva.Group();
  private readonly box: Konva.Rect;
  private readonly footer: Konva.Text;

  constructor(private readonly container: HTMLDivElement, game: HatchingRhythmGame) {
    this.stage = new Konva.Stage({ container, width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    this.stage.add(this.layer);
    this.layer.add(new Konva.Rect({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: COLORS.background }));

    this.drawHeader(game);

    // Note track: a grey line the bars slide along.
    this.layer.add(
      new Konva.Rect({
        x: TRACK.startX,
        y: TRACK.y - TRACK.lineHeight / 2,
        width: TRACK.endX - TRACK.startX,
        height: TRACK.lineHeight,
        fill: TRACK_COLOR,
      }),
    );
    this.layer.add(this.notesGroup);

    // Input box: press Enter when a bar is inside it.
    const boxWidth = game.settings.boxWidth;
    this.box = new Konva.Rect({
      x: TRACK.boxCenterX - boxWidth / 2,
      y: TRACK.y - TRACK.boxHeight / 2,
      width: boxWidth,
      height: TRACK.boxHeight,
      stroke: BOX_COLOR,
      strokeWidth: 8,
      cornerRadius: 4,
    });
    this.layer.add(this.box);
    this.layer.add(
      new Konva.Text({
        x: TRACK.boxCenterX - 100,
        y: TRACK.y + TRACK.boxHeight / 2 + 12,
        width: 200,
        align: 'center',
        text: 'Input',
        fontFamily: FONT_FAMILY,
        fontSize: 40,
        fill: BOX_COLOR,
      }),
    );

    this.footer = new Konva.Text({
      x: MARGIN_X,
      y: SCREEN_HEIGHT - 50,
      width: SCREEN_WIDTH - MARGIN_X * 2,
      fontFamily: FONT_FAMILY,
      fontSize: 26,
      fill: COLORS.normal,
    });
    this.layer.add(this.footer);

    window.addEventListener('resize', this.fitToWindow);
    this.fitToWindow();
  }

  /** Redraws everything that moves. Called once per animation frame. */
  render(game: HatchingRhythmGame): void {
    this.notesGroup.destroyChildren();
    for (const note of game.activeNotes) {
      const x = noteX(note, game.time, game.settings);
      if (!isOnTrack(x)) continue;
      this.notesGroup.add(
        new Konva.Rect({
          x: x - TRACK.noteWidth / 2,
          y: TRACK.y - TRACK.noteHeight / 2,
          width: TRACK.noteWidth,
          height: TRACK.noteHeight,
          fill: COLORS.normal,
        }),
      );
    }

    const flashing = game.time - game.lastPressTime < FLASH_MS;
    this.box.stroke(flashing ? COLORS.normal : BOX_COLOR);

    this.footer.text(game.isFinished ? 'Song over! Press Enter to go back to the minigames.' : 'Press Esc to quit.');
    this.layer.batchDraw();
  }

  destroy(): void {
    window.removeEventListener('resize', this.fitToWindow);
    this.stage.destroy();
  }

  private drawHeader(game: HatchingRhythmGame): void {
    const title = new Konva.Text({
      x: MARGIN_X,
      y: 20,
      text: 'Hatching Rhythm ',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      fontSize: 64,
      fill: COLORS.normal,
    });
    this.layer.add(title);
    this.layer.add(
      new Konva.Text({
        x: MARGIN_X + title.width(),
        y: 20,
        text: `{${game.difficulty}}`,
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        fontSize: 64,
        fill: DIFFICULTY_COLORS[game.difficulty],
      }),
    );
    this.layer.add(
      new Konva.Text({
        x: MARGIN_X,
        y: 100,
        width: SCREEN_WIDTH - MARGIN_X * 2,
        text:
          'Your eggs are hatching. Bars slide toward the box at the bottom. ' +
          'Press Enter when a bar sits inside the box. Better timing means more eggs hatch.',
        fontFamily: FONT_FAMILY,
        fontSize: 26,
        lineHeight: 1.3,
        fill: COLORS.normal,
      }),
    );
  }

  /** Scales the fixed-size screen to fit the browser window, keeping its shape. */
  private readonly fitToWindow = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const scale = Math.min(width / SCREEN_WIDTH, height / SCREEN_HEIGHT);
    this.stage.width(SCREEN_WIDTH * scale);
    this.stage.height(SCREEN_HEIGHT * scale);
    this.stage.scale({ x: scale, y: scale });
    this.stage.batchDraw();
  };
}
