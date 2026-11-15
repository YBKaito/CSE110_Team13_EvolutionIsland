// US10 Hatching Rhythm: draws the minigame with Konva.
// Layout follows the mockup: title, instructions, egg, note track with the yellow input box, score line.

import Konva from 'konva';
import { COLORS, FONT_FAMILY, SCREEN_HEIGHT, SCREEN_WIDTH } from '../ui/theme';
import { HARD_MESSAGE } from './difficulty';
import { EGG_SPRITES, eggStage, type EggStage } from './eggSprite';
import type { HatchingRhythmGame } from './HatchingRhythmGame';
import { isOnTrack, noteX, TRACK } from './noteTrack';
import { formatPercent, type Judgment } from './timingJudge';

const MARGIN_X = 30;
const BOX_COLOR = '#ffff00';
const TRACK_COLOR = '#5a5a5a';
const DIFFICULTY_COLORS = { easy: '#00ff00', hard: '#a00000' } as const;
const FLASH_MS = 120;
const POPUP_MS = 500;
const JUDGMENT_TEXT: Record<Judgment, { text: string; color: string }> = {
  perfect: { text: 'Perfect!', color: '#00ff00' },
  good: { text: 'Good', color: BOX_COLOR },
  miss: { text: 'Miss', color: COLORS.error },
};
/** x position of each item in the score line, like the mockup. */
const SCORE_COLUMNS = [MARGIN_X, 300, 600, 880] as const;
/** The egg sprites are 304 px wide; this draws them about 128 px wide, centered above the track. */
const EGG_SCALE = 0.42;
const EGG_CENTER_X = SCREEN_WIDTH / 2;
const EGG_BOTTOM_Y = 450;
const WOBBLE_MS = 300;

function loadImage(src: string): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}

export class HatchingRhythmView {
  private readonly stage: Konva.Stage;
  private readonly layer = new Konva.Layer();
  private readonly notesGroup = new Konva.Group();
  private readonly box: Konva.Rect;
  private readonly footer: Konva.Text;
  private readonly popup: Konva.Text;
  private readonly scoreTexts: Konva.Text[];
  private readonly egg = new Konva.Image({ image: undefined, x: EGG_CENTER_X, y: EGG_BOTTOM_Y });
  private readonly eggImages: Record<EggStage, HTMLImageElement> = {
    egg: loadImage(EGG_SPRITES.egg),
    cracked: loadImage(EGG_SPRITES.cracked),
    hatched: loadImage(EGG_SPRITES.hatched),
  };

  constructor(private readonly container: HTMLDivElement, game: HatchingRhythmGame) {
    this.stage = new Konva.Stage({ container, width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    this.stage.add(this.layer);
    this.layer.imageSmoothingEnabled(false); // keep the pixel art crisp when scaled
    this.layer.add(new Konva.Rect({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: COLORS.background }));

    this.drawHeader(game);
    this.egg.scale({ x: EGG_SCALE, y: EGG_SCALE });
    this.layer.add(this.egg);

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

    // "Perfect!" / "Good" / "Miss" popup above the box.
    this.popup = new Konva.Text({
      x: TRACK.boxCenterX - 150,
      y: TRACK.y - TRACK.boxHeight / 2 - 50,
      width: 300,
      align: 'center',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      fontSize: 34,
    });
    this.layer.add(this.popup);

    // Hint in the bottom right, above the score line.
    this.footer = new Konva.Text({
      x: MARGIN_X,
      y: TRACK.y + TRACK.boxHeight / 2 + 20,
      width: SCREEN_WIDTH - MARGIN_X * 2,
      align: 'right',
      fontFamily: FONT_FAMILY,
      fontSize: 22,
      fill: COLORS.muted,
    });
    this.layer.add(this.footer);

    // Score line: Perfect, Good, Miss, Accuracy.
    this.scoreTexts = SCORE_COLUMNS.map((x) => {
      const t = new Konva.Text({ x, y: SCREEN_HEIGHT - 50, fontFamily: FONT_FAMILY, fontSize: 30, fill: COLORS.normal });
      this.layer.add(t);
      return t;
    });

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

    const last = game.lastJudgment;
    if (last && game.time - last.time < POPUP_MS) {
      const style = JUDGMENT_TEXT[last.judgment];
      this.popup.text(style.text);
      this.popup.fill(style.color);
      this.popup.opacity(1 - (game.time - last.time) / POPUP_MS);
    } else {
      this.popup.text('');
    }

    const tally = game.tally;
    this.drawEgg(eggStage(tally, game.isFinished), game);

    const scores = [`Perfect: ${tally.perfect}`, `Good: ${tally.good}`, `Miss: ${tally.miss}`, `Accuracy: ${formatPercent(game.accuracy)}`];
    scores.forEach((value, i) => this.scoreTexts[i].text(value));

    this.footer.text(game.isFinished ? 'Song over! Press Enter to go back to the minigames.' : 'Press Esc to quit.');
    this.layer.batchDraw();
  }

  destroy(): void {
    window.removeEventListener('resize', this.fitToWindow);
    this.stage.destroy();
  }

  /** Shows the sprite for this stage, anchored at its bottom center, with a small wobble after each hit. */
  private drawEgg(stage: EggStage, game: HatchingRhythmGame): void {
    const image = this.eggImages[stage];
    if (!image.complete || image.naturalWidth === 0) return; // still loading
    if (this.egg.image() !== image) {
      this.egg.image(image);
      this.egg.offset({ x: image.naturalWidth / 2, y: image.naturalHeight });
    }
    const last = game.lastJudgment;
    const sinceHit = last && last.judgment !== 'miss' ? game.time - last.time : Number.POSITIVE_INFINITY;
    const wobble = sinceHit < WOBBLE_MS ? Math.sin((sinceHit / WOBBLE_MS) * Math.PI * 4) * 6 * (1 - sinceHit / WOBBLE_MS) : 0;
    this.egg.rotation(game.isFinished ? 0 : wobble);
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

    // Hard mode explains why: the bird's poor fitness made the bars faster and the box smaller.
    if (game.difficulty === 'hard') {
      this.layer.add(
        new Konva.Text({
          x: 330,
          y: 260,
          width: 300,
          text: HARD_MESSAGE,
          fontFamily: FONT_FAMILY,
          fontSize: 28,
          lineHeight: 1.3,
          fill: COLORS.normal,
        }),
      );
    }
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
