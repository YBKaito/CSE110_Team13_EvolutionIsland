import type { QuestionViewRenderState } from '../quizTypes';
import type { QuestionSelectionSnapshot } from './quizViewModels';

type ShownQuestion = Pick<QuestionViewRenderState, 'question' | 'questionNumber'>;

/**
 * The question view's only state: the unsubmitted selection and a one-time
 * submission lock. It never grades and never creates a response.
 */
export class QuestionSelection {
  private questionKey: string | null = null;
  private optionIds: ReadonlySet<string> = new Set();
  private selected: string | null = null;
  private submitted = false;

  /**
   * Call on every render. Returns true when this is a different question
   * (or the first one after reset), which clears the selection and lock.
   * Re-rendering the same question keeps the selection.
   */
  sync({ question, questionNumber }: ShownQuestion): boolean {
    const key = `${questionNumber}\u0000${question.id}`;
    this.optionIds = new Set(question.options.map(option => option.id));
    if (key !== this.questionKey) {
      this.questionKey = key;
      this.selected = null;
      this.submitted = false;
      return true;
    }
    if (this.selected !== null && !this.optionIds.has(this.selected)) this.selected = null;
    return false;
  }

  /** Forget everything, so the next sync counts as a new question (used for retry). */
  reset(): void {
    this.questionKey = null;
    this.optionIds = new Set();
    this.selected = null;
    this.submitted = false;
  }

  /** Change the selection. Ignored after submission or for unknown options. */
  select(optionId: string): boolean {
    if (this.submitted || !this.optionIds.has(optionId)) return false;
    this.selected = optionId;
    return true;
  }

  /** Lock and return the selected option, or null if nothing can be submitted. */
  submit(): string | null {
    if (this.submitted || this.selected === null) return null;
    this.submitted = true;
    return this.selected;
  }

  snapshot(): QuestionSelectionSnapshot {
    return { selectedOptionId: this.selected, submitted: this.submitted };
  }
}
