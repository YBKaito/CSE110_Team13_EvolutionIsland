import Konva from 'konva';
import type { ScreenSwitcher, Screen } from './screens/ScreenController';
import { STAGE_WIDTH, STAGE_HEIGHT } from './constants';
import { DEFAULT_PREFERENCES } from './traits';
import { MockEnvironmentPublisher } from './mocks/MockEnvironmentPublisher';
import { MockGenerationPublisher } from './mocks/MockGenerationPublisher';
import { MockGameCoordinator } from './mocks/MockGameCoordinator';
import { EvolutionScreenController } from './screens/EvolutionScreen/EvolutionScreenController';
import { EvolutionScreenModel } from './screens/EvolutionScreen/EvolutionScreenModel';
import { EvolutionScreenView } from './screens/EvolutionScreen/EvolutionScreenView';
import { GameScreenController } from './screens/GameScreen/GameScreenController';
import {
  STYLE, styleCanvas, styleText, styleFeatherImageSlot, styleOption,
} from './konvaUI';

/** Mock-only entry point: uses existing ScreenController/ScreenSwitcher routing. */
class App implements ScreenSwitcher {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;
  private readonly mockCoordinator: MockGameCoordinator;
  private readonly gameController: GameScreenController;
  private readonly evolutionController: EvolutionScreenController;
  private readonly resultGroup = new Konva.Group({ visible: false });

  constructor(container: string) {
    this.stage = new Konva.Stage({
      container, width: STAGE_WIDTH, height: STAGE_HEIGHT,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    const environment = new MockEnvironmentPublisher();
    const generations = new MockGenerationPublisher({
      seed: 6783, initialPopulation: 120,
    });
    this.mockCoordinator = new MockGameCoordinator(environment, generations, 10);

    const choiceModel = new EvolutionScreenModel(
      generations.getPopulation(),
      generations.getInitialCounts(),
      environment.getState(),
      DEFAULT_PREFERENCES,
    );
    const choiceView = new EvolutionScreenView();
    this.evolutionController = new EvolutionScreenController(
      choiceModel, choiceView, this.mockCoordinator, this,
    );
    this.gameController = new GameScreenController(this.mockCoordinator);

    // Each view uses STAGE_WIDTH and STAGE_HEIGHT from constants.ts.
    // Do not add an additional scale transform.
    this.layer.add(
      this.gameController.getView().getGroup(),
      this.evolutionController.getView().getGroup(),
      this.resultGroup,
    );
    this.switchToScreen({ type: 'game' });
  }

  private drawResult(score: number): void {
    const page = styleCanvas(this.resultGroup);
    styleFeatherImageSlot(page, 26, 21);
    styleFeatherImageSlot(page, STAGE_WIDTH - 132, STAGE_HEIGHT - 136);
    styleText(page, 'Game Over', 171, 84,
      { size: 59, fill: STYLE.warning, width: 820 });
    styleText(page,
      `Your flock went extinct at Generation ${this.mockCoordinator.getGeneration()}.`,
      110, 278, { size: 31, width: 980 });
    styleText(page, `Mock result score: ${score}`, 110, 332,
      { size: 24, fill: STYLE.muted });
    styleOption(page, '1. Restart mock simulation', 110, 456,
      () => window.location.reload(), { width: 810, size: 29 });
  }

  switchToScreen(screen: Screen): void {
    this.gameController.hide();
    this.evolutionController.hide();
    this.resultGroup.hide();

    switch (screen.type) {
      case 'game':
        this.gameController.show();
        break;
      case 'evolution-choice':
        this.evolutionController.show();
        break;
      case 'result':
        this.drawResult(screen.score);
        this.resultGroup.show();
        break;
      case 'menu':
        throw new Error('Menu screen is not registered in this mock demo');
    }
    this.layer.batchDraw();
  }
}

new App('container');
