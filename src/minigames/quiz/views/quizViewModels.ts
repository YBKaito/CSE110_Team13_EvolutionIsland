import type {
  FeedbackViewRenderState, QuestionViewRenderState, QuizOption,
} from '../quizTypes';

/**
 * Plain-data descriptions of the question and feedback screens.
 * The DOM views only copy these values onto elements, so the wording,
 * disabled states, and answer labels can be tested without a browser.
 */

export function progressLabel(questionNumber: number, totalQuestions: number): string {
  return `Question ${questionNumber} of ${totalQuestions}`;
}

/** Unsubmitted selection owned by the question view. */
export interface QuestionSelectionSnapshot {
  readonly selectedOptionId: string | null;
  readonly submitted: boolean;
}

export interface QuestionOptionModel {
  readonly id: string;
  readonly text: string;
  readonly checked: boolean;
}

export interface QuestionViewModel {
  readonly heading: string;
  readonly prompt: string;
  readonly options: readonly QuestionOptionModel[];
  readonly optionsDisabled: boolean;
  readonly submitDisabled: boolean;
  readonly submitLabel: string;
  readonly exitLabel: string;
}

export function questionViewModel(
  state: QuestionViewRenderState,
  selection: QuestionSelectionSnapshot,
): QuestionViewModel {
  return {
    // The heading shows progress only. A mechanism name here would give away the answer.
    heading: progressLabel(state.questionNumber, state.totalQuestions),
    prompt: state.question.prompt,
    options: state.question.options.map(option => ({
      id: option.id,
      text: option.text,
      checked: option.id === selection.selectedOptionId,
    })),
    optionsDisabled: selection.submitted,
    submitDisabled: selection.submitted || selection.selectedOptionId === null,
    submitLabel: selection.submitted ? 'Submitted' : 'Submit',
    exitLabel: 'Exit quiz',
  };
}

export const YOUR_ANSWER_TAG = 'Your answer';
export const CORRECT_ANSWER_TAG = 'Correct answer';

export interface FeedbackOptionModel {
  readonly id: string;
  readonly text: string;
  readonly isSelected: boolean;
  readonly isCorrectAnswer: boolean;
  /** Text markers, so correctness never depends on color alone. */
  readonly tags: readonly string[];
}

export interface FeedbackViewModel {
  readonly progress: string;
  readonly heading: string;
  readonly isCorrect: boolean;
  readonly prompt: string;
  readonly options: readonly FeedbackOptionModel[];
  readonly summary: readonly string[];
  readonly explanation: string;
  readonly nextLabel: string;
  readonly exitLabel: string;
}

function optionText(options: readonly QuizOption[], optionId: string): string {
  return options.find(option => option.id === optionId)?.text ?? optionId;
}

/**
 * Describe the recorded response. Correctness comes from `response.isCorrect`;
 * the view never re-grades. The answer key is only used to point at the correct option.
 */
export function feedbackViewModel(state: FeedbackViewRenderState): FeedbackViewModel {
  const { question, response } = state;
  const isCorrect = response.isCorrect;
  const selectedText = optionText(question.options, response.selectedOptionId);
  const correctText = optionText(question.options, question.correctOptionId);

  return {
    progress: progressLabel(state.questionNumber, state.totalQuestions),
    heading: isCorrect ? 'Correct!' : 'Not quite',
    isCorrect,
    prompt: question.prompt,
    options: question.options.map(option => {
      const isSelected = option.id === response.selectedOptionId;
      const isCorrectAnswer = option.id === question.correctOptionId;
      const tags: string[] = [];
      if (isSelected) tags.push(YOUR_ANSWER_TAG);
      if (isCorrectAnswer) tags.push(CORRECT_ANSWER_TAG);
      return { id: option.id, text: option.text, isSelected, isCorrectAnswer, tags };
    }),
    summary: isCorrect
      ? [`${YOUR_ANSWER_TAG}: ${selectedText}`]
      : [`${YOUR_ANSWER_TAG}: ${selectedText}`, `${CORRECT_ANSWER_TAG}: ${correctText}`],
    explanation: question.explanation,
    nextLabel: state.questionNumber >= state.totalQuestions ? 'See results' : 'Next question',
    exitLabel: 'Exit quiz',
  };
}
