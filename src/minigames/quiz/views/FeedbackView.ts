import type { FeedbackViewHandlers, FeedbackViewRenderState } from '../quizTypes';
import { feedbackViewModel } from './quizViewModels';
import { el, QuizScreenElement } from './QuizScreenElement';

/**
 * The locked answer after submission: Correct!/Not quite, the options marked
 * "Your answer" and "Correct answer", the explanation, Next, and Exit.
 *
 * It shows `response.isCorrect` as recorded and does not grade. Next is labeled
 * "See results" on the last question and emits `onNext` once per feedback screen.
 */
export class FeedbackView extends QuizScreenElement {
  private handlers: FeedbackViewHandlers | null = null;
  private state: FeedbackViewRenderState | null = null;
  private nextLocked = false;
  private nextButton: HTMLButtonElement | null = null;

  constructor() {
    super('feedback');
  }

  bind(handlers: FeedbackViewHandlers): void {
    this.handlers = handlers;
  }

  render(state: FeedbackViewRenderState): void {
    if (this.isNewFeedback(state)) {
      this.nextLocked = false;
      this.requestHeadingFocus();
    }
    this.state = state;
    this.draw();
  }

  /** Unlock Next and refocus the heading for a new attempt. */
  reset(): void {
    const state = this.state;
    this.state = null;
    if (state) this.render(state);
  }

  /**
   * A different question or position means a new feedback screen. Redrawing the
   * same question, even with a copied response, keeps Next locked; a new attempt
   * that repeats a question must call reset() first.
   */
  private isNewFeedback(state: FeedbackViewRenderState): boolean {
    const previous = this.state;
    return previous === null
      || previous.question.id !== state.question.id
      || previous.questionNumber !== state.questionNumber;
  }

  private draw(): void {
    if (!this.state) return;
    const vm = feedbackViewModel(this.state);

    const options = vm.options.map(option => {
      const item = el('li', { className: 'quiz-option quiz-option--result' }, [
        el('span', { className: 'quiz-option-text', text: option.text }),
        ...option.tags.map(tag => el('span', { className: 'quiz-tag', text: tag })),
      ]);
      item.classList.toggle('is-selected', option.isSelected);
      item.classList.toggle('is-correct', option.isCorrectAnswer);
      return item;
    });

    this.nextButton = el('button', {
      className: 'quiz-button quiz-button--primary', text: vm.nextLabel,
      attrs: { type: 'button', 'data-focus-key': 'next' },
    });
    this.nextButton.disabled = this.nextLocked;
    this.listen(this.nextButton, 'click', () => this.onNext());

    const actions: HTMLElement[] = [this.nextButton];
    if (this.state.canExit !== false) {
      const exitButton = el('button', {
        className: 'quiz-button', text: vm.exitLabel,
        attrs: { type: 'button', 'data-focus-key': 'exit' },
      });
      this.listen(exitButton, 'click', () => this.handlers?.onExit());
      actions.push(exitButton);
    }

    const heading = el('h2', {
      className: `quiz-heading quiz-result ${vm.isCorrect ? 'quiz-result--correct' : 'quiz-result--incorrect'}`,
      attrs: this.headingAttrs(),
    }, [
      el('span', { className: 'quiz-result-mark', text: vm.isCorrect ? '✓' : '✗', attrs: { 'aria-hidden': 'true' } }),
      document.createTextNode(vm.heading),
    ]);

    this.replaceContents([
      el('p', { className: 'quiz-progress', text: vm.progress }),
      heading,
      el('p', { className: 'quiz-prompt', text: vm.prompt }),
      el('ul', { className: 'quiz-options', attrs: { 'aria-label': 'Answer choices' } }, options),
      el('div', { className: 'quiz-summary' }, vm.summary.map(line => el('p', { text: line }))),
      el('div', { className: 'quiz-explanation' }, [
        el('h3', { text: 'Explanation' }),
        el('p', { text: vm.explanation }),
      ]),
      el('div', { className: 'quiz-actions' }, actions),
    ]);
  }

  private onNext(): void {
    if (this.nextLocked) return;
    this.nextLocked = true;
    if (this.nextButton) this.nextButton.disabled = true;
    this.handlers?.onNext();
  }
}
