import { QUIZ_QUESTIONS } from '../../src/minigames/quiz/questions';
import type { QuizQuestion, QuizResult, QuizSession } from '../../src/minigames/quiz/quizTypes';

// Keep these examples at four questions so the UI tests and development demo
// do not depend on the size or order of the production question bank.
export const FIXTURE_QUESTIONS: readonly QuizQuestion[] = [
  'MUT-01', 'DRIFT-01', 'MIG-01', 'SELECT-01',
].map(id => {
  const question = QUIZ_QUESTIONS.find(question => question.id === id);
  if (!question) throw new Error(`Missing quiz fixture question: ${id}`);
  return structuredClone(question);
});

/** Development-only examples. Clone a fixture before modifying it in a test. */
export const initialSession: QuizSession = {
  questions: structuredClone(FIXTURE_QUESTIONS),
  currentIndex: 0,
  phase: 'question',
  responses: [],
};

export const correctFeedbackSession: QuizSession = {
  questions: structuredClone(FIXTURE_QUESTIONS),
  currentIndex: 0,
  phase: 'feedback',
  responses: [{ questionId: 'MUT-01', selectedOptionId: 'a', isCorrect: true }],
};

export const wrongFeedbackSession: QuizSession = {
  questions: structuredClone(FIXTURE_QUESTIONS),
  currentIndex: 0,
  phase: 'feedback',
  responses: [{ questionId: 'MUT-01', selectedOptionId: 'b', isCorrect: false }],
};

export const zeroResult: QuizResult = {
  correct: 0,
  total: 4,
  responses: [
    { questionId: 'MUT-01', selectedOptionId: 'b', isCorrect: false },
    { questionId: 'DRIFT-01', selectedOptionId: 'a', isCorrect: false },
    { questionId: 'MIG-01', selectedOptionId: 'a', isCorrect: false },
    { questionId: 'SELECT-01', selectedOptionId: 'a', isCorrect: false },
  ],
};

export const mixedResult: QuizResult = {
  correct: 2,
  total: 4,
  responses: [
    { questionId: 'MUT-01', selectedOptionId: 'a', isCorrect: true },
    { questionId: 'DRIFT-01', selectedOptionId: 'b', isCorrect: false },
    { questionId: 'MIG-01', selectedOptionId: 'c', isCorrect: true },
    { questionId: 'SELECT-01', selectedOptionId: 'd', isCorrect: false },
  ],
};

export const perfectResult: QuizResult = {
  correct: 4,
  total: 4,
  responses: [
    { questionId: 'MUT-01', selectedOptionId: 'a', isCorrect: true },
    { questionId: 'DRIFT-01', selectedOptionId: 'd', isCorrect: true },
    { questionId: 'MIG-01', selectedOptionId: 'c', isCorrect: true },
    { questionId: 'SELECT-01', selectedOptionId: 'b', isCorrect: true },
  ],
};

export const lastFeedbackSession: QuizSession = {
  questions: structuredClone(FIXTURE_QUESTIONS),
  currentIndex: 3,
  phase: 'feedback',
  responses: structuredClone(mixedResult.responses),
};
