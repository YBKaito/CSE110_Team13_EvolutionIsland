import Konva from 'konva';
import type { Group } from 'konva/lib/Group';
import type { View } from '../ScreenController';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../../constants';
import { signed } from '../../stats';
import { TRAITS, traitKeys, adjacentTargets, labelFor } from '../../traits';
import type { TraitKey } from '../../types';
import type {
  EvolutionScreenRenderState,
  EvolutionScreenViewHandlers,
} from './EvolutionScreenTypes';
import { loadPixelifySans } from './loadPixelifySans';

/**
 * Draws the three evolution choice pages:
 * evolution choice, current stats, and previous choices.
 * All actions go back to the controller through handlers.
 *
 * The layout uses a 1200 x 820 coordinate system, then scales to the STAGE_WIDTH and STAGE_HEIGHT in constants.
 */
const UI_WIDTH = 1200;
const UI_HEIGHT = 820;
const FONT = 'Pixelify Sans, monospace';
const COLOR = {
  bg: '#1d1d1d',
  white: '#f7f7f7',
  muted: '#c1c1c1',
  dim: '#858585',
  red: '#f04444',
  hover: '#343434',
  selected: '#3c3c3c',
  border: '#737373',
} as const;

interface TextOptions {
  size?: number;
  width?: number;
  fill?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

/**
 * Add a Konva Text object to a group and return it if we ever need it later.
 */
function text(parent: Group, value: string, x: number, y: number, options: TextOptions = {}): Konva.Text {
  const t = new Konva.Text({
    x, y,
    text: value,
    fontFamily: FONT,
    fontSize: options.size ?? 28,
    fontStyle: options.bold ? 'bold' : 'normal',
    fill: options.fill ?? COLOR.white,
    width: options.width,
    align: options.align ?? 'left',
    lineHeight: 1.22,
    listening: false,
    wrap: 'word',
  });
  parent.add(t);
  return t;
}

/** Draw a divider between sections of a page. */
function line(parent: Group, y: number, x = 105, width = 990): void {
  parent.add(new Konva.Line({
    points: [x, y, x + width, y], stroke: COLOR.border, strokeWidth: 1,
  }));
}

/**
 * Draw one clickable text-menu option, like '5. View current stats'.
 * The background changes on hover/selection.
 */
function option(
  parent: Group, value: string, x: number, y: number, onClick: () => void,
  options: { width?: number; size?: number; selected?: boolean; disabled?: boolean } = {},
): void {
  const width = options.width ?? 460;
  const size = options.size ?? 28;
  const row = new Konva.Group({ x, y });
  const normal = options.selected ? COLOR.selected : COLOR.bg;
  const background = new Konva.Rect({
    x: -9, y: -5, width, height: size + 22, fill: normal,
  });
  row.add(background);
  text(row, value, 0, 0, {
    size, width: width - 18, fill: options.disabled ? COLOR.dim : COLOR.white,
  });
  if (!options.disabled) {
    row.on('click tap', onClick);
    row.on('mouseenter', () => {
      background.fill(COLOR.hover);
      if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
      row.getLayer()?.batchDraw();
    });
    row.on('mouseleave', () => {
      background.fill(normal);
      if (typeof document !== 'undefined') document.body.style.cursor = 'default';
      row.getLayer()?.batchDraw();
    });
  }
  parent.add(row);
}

/** Feather image */
function featherImagePlaceholder(parent: Group, x: number, y: number): void {
  Konva.Image.fromURL("graphics/feather.png", function (image) {
    image.x(x);
    image.y(y);
    image.width(125);
    image.height(125);
    parent.add(image);
  });
}

/** Draw a title and subtitle in the same spot on each page. */
function header(parent: Group, title: string, subtitle: string): void {
  text(parent, title, 171, 69, { size: 45, width: 880, bold: true });
  text(parent, subtitle, 171, 136, { size: 25, width: 875, fill: COLOR.muted });
}

/** Show keyboard controls near the bottom of a page. */
function bottomHint(parent: Group, value: string): void {
  text(parent, value, 105, 766, { size: 18, fill: COLOR.dim, width: 955 });
}

/** Draw a segmented bar showing how common a trait is. */
function bar(parent: Group, x: number, y: number, width: number, ratio: number): void {
  const cells = 24;
  const filled = Math.round(cells * Math.min(1, Math.max(0, ratio)));
  for (let i = 0; i < cells; i++) {
    parent.add(new Konva.Rect({
      x: x + (width / cells) * i, y,
      width: width / cells - 2, height: 14,
      fill: i < filled ? COLOR.white : '#414141',
    }));
  }
}

export class EvolutionScreenView implements View {
  private readonly group: Group = new Konva.Group({ visible: false });
  private handlers: EvolutionScreenViewHandlers | null = null;

  /** Load the pixel font, then redraw once the browser has it. */
  constructor() {
    void loadPixelifySans().then(() => this.group.getLayer()?.batchDraw());
  }

