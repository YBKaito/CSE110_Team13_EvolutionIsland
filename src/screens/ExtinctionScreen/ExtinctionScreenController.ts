import { CONDITIONS, startingScenario, pickSpecies, type Scenario } from '../../minigames/ExtinctionPrediction/ExtinctionModel';
import type { StartingSpecies } from '../../models/GameState';
import { invalidChoiceMessage, parseChoice } from '../format';
import type { Screen, ScreenNavigator, ScreenSpec } from '../ui/screenSpec';
import { buildResultView, type ResultView } from './ExtinctionExplanation';
import {
  conditionSpec, introSpec, resultSpec, reviewChoiceNumber, SUMMARY_CHOICES, summarySpec, WHY_CHOICES, whySpec,
} from './ExtinctionScreenView';

export interface ExtinctionScreenOptions {
  seed: number;	//Seeds the species pick and the simulation
  species?: StartingSpecies;	//Speices from the seed
  avoidSpecies?: string;	//So retry doesn't choose the same species again
  onRestart: (played: StartingSpecies) => void;
  onExit: () => void;
  /** Wording for choice 2 on the last screen; defaults to "Back to minigames". */
  exitLabel?: string;
}

type Step = 'intro' | 'condition' | 'species' | 'summary' | 'result' | 'why';

export class ExtinctionScreenController implements Screen {
  private step: Step = 'intro';
  private conditionIndex = 0;
  private readonly scenario: Scenario = startingScenario();
  private readonly species: StartingSpecies;
  private reviewReturn: Step = 'condition';
  private result: ResultView | null = null;
  private error: string | undefined;

  constructor(
    private readonly nav: ScreenNavigator,
    private readonly options: ExtinctionScreenOptions,
  ) {
    this.species = options.species ?? pickSpecies(options.seed, options.avoidSpecies);
  }

  spec(): ScreenSpec {
    switch (this.step) {
      case 'intro': return introSpec(this.species);
      case 'condition': return conditionSpec(this.conditionIndex, this.error, this.species);
      case 'species': return introSpec(this.species); // reviewing the species
      case 'summary': return summarySpec(this.scenario, this.error);
      case 'result': return resultSpec(this.requireResult());
      case 'why': return whySpec(this.requireResult(), this.error, this.options.exitLabel);
    }
  }

  submit(input: string): void {
    switch (this.step) {
      case 'intro': return this.go('condition');
      case 'condition': return this.submitCondition(input);
      case 'species': return this.go(this.reviewReturn);
      case 'summary': return this.submitSummary(input);
      case 'result': return this.go('why');
      case 'why': return this.submitWhy(input);
    }
  }

  private submitCondition(input: string): void {
    const condition = CONDITIONS[this.conditionIndex];
    const reviewChoice = reviewChoiceNumber(condition);
    const choice = parseChoice(input, reviewChoice);
    if (choice === null) return this.fail(invalidChoiceMessage(reviewChoice));
    if (choice === reviewChoice) return this.review('condition');

    this.scenario[condition.key] = choice - 1;
    if (this.conditionIndex + 1 < CONDITIONS.length) {
      this.conditionIndex++;
      this.go('condition');
    } else {
      this.go('summary');
    }
  }

  private submitSummary(input: string): void {
    const choice = parseChoice(input, SUMMARY_CHOICES);
    if (choice === 1) {
      this.result = buildResultView(this.species, this.scenario, this.options.seed);
      return this.go('result');
    }
    if (choice === 2) {
      this.conditionIndex = 0;
      return this.go('condition');
    }
    if (choice === 3) {
      return this.review('summary');
    }
    this.fail(invalidChoiceMessage(SUMMARY_CHOICES));
  }

  private submitWhy(input: string): void {
    const choice = parseChoice(input, WHY_CHOICES);
    if (choice === 1) return this.options.onRestart(this.species);
    if (choice === 2) return this.options.onExit();
    this.fail(invalidChoiceMessage(WHY_CHOICES));
  }

  private go(step: Step): void {
    this.step = step;
    this.error = undefined;
    this.nav.refresh();
  }

  private fail(message: string): void {
    this.error = message;
    this.nav.refresh();
  }

  private review(from: Step): void {
    this.reviewReturn = from;
    this.go('species');
  }

  private requireResult(): ResultView {
    if (!this.result) throw new Error('The simulation has not run yet.');
    return this.result;
  }
}
