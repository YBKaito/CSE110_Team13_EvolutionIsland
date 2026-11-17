import type { QuizResult } from '../quizTypes';

/**
 * Plain-data copy for the introduction, results, and exit confirmation screens.
 * The DOM views only place these strings, so tests can check them without a browser.
 */

export const INTRO_COPY = {
  heading: 'Evolution Quiz',
  // Count-free on purpose: the question bank can grow without changing this screen.
  instructions: 'Answer questions about evolution. Choose one answer, then read the explanation.',
  startLabel: 'Start',
  backLabel: 'Back',
} as const;

export const EXIT_CONFIRMATION_COPY = {
  heading: 'Leave this quiz?',
  body: 'Your answers in this round will be cleared.',
  keepPlayingLabel: 'Keep playing',
  leaveLabel: 'Leave quiz',
} as const;

export interface ResultsViewModel {
  readonly heading: string;
  readonly score: string;
  readonly message: string;
  readonly retryLabel: string;
  readonly doneLabel: string;
}

/**
 * Show the count, not a pass/fail label or a claim of mastery.
 * Uses the result's own numbers; the view never recounts responses.
 */
export function resultsViewModel(result: QuizResult): ResultsViewModel {
  const { correct, total } = result;
  let message: string;
  if (total > 0 && correct === total) {
    message = 'Great work on every question.';
  } else if (correct === 0) {
    message = 'These mechanisms can be tricky. Try again and read each explanation closely.';
  } else {
    message = 'Good effort. Try again to practice the ones you missed.';
  }

  return {
    heading: 'Quiz complete',
    score: `You answered ${correct} of ${total} correctly.`,
    message,
    retryLabel: 'Try again',
    doneLabel: 'Done',
  };
}
