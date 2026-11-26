import { QuizController } from './QuizController';
import { QUIZ_QUESTIONS } from './questions';
import type { QuizQuestion, QuizResult } from './quizTypes';
import { ExitConfirmationView } from './views/ExitConfirmationView';
import { FeedbackView } from './views/FeedbackView';
import { IntroView } from './views/IntroView';
import { QuestionView } from './views/QuestionView';
import { ResultsView } from './views/ResultsView';
import { UnavailableView } from './views/UnavailableView';

export interface QuizSessionOptions {
  readonly questions?: readonly QuizQuestion[];
  readonly onExit: () => void;
  readonly onComplete?: (result: QuizResult) => void;
  /** The player must finish the quiz: Back and Exit are hidden. */
  readonly required?: boolean;
}

/** Mount one independent quiz. The host owns navigation and the supplied container. */
export function startQuizSession(container: HTMLElement, options: QuizSessionOptions): { dispose(): void } {
  const wrapper = document.createElement('div');
  wrapper.className = 'quiz-mount';
  const views = {
    intro: new IntroView(), question: new QuestionView(), feedback: new FeedbackView(),
    results: new ResultsView(), confirmation: new ExitConfirmationView(), unavailable: new UnavailableView(),
  };
  wrapper.append(...Object.values(views).map(view => view.getElement()));
  container.append(wrapper);
  let disposed = false;
  const controller = new QuizController(views, {
    questions: options.questions ?? QUIZ_QUESTIONS,
    onComplete: options.onComplete,
    required: options.required,
    onExit: () => { dispose(); options.onExit(); },
  });

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    controller.dispose();
    wrapper.remove();
  }

  try {
    controller.show();
  } catch (error) {
    dispose();
    throw error;
  }
  return { dispose };
}
