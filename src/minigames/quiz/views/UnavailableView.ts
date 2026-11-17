import { el, QuizScreenElement } from './QuizScreenElement';

/** Setup failure only; developer error details never become student-facing copy. */
export class UnavailableView extends QuizScreenElement {
  private handlers: { onBack(): void } | null = null;

  constructor() { super('unavailable'); }

  bind(handlers: { onBack(): void }): void { this.handlers = handlers; }

  render(): void {
    const back = el('button', {
      className: 'quiz-button', text: 'Back', attrs: { type: 'button', 'data-focus-key': 'back' },
    });
    this.listen(back, 'click', () => this.handlers?.onBack());
    this.requestHeadingFocus();
    this.replaceContents([
      el('h2', { className: 'quiz-heading', text: 'Quiz unavailable', attrs: this.headingAttrs() }),
      el('p', { text: 'This quiz could not be started. Please try again later.' }),
      back,
    ]);
  }
}
