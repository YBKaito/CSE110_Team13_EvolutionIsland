import type { QuestionViewHandlers, QuestionViewRenderState } from '../quizTypes';
import { QuestionSelection } from './QuestionSelection';
import { questionViewModel } from './quizViewModels';
import { el, QuizScreenElement } from './QuizScreenElement';

/**
 * One unanswered question: progress, prompt, radio options, Submit, and Exit.
 *
 * The view owns only the unsubmitted selection and a submission lock.
 * Submit is disabled until an option is chosen and after the first submission,
 * so rapid clicks emit `onSubmit` once. Re-rendering the same question keeps the
 * selection; a different question (or `reset()`) clears it.
 */
export class QuestionView extends QuizScreenElement {
  private readonly selection = new QuestionSelection();
  private handlers: QuestionViewHandlers | null = null;
  private state: QuestionViewRenderState | null = null;

  private fieldset: HTMLFieldSetElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  private optionLabels: HTMLLabelElement[] = [];

  constructor() {
    super('question');
  }

  bind(handlers: QuestionViewHandlers): void {
    this.handlers = handlers;
  }

  render(state: QuestionViewRenderState): void {
    this.state = state;
    if (this.selection.sync(state)) this.requestHeadingFocus();
    this.draw();
  }

  /** Clear the selection and lock for a new attempt, even if the question ID repeats. */
  reset(): void {
    this.selection.reset();
    if (this.state) this.render(this.state);
  }

  private draw(): void {
    if (!this.state) return;
    const vm = questionViewModel(this.state, this.selection.snapshot());
    const name = `${this.screenId}-option`;

    this.optionLabels = vm.options.map(option => {
      const input = el('input', {
        attrs: { type: 'radio', name, value: option.id, 'data-focus-key': `option:${option.id}` },
      });
      input.checked = option.checked;
      this.listen(input, 'change', () => this.onSelect(option.id));
      return el('label', { className: 'quiz-option' }, [
        input, el('span', { className: 'quiz-option-text', text: option.text }),
      ]);
    });

    this.fieldset = el('fieldset', { className: 'quiz-fieldset' }, [
      el('legend', { className: 'quiz-prompt', text: vm.prompt }),
      el('div', { className: 'quiz-options' }, this.optionLabels),
    ]);

    this.submitButton = el('button', {
      className: 'quiz-button quiz-button--primary',
      attrs: { type: 'submit', 'data-focus-key': 'submit' },
    });
    const exitButton = el('button', {
      className: 'quiz-button', text: vm.exitLabel,
      attrs: { type: 'button', 'data-focus-key': 'exit' },
    });
    this.listen(exitButton, 'click', () => this.handlers?.onExit());

    const form = el('form', { attrs: { novalidate: '' } }, [
      this.fieldset,
      el('div', { className: 'quiz-actions' }, [this.submitButton, exitButton]),
    ]);
    this.listen(form, 'submit', () => this.onSubmit());

    this.replaceContents([
      el('h2', { className: 'quiz-heading', text: vm.heading, attrs: this.headingAttrs() }),
      form,
    ]);
    this.updateControls();
  }

  private onSelect(optionId: string): void {
    if (this.selection.select(optionId)) this.updateControls();
  }

  private onSubmit(): void {
    const optionId = this.selection.submit();
    if (optionId === null) return;
    this.updateControls();
    this.handlers?.onSubmit(optionId);
  }

  /** Update control states in place, so selecting with arrow keys keeps focus. */
  private updateControls(): void {
    if (!this.state || !this.fieldset || !this.submitButton) return;
    const vm = questionViewModel(this.state, this.selection.snapshot());
    this.fieldset.disabled = vm.optionsDisabled;
    this.submitButton.disabled = vm.submitDisabled;
    this.submitButton.textContent = vm.submitLabel;
    vm.options.forEach((option, index) => {
      this.optionLabels[index]?.classList.toggle('is-selected', option.checked);
    });
  }
}