  /** Give the screen manager the group it should add to the layer. */
  getGroup(): Group { return this.group; }
  /** Show the current evolution choice page. */
  show(): void { this.group.show(); this.group.getLayer()?.batchDraw(); }
  /** Hide the page and reset the mouse cursor. */
  hide(): void {
    this.group.hide();
    if (typeof document !== 'undefined') document.body.style.cursor = 'default';
    this.group.getLayer()?.batchDraw();
  }
  /** Connect clicks to the controller without putting game logic in the view. */
  bind(handlers: EvolutionScreenViewHandlers): void { this.handlers = handlers; }

  /** Clear the group and draw the page requested by the controller. */
  render(state: EvolutionScreenRenderState): void {
    this.group.destroyChildren();
    this.group.add(new Konva.Rect({
      x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: COLOR.bg,
    }));

    // Keep the design in the same proportions if the stage size changes.
    const scale = Math.min(STAGE_WIDTH / UI_WIDTH, STAGE_HEIGHT / UI_HEIGHT);
    const canvas = new Konva.Group({
      x: (STAGE_WIDTH - UI_WIDTH * scale) / 2,
      y: (STAGE_HEIGHT - UI_HEIGHT * scale) / 2,
      scaleX: scale,
      scaleY: scale,
    });
    this.group.add(canvas);

    featherImagePlaceholder(canvas, 26, 21);
    featherImagePlaceholder(canvas, 1068, 684);

    switch (state.page) {
      case 'choice': this.choicePage(canvas, state); break;
      case 'stats': this.statsPage(canvas, state); break;
      case 'decisions': this.decisionsPage(canvas, state); break;
    }
    if (state.model.error) {
      text(canvas, state.model.error, 105, 714, { size: 24, fill: COLOR.red, width: 960 });
    }
    this.group.getLayer()?.batchDraw();
  }

  /** Draw the trait picker and links to the other two pages. */
  private choicePage(g: Group, s: EvolutionScreenRenderState): void {
    const prefs = s.model.getPreferences();
    header(g, 'Evolution Choice', `Generation ${s.generation}  |  Observation every ${s.interval} generations`);
    text(g, 'Choose one trait to favor in future offspring.', 105, 202, { size: 29 });
    text(g, 'Select a trait:', 116, 260, { size: 25, fill: COLOR.muted });
    traitKeys.forEach((key: TraitKey, i) => {
      const value = `${i + 1}. ${TRAITS[key].label}: ${labelFor(key, prefs[key])}`;
      option(g, value, 122, 312 + i * 58, () => this.handlers?.selectTrait(key), {
        width: 485,
        size: 26,
        selected: s.selectedTrait === key,
      });
    });

    // Show only the options immediately next to the current preference.
    const trait = s.selectedTrait;
    const targets = adjacentTargets(trait, prefs[trait]);
    text(g, `Favor ${TRAITS[trait].label.toLowerCase()}:`, 644, 262,
      { size: 27, width: 435 });
    if (targets.length === 0) {
      text(g, 'No adjacent options are available.', 648, 321,
        { size: 24, width: 395, fill: COLOR.muted });
    }
    targets.forEach((target, i) => {
      const index = TRAITS[trait].options.findIndex(o => o.id === target);
      const currentIndex = TRAITS[trait].options.findIndex(o => o.id === prefs[trait]);
      const arrow = index < currentIndex ? '<' : '>';
      option(g, `${arrow} ${labelFor(trait, target)}`, 651, 320 + i * 65,
        () => this.handlers?.selectTarget(target), {
          width: 400, size: 29, selected: s.selectedTarget === target,
        });
    });

    const current = s.model.getCurrentObservation();
    // A choice is still valid at 0%. This number is only shown as information.
    const share = s.selectedTarget
      ? Math.round(100 * (current.traitCounts[trait][s.selectedTarget] ?? 0) /
          Math.max(1, current.results.newPopulation))
      : null;
    text(g, s.selectedTarget
      ? `Selected: ${labelFor(trait, s.selectedTarget)} (${share}% of flock)`
      : 'Select a neighboring option above.',
    639, 472, { size: 23, width: 450, fill: COLOR.muted });

    option(g,
      s.submitting ? 'Saving preference...' : 'S. Confirm and continue',
      645, 530, () => this.handlers?.submit(),
      { width: 415, size: 28, disabled: s.submitting || !s.selectedTarget });

    line(g, 616);
    option(g, '5. View current stats', 116, 643,
      () => this.handlers?.openPage('stats'), { width: 460, size: 27 });
    option(g, '6. Review previous choices', 616, 643,
      () => this.handlers?.openPage('decisions'), { width: 454, size: 27 });
    bottomHint(g, '1-4 SELECT TRAIT   |   LEFT/RIGHT SELECT OPTION   |   S/ENTER CONFIRM');
  }

