import { createSession, getResult, nextQuestion, submitAnswer } from './quizEngine';
import type { QuizPhase, QuizQuestion, QuizResult, QuizSession } from './quizTypes';
import type { ExitConfirmationView } from './views/ExitConfirmationView';
import type { FeedbackView } from './views/FeedbackView';
import type { IntroView } from './views/IntroView';
import type { QuestionView } from './views/QuestionView';
import type { ResultsView } from './views/ResultsView';
import type { UnavailableView } from './views/UnavailableView';

type ScreenMethods = 'bind' | 'render' | 'show' | 'hide';

export interface QuizViews {
  readonly intro: Pick<IntroView, ScreenMethods>;
  readonly question: Pick<QuestionView, ScreenMethods | 'reset'>;
  readonly feedback: Pick<FeedbackView, ScreenMethods | 'reset'>;
  readonly results: Pick<ResultsView, ScreenMethods | 'reset'>;
  readonly confirmation: Pick<ExitConfirmationView, 'bind' | 'render'>;
  readonly unavailable: Pick<UnavailableView, ScreenMethods>;
}

export interface QuizControllerOptions {
  readonly questions: readonly QuizQuestion[];
  readonly onExit: () => void;
  readonly onComplete?: (result: QuizResult) => void;
}

type ControllerState =
  | { screen: 'intro' }
  | { screen: 'round'; session: QuizSession; confirmationOpen: boolean }
  | { screen: 'unavailable' }
  | { screen: 'disposed' };

/** Coordinates HTML views and the pure engine; owns no simulation or DOM resources. */
export class QuizController {
  private state: ControllerState = { screen: 'intro' };
  private started = false;
  private context = 0;
  private dialogContext = 0;

  constructor(private readonly views: QuizViews, private readonly options: QuizControllerOptions) {}

  show(): void {
    if (this.started || this.state.screen === 'disposed') return;
    this.started = true;
    this.enterIntro();
  }

  dispose(): void {
    if (this.state.screen === 'disposed') return;
    this.state = { screen: 'disposed' };
    this.context++;
    this.dialogContext++;
    this.hideScreens();
    this.views.confirmation.render({ open: false });
    const noop = () => {};
    this.views.intro.bind({ onStart: noop, onBack: noop });
    this.views.question.bind({ onSubmit: noop, onExit: noop });
    this.views.feedback.bind({ onNext: noop, onExit: noop });
    this.views.results.bind({ onRetry: noop, onDone: noop });
    this.views.confirmation.bind({ onKeepPlaying: noop, onLeave: noop });
    this.views.unavailable.bind({ onBack: noop });
  }

  private isCurrent(token: number): boolean {
    return this.state.screen !== 'disposed' && token === this.context;
  }

  private roundFor(token: number, phase: QuizPhase): QuizSession | null {
    if (!this.isCurrent(token) || this.state.screen !== 'round'
      || this.state.confirmationOpen || this.state.session.phase !== phase) return null;
    return this.state.session;
  }

  private hideScreens(): void {
    const { intro, question, feedback, results, unavailable } = this.views;
    for (const view of [intro, question, feedback, results, unavailable]) view.hide();
  }

  private enterIntro(): void {
    const token = ++this.context;
    this.dialogContext++;
    this.state = { screen: 'intro' };
    this.hideScreens();
    this.views.confirmation.render({ open: false });
    this.views.question.reset();
    this.views.feedback.reset();
    this.views.intro.bind({
      onStart: () => { if (this.isCurrent(token)) this.startRound(); },
      onBack: () => { if (this.isCurrent(token)) this.close(); },
    });
    this.views.intro.render();
    this.views.intro.show();
  }

  private startRound(): void {
    let session: QuizSession;
    try {
      session = createSession(this.options.questions);
    } catch (error) {
      // Only setup runs inside this catch; rendering/host failures must remain visible.
      if (!(error instanceof Error)) throw error;
      this.enterUnavailable();
      return;
    }
    this.hideScreens();
    this.views.question.reset();
    this.views.feedback.reset();
    this.showRound(session);
  }

  private enterUnavailable(): void {
    const token = ++this.context;
    this.state = { screen: 'unavailable' };
    this.hideScreens();
    this.views.unavailable.bind({ onBack: () => { if (this.isCurrent(token)) this.enterIntro(); } });
    this.views.unavailable.render();
    this.views.unavailable.show();
  }

  private showRound(session: QuizSession): void {
    const token = ++this.context;
    this.state = { screen: 'round', session, confirmationOpen: false };
    this.hideScreens();
    const question = session.questions[session.currentIndex];
    const progress = { questionNumber: session.currentIndex + 1, totalQuestions: session.questions.length };

    if (session.phase === 'question') {
      const { id, prompt, options } = question;
      this.views.question.bind({
        onSubmit: optionId => {
          const current = this.roundFor(token, 'question');
          if (!current) return;
          const next = submitAnswer(current, optionId);
          if (next !== current) this.showRound(next);
        },
        onExit: () => { if (this.roundFor(token, 'question')) this.openConfirmation(token); },
      });
      this.views.question.render({ question: { id, prompt, options }, ...progress });
      this.views.question.show();
    } else if (session.phase === 'feedback') {
      this.views.feedback.bind({
        onNext: () => {
          const current = this.roundFor(token, 'feedback');
          if (!current) return;
          const next = nextQuestion(current);
          if (next !== current) this.showRound(next);
        },
        onExit: () => { if (this.roundFor(token, 'feedback')) this.openConfirmation(token); },
      });
      this.views.feedback.render({ question, response: session.responses[session.currentIndex], ...progress });
      this.views.feedback.show();
    } else {
      const result = getResult(session);
      if (!result) throw new Error('Results phase must produce a quiz result');
      this.views.results.bind({
        onRetry: () => { if (this.roundFor(token, 'results')) this.startRound(); },
        onDone: () => { if (this.roundFor(token, 'results')) this.close(); },
      });
      // Each completed attempt is a new results screen, even if the score repeats.
      this.views.results.reset();
      this.views.results.render({ result });
      this.views.results.show();
      this.options.onComplete?.(result);
    }
  }

  private openConfirmation(token: number): void {
    if (this.state.screen !== 'round') return;
    this.state.confirmationOpen = true;
    const dialogToken = ++this.dialogContext;
    const active = () => this.isCurrent(token) && dialogToken === this.dialogContext
      && this.state.screen === 'round' && this.state.confirmationOpen;
    this.views.confirmation.bind({
      onKeepPlaying: () => {
        if (!active() || this.state.screen !== 'round') return;
        this.state.confirmationOpen = false;
        this.dialogContext++;
        this.views.confirmation.render({ open: false });
      },
      onLeave: () => { if (active()) this.enterIntro(); },
    });
    this.views.confirmation.render({ open: true });
  }

  private close(): void {
    this.dispose();
    this.options.onExit();
  }
}
