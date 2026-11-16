import type { QuizQuestion, QuizResponse, QuizResult, QuizSession } from './quizTypes';
import { validateQuizQuestions } from './validateQuizQuestions';

/** Start an independent round in the supplied order, validating content once. */
export function createSession(questions: readonly QuizQuestion[]): QuizSession {
  validateQuizQuestions(questions);

  return {
    questions: questions.map(question => ({
      ...question,
      options: question.options.map(option => ({ ...option })),
    })),
    currentIndex: 0,
    phase: 'question',
    responses: [],
  };
}

/** Record a current-question option ID; invalid or repeated actions are no-ops. */
export function submitAnswer(session: QuizSession, optionId: string): QuizSession {
  if (session.phase !== 'question') return session;

  const question = session.questions[session.currentIndex];
  const option = question.options.find(candidate => candidate.id === optionId);
  if (!option) return session;

  const response: QuizResponse = {
    questionId: question.id,
    selectedOptionId: option.id,
    isCorrect: option.id === question.correctOptionId,
  };

  return {
    ...session,
    phase: 'feedback',
    responses: [...session.responses, response],
  };
}

/** Advance only after feedback; keep the final index when entering results. */
export function nextQuestion(session: QuizSession): QuizSession {
  if (session.phase !== 'feedback') return session;

  if (session.currentIndex + 1 < session.questions.length) {
    return { ...session, currentIndex: session.currentIndex + 1, phase: 'question' };
  }

  return { ...session, phase: 'results' };
}

/** Read a fresh completed-result snapshot without altering the session. */
export function getResult(session: QuizSession): QuizResult | null {
  if (session.phase !== 'results') return null;

  return {
    correct: session.responses.filter(response => response.isCorrect).length,
    total: session.questions.length,
    responses: session.responses.map(response => ({ ...response })),
  };
}
