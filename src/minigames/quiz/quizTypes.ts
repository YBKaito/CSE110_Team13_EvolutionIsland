/** Author metadata; topics are not selectable quiz modes. */
export type QuizTopic = 'mutation' | 'drift' | 'migration' | 'selection';
export type QuizPhase = 'question' | 'feedback' | 'results';

export interface QuizOption {
  readonly id: string;
  readonly text: string;
}

export interface QuizQuestion {
  readonly id: string;
  readonly topic: QuizTopic;
  readonly prompt: string;
  readonly options: readonly QuizOption[];
  readonly correctOptionId: string;
  readonly explanation: string;
}

export interface QuizResponse {
  readonly questionId: string;
  readonly selectedOptionId: string;
  readonly isCorrect: boolean;
}

/** Engine-created state. All submitted responses follow question order. */
export interface QuizSession {
  readonly questions: readonly QuizQuestion[];
  /** Zero-based; remains at questions.length - 1 in results. */
  readonly currentIndex: number;
  readonly phase: QuizPhase;
  readonly responses: readonly QuizResponse[];
}

export interface QuizResult {
  readonly correct: number;
  readonly total: number;
  readonly responses: readonly QuizResponse[];
}

/** Display inputs for render(state); excludes the answer key and topic. */
export interface QuestionViewRenderState {
  readonly question: Pick<QuizQuestion, 'id' | 'prompt' | 'options'>;
  /** One-based display progress supplied by the runner. */
  readonly questionNumber: number;
  readonly totalQuestions: number;
}

/** Actions for bind(handlers). The view owns only its unsubmitted selection. */
export interface QuestionViewHandlers {
  onSubmit(optionId: string): void;
  onExit(): void;
}

export interface FeedbackViewRenderState {
  readonly question: QuizQuestion;
  readonly response: QuizResponse;
  readonly questionNumber: number;
  readonly totalQuestions: number;
}

export interface FeedbackViewHandlers {
  onNext(): void;
  onExit(): void;
}

/** Introduction copy is fixed and needs no render-data interface. */
export interface IntroViewHandlers {
  onStart(): void;
  onBack(): void;
}

export interface ResultsViewRenderState {
  readonly result: QuizResult;
}

export interface ResultsViewHandlers {
  onRetry(): void;
  onDone(): void;
}

export interface ExitConfirmationRenderState {
  readonly open: boolean;
}

export interface ExitConfirmationHandlers {
  onKeepPlaying(): void;
  onLeave(): void;
}
