import type { ResultsViewHandlers, ResultsViewRenderState } from '../quizTypes';
import { resultsViewModel } from './quizScreenModels';
import { el, QuizScreenElement } from './QuizScreenElement';

/**
 * Final score with Try again and Done. Displays the supplied result and emits
 * actions; it never resets the session itself. The first press locks both
 * buttons until a new result is rendered, so a double click retries once.
 */
export class ResultsView extends QuizScreenElement {
  private handlers: ResultsViewHandlers | null = null;
  private state: ResultsViewRenderState | null = null;
  private buttons: HTMLButtonElement[] = [];
  private locked = false;

  constructor() {
    super('results');
  }

  bind(handlers: ResultsViewHandlers): void {
    this.handlers = handlers;
  }

  render(state: ResultsViewRenderState): void {
    // A new result object means a newly finished round.
    if (this.state?.result !== state.result) {
      this.locked = false;
      this.requestHeadingFocus();
    }
    this.state = state;
    const vm = resultsViewModel(state.result);

    const retry = this.button(vm.retryLabel, 'retry', true, () => this.handlers?.onRetry());
    const done = this.button(vm.doneLabel, 'done', false, () => this.handlers?.onDone());
    this.buttons = [retry, done];

    this.replaceContents([
      el('h2', { className: 'quiz-heading', text: vm.heading, attrs: this.headingAttrs() }),
      el('p', { className: 'quiz-score', text: vm.score }),
      el('p', { className: 'quiz-results-message', text: vm.message }),
      el('div', { className: 'quiz-actions' }, this.buttons),
    ]);
  }

  private button(label: string, key: string, primary: boolean, action: () => void): HTMLButtonElement {
    const button = el('button', {
      className: primary ? 'quiz-button quiz-button--primary' : 'quiz-button',
      text: label,
      attrs: { type: 'button', 'data-focus-key': key },
    });
    button.disabled = this.locked;
    button.addEventListener('click', () => {
      if (this.locked) return;
      this.locked = true;
      for (const b of this.buttons) b.disabled = true;
      action();
    });
    return button;
  }
}