  /** Draw the saved population, trait, and environment statistics. */
  private statsPage(g: Group, s: EvolutionScreenRenderState): void {
    // The current and previous saved checkpoints let us show changes over time.
    const current = s.model.getCurrentObservation();
    const previous = s.model.getPreviousObservation();
    const population = current.results.newPopulation;
    const previousPopulation = previous?.results.newPopulation ?? population;
    const change = population - previousPopulation;
    header(g, 'Current Flock & Island Stats',
      `Generation ${s.generation}   |   Compared with Generation ${previous?.generation ?? 0}`);

    text(g, `Population: ${population}`, 110, 206, { size: 31 });
    text(g, `Net change: ${signed(change)}`, 559, 206,
      { size: 29, fill: change < 0 ? COLOR.red : COLOR.white });
    line(g, 259);

    text(g, 'Trait distributions', 110, 275, { size: 27 });
    const prefs = s.model.getPreferences();
    traitKeys.forEach((key, i) => {
      const y = 319 + i * 69;
      const options = TRAITS[key].options;
      text(g, TRAITS[key].label, 111, y, { size: 25, width: 226 });
      const shares = options.map(o => {
        const count = current.traitCounts[key][o.id] ?? 0;
        return `${o.label}: ${Math.round(100 * count / Math.max(population, 1))}%`;
      }).join('   ');
      text(g, shares, 362, y, { size: 21, width: 685 });
      const focusedCount = current.traitCounts[key][prefs[key]] ?? 0;
      bar(g, 364, y + 33, 638, focusedCount / Math.max(population, 1));
    });

    line(g, 593);
    text(g, 'Current island conditions (0-100 index):', 110, 606,
      { size: 22, fill: COLOR.muted });
    const env = current.environment;
    const islandValues: Array<[string, number]> = [
      ['Temperature', env.temperature], ['Rainfall', env.rainfall],
      ['Soft plants', env.softPlants], ['Small seeds', env.smallSeeds],
      ['Hard seeds', env.hardSeeds], ['Insects', env.insects],
      ['Predators', env.predationPressure], ['Habitat cover', env.habitatCover],
      ['Competition', env.competition],
    ];
    islandValues.forEach(([name, value], i) => {
      text(g, `${name}: ${value}`, 112 + (i % 3) * 321,
        637 + Math.floor(i / 3) * 24, { size: 19, width: 306 });
    });
    const [r, gr, b] = env.habitatBackground;
    text(g, `Habitat color: RGB(${r}, ${gr}, ${b})`, 110, 711,
      { size: 18, fill: COLOR.muted, width: 485 });
    g.add(new Konva.Rect({ x: 534, y: 713, width: 24, height: 21,
      fill: `rgb(${r},${gr},${b})`, stroke: COLOR.white, strokeWidth: 1 }));
    option(g, '1. Return to Evolution Choice', 112, 740,
      () => this.handlers?.back(), { width: 710, size: 23 });
  }

  /** Show current preferences and the player's latest trait choices. */
  private decisionsPage(g: Group, s: EvolutionScreenRenderState): void {
    header(g, 'Previous Trait Choices', `Generation ${s.generation}   |   Changes to future breeding preferences`);
    const prefs = s.model.getPreferences();
    const decisions = s.model.getDecisions();
    text(g, 'Current preferences:', 110, 214, { size: 30 });
    traitKeys.forEach((key, i) => {
      const x = i % 2 === 0 ? 119 : 626;
      const y = 267 + Math.floor(i / 2) * 51;
      text(g, `${TRAITS[key].label}: ${labelFor(key, prefs[key])}`,
        x, y, { size: 25, width: 460 });
    });
    line(g, 393);
    text(g, 'Decisions at earlier checkpoints:', 110, 417, { size: 29 });
    if (decisions.length === 0) {
      text(g, 'No traits have been favored yet.', 131, 489,
        { size: 27, fill: COLOR.muted });
    } else {
      // Only show the last five decisions so this page does not overflow.
      const visible = decisions.slice(-5);
      const startIndex = decisions.length - visible.length;
      visible.forEach((d, i) => {
        text(g,
          `Gen ${d.generation}: ${TRAITS[d.traitKey].label}  ${labelFor(d.traitKey, d.fromValue)} -> ${labelFor(d.traitKey, d.targetValue)}`,
          130, 477 + i * 42, { size: 24, width: 940 });
      });
      if (startIndex > 0) {
        text(g, `Showing the 5 most recent of ${decisions.length} choices.`, 130, 689,
          { size: 19, fill: COLOR.dim });
      }
    }
    option(g, '1. Return to Evolution Choice', 112, 719,
      () => this.handlers?.back(), { width: 710, size: 25 });
    bottomHint(g, 'ENTER / B / ESC = BACK TO EVOLUTION CHOICE');
  }
}
