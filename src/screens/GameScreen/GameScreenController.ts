import Konva from 'konva';
import type { Group } from 'konva/lib/Group';
import { ScreenController, type View } from '../ScreenController';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../../constants';
import {
  STYLE, styleCanvas, styleText, styleRule, styleOption,
  styleBar, styleFeatherImageSlot,
} from '../../konvaUI';
import { loadPixelifySans } from '../EvolutionScreen/loadPixelifySans';
import { MockGameCoordinator } from '../../mocks/MockGameCoordinator';
import { TRAITS, traitKeys, labelFor } from '../../traits';
import { netDelta, signed } from '../../stats';
import type { GenerationCompleted, TraitKey, TraitCounts } from '../../types';

/**
 * Mock generation screen using the shared game style.
 * It reads mock US3/US4 data but does NOT implement simulation logic.
 * Both mouse and keyboard actions go through the same coordinator.
 */
export class GameScreenController extends ScreenController implements View {
  private readonly group: Group = new Konva.Group({ visible: false });
  private readonly unsubscribers: Array<() => void> = [];
  private latest: GenerationCompleted | null = null;
  private active = false;

  constructor(private readonly coordinator: MockGameCoordinator) {
    super();
    this.unsubscribers.push(
      this.coordinator.generations.subscribe(result => {
        this.latest = result;
        if (this.active) this.render();
      }),
    );
    void loadPixelifySans().then(() => {
      if (this.active) this.render();
    });
  }

  getView(): View { return this; }
  getGroup(): Group { return this.group; }

  override show(): void {
    this.active = true;
    this.group.show();
    this.render();
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
    }
  }

  override hide(): void {
    this.active = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
    }
    if (typeof document !== 'undefined') document.body.style.cursor = 'default';
    this.group.hide();
    this.group.getLayer()?.batchDraw();
  }

  /** Call during complete run teardown, not when navigating to US5. */
  dispose(): void {
    this.hide();
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers.length = 0;
    this.group.destroy();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.active || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === '1') this.advanceOne();
    if (event.key === '2') this.advanceSeveral(5);
    if (event.key === '3' || event.key.toLowerCase() === 'n') this.advanceToObservation();
  };

  private advanceOne(): void {
    if (!this.active || this.coordinator.isPaused() || this.coordinator.isEnded()) return;
    this.coordinator.advanceOne();
    if (this.active) this.render();
  }

  private advanceSeveral(count: number): void {
    if (!this.active) return;
    for (let i = 0; i < count && !this.coordinator.isPaused() && !this.coordinator.isEnded(); i++) {
      this.coordinator.advanceOne();
    }
    if (this.active) this.render();
  }

  private advanceToObservation(): void {
    if (!this.active || this.coordinator.isPaused() || this.coordinator.isEnded()) return;
    this.coordinator.advanceToNextCheckpoint();
    if (this.active) this.render();
  }

  private drawTrait(
    page: Group, key: TraitKey, counts: TraitCounts, population: number,
    x: number, y: number,
  ): void {
    const options = TRAITS[key].options;
    const dominant = options.reduce((best, option) =>
      (counts[key][option.id] ?? 0) > (counts[key][best.id] ?? 0) ? option : best,
    );
    const carriers = counts[key][dominant.id] ?? 0;
    const ratio = population > 0 ? carriers / population : 0;
    styleText(page, `${TRAITS[key].label}: ${labelFor(key, dominant.id)} (${Math.round(ratio * 100)}%)`,
      x, y, { size: 23, width: 440 });
    styleBar(page, x, y + 33, 416, ratio);
  }

  render(): void {
    const page = styleCanvas(this.group);
    styleFeatherImageSlot(page, 26, 21);
    styleFeatherImageSlot(page, STAGE_WIDTH - 132, STAGE_HEIGHT - 136);

    const generation = this.coordinator.getGeneration();
    const population = this.coordinator.generations.getPopulation();
    const interval = this.coordinator.observationInterval;
    const nextObservation = generation + (interval - generation % interval);
    const environment = this.coordinator.environment.getState();
    const events = this.latest?.results.eventList ?? [];
    const counts = this.latest?.traitCounts ?? this.coordinator.generations.getInitialCounts();
    const delta = this.latest ? netDelta(this.latest.results) : 0;

    styleText(page, `Generation ${generation}`, 171, 70, { size: 47, bold: true, width: 790 });
    styleText(page, `Your flock: ${population} birds   |   Next observation: Gen ${nextObservation}`,
      171, 134, { size: 25, fill: STYLE.muted, width: 875 });

    styleText(page, 'Island conditions:', 110, 198, { size: 28 });
    styleText(page,
      `Rainfall: ${environment.rainfall}/100    Soft plants: ${environment.softPlants}/100    Hard seeds: ${environment.hardSeeds}/100`,
      111, 238, { size: 22, width: 982 });
    styleText(page,
      `Predators: ${environment.predationPressure}/100    Habitat cover: ${environment.habitatCover}/100`,
      111, 273, { size: 22, width: 982 });
    styleText(page, `Events: ${events.length ? events.join(', ') : 'No active events'}`,
      111, 308, { size: 22, width: 982 });

    styleRule(page, 352);
    styleText(page, `Population: ${population}`, 110, 371, { size: 29, width: 400 });
    styleText(page, `Net change: ${signed(delta)}`, 582, 371,
      { size: 28, width: 400, fill: delta < 0 ? STYLE.warning : STYLE.text });
    styleText(page, 'Birds with each trait:', 111, 423, { size: 27 });
    this.drawTrait(page, traitKeys[0], counts, population, 116, 468);
    this.drawTrait(page, traitKeys[1], counts, population, 116, 536);
    this.drawTrait(page, traitKeys[2], counts, population, 621, 468);
    this.drawTrait(page, traitKeys[3], counts, population, 621, 536);

    styleRule(page, 611);
    styleOption(page, '1. Next generation', 116, 630, () => this.advanceOne(),
      { width: 760, size: 25 });
    styleOption(page, '2. Skip 5 generations', 116, 672, () => this.advanceSeveral(5),
      { width: 760, size: 25 });
    styleOption(page, '3. Continue to next observation', 116, 714,
      () => this.advanceToObservation(), { width: 830, size: 25 });
    styleText(page, 'What is your choice? _', 112, 772,
      { size: 22, fill: STYLE.muted, width: 785 });
    this.group.getLayer()?.batchDraw();
  }
}
