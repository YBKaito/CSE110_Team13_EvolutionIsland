import { describe, expect, it } from 'vitest';
import { QUIZ_QUESTIONS } from '../../src/minigames/quiz/questions';
import type { QuizQuestion, QuizResponse } from '../../src/minigames/quiz/quizTypes';
import { validateQuizQuestions } from '../../src/minigames/quiz/validateQuizQuestions';
import {
  FIXTURE_QUESTIONS, correctFeedbackSession, initialSession, lastFeedbackSession,
  mixedResult, perfectResult, wrongFeedbackSession, zeroResult,
} from '../helpers/quizFixtures';

function expectConsistentResponses(questions: readonly QuizQuestion[], responses: readonly QuizResponse[]) {
  expect(new Set(responses.map(response => response.questionId)).size).toBe(responses.length);
  responses.forEach((response, index) => {
    const question = questions[index];
    expect(response.questionId).toBe(question.id);
    expect(question.options.some(option => option.id === response.selectedOptionId)).toBe(true);
    expect(response.isCorrect).toBe(response.selectedOptionId === question.correctOptionId);
  });
}

describe('quiz session fixtures', () => {
  it.each([
    ['initial', initialSession, 'question', 0],
    ['correct feedback', correctFeedbackSession, 'feedback', 0],
    ['wrong feedback', wrongFeedbackSession, 'feedback', 0],
    ['last feedback', lastFeedbackSession, 'feedback', FIXTURE_QUESTIONS.length - 1],
  ] as const)('%s has a valid phase, index, and ordered responses', (_name, session, phase, index) => {
    validateQuizQuestions(session.questions);
    expect(session.phase).toBe(phase);
    expect(session.currentIndex).toBe(index);
    expect(session.responses).toHaveLength(index + (phase === 'feedback' ? 1 : 0));
    expectConsistentResponses(session.questions, session.responses);
  });

  it('provides correct, wrong, and final-feedback examples for the UI', () => {
    expect(correctFeedbackSession.responses[0].isCorrect).toBe(true);
    expect(wrongFeedbackSession.responses[0].isCorrect).toBe(false);
    expect(lastFeedbackSession.currentIndex + 1).toBe(lastFeedbackSession.questions.length);
    expect(lastFeedbackSession.responses).toEqual(mixedResult.responses);
  });

  it('keeps question and option records independent from production and other fixtures', () => {
    const sessions = [initialSession, correctFeedbackSession, wrongFeedbackSession, lastFeedbackSession];
    for (const session of sessions) {
      expect(session.questions).toEqual(FIXTURE_QUESTIONS);
      expect(session.questions).not.toBe(QUIZ_QUESTIONS);
      expect(session.questions).not.toBe(FIXTURE_QUESTIONS);
      for (const question of session.questions) {
        const productionQuestion = QUIZ_QUESTIONS.find(candidate => candidate.id === question.id);
        expect(productionQuestion).toBeDefined();
        expect(question).toEqual(productionQuestion);
        expect(question).not.toBe(productionQuestion);
        expect(question.options[0]).not.toBe(productionQuestion!.options[0]);
      }
    }
    expect(correctFeedbackSession.questions[0]).not.toBe(wrongFeedbackSession.questions[0]);
    expect(lastFeedbackSession.responses[0]).not.toBe(mixedResult.responses[0]);
  });
});

describe('quiz result fixtures', () => {
  it.each([
    ['zero', zeroResult, 0, ['b', 'a', 'a', 'a']],
    ['mixed', mixedResult, 2, ['a', 'b', 'c', 'd']],
    ['perfect', perfectResult, 4, ['a', 'd', 'c', 'b']],
  ] as const)('%s has matching totals, answer keys, and score', (_name, result, correct, choices) => {
    expect(result.total).toBe(FIXTURE_QUESTIONS.length);
    expect(result.responses).toHaveLength(result.total);
    expect(result.responses.map(response => response.selectedOptionId)).toEqual(choices);
    expectConsistentResponses(FIXTURE_QUESTIONS, result.responses);
    expect(result.correct).toBe(correct);
    expect(result.correct).toBe(result.responses.filter(response => response.isCorrect).length);
  });
});
