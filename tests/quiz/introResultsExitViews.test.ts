import { describe, expect, it } from 'vitest';
import { QUIZ_QUESTIONS } from '../../src/minigames/quiz/questions';
import {
  EXIT_CONFIRMATION_COPY, INTRO_COPY, resultsViewModel,
} from '../../src/minigames/quiz/views/quizScreenModels';
import { mixedResult, perfectResult, zeroResult } from '../helpers/quizFixtures';

const TOPIC_WORDS = /topic|difficulty|mode|combo|mutation|drift|migration|selection/i;

describe('introduction copy', () => {
  it('uses the agreed title, instructions, and actions', () => {
    expect(INTRO_COPY.heading).toBe('Evolution Quiz');
    expect(INTRO_COPY.instructions)
      .toBe('Answer questions about evolution. Choose one answer, then read the explanation.');
    expect(INTRO_COPY.startLabel).toBe('Start');
    expect(INTRO_COPY.backLabel).toBe('Back');
  });

  it('offers no topic picker, difficulty, or mode, and no fixed question count', () => {
    const copy = Object.values(INTRO_COPY).join(' ');
    expect(copy).not.toMatch(TOPIC_WORDS);
    expect(copy).not.toMatch(/\d/);
  });
});

describe('results view model', () => {
  it.each([
    ['zero', zeroResult, 'You answered 0 of 4 correctly.'],
    ['mixed', mixedResult, 'You answered 2 of 4 correctly.'],
    ['perfect', perfectResult, 'You answered 4 of 4 correctly.'],
  ] as const)('shows the %s score as a count', (_name, result, score) => {
    const vm = resultsViewModel(result);
    expect(vm.heading).toBe('Quiz complete');
    expect(vm.score).toBe(score);
    expect(vm.retryLabel).toBe('Try again');
    expect(vm.doneLabel).toBe('Done');
  });

  it('gives different supportive messages for zero, partial, and perfect scores', () => {
    const messages = [zeroResult, mixedResult, perfectResult].map(r => resultsViewModel(r).message);
    expect(new Set(messages).size).toBe(3);
    expect(resultsViewModel(zeroResult).message).toMatch(/try again/i);
    expect(resultsViewModel(mixedResult).message).toMatch(/try again/i);
  });

  it('never shows pass/fail, grades, or mastery claims', () => {
    for (const result of [zeroResult, mixedResult, perfectResult]) {
      const text = Object.values(resultsViewModel(result)).join(' ');
      expect(text).not.toMatch(/\b(pass|passed|fail|failed|mastered|mastery|expert|grade)\b/i);
      expect(text).not.toMatch(/%/);
    }
  });

  it('does not promise new questions on retry', () => {
    for (const result of [zeroResult, mixedResult, perfectResult]) {
      expect(Object.values(resultsViewModel(result)).join(' ')).not.toMatch(/new question|different question/i);
    }
  });

  it('uses the supplied totals instead of recounting responses', () => {
    const vm = resultsViewModel({ correct: 3, total: 7, responses: [] });
    expect(vm.score).toBe('You answered 3 of 7 correctly.');
  });

  it('works for a longer question bank', () => {
    const total = QUIZ_QUESTIONS.length + 3;
    expect(resultsViewModel({ correct: total, total, responses: [] }).score)
      .toBe(`You answered ${total} of ${total} correctly.`);
  });

  it('does not change the fixtures it reads', () => {
    const before = structuredClone(mixedResult);
    resultsViewModel(mixedResult);
    expect(mixedResult).toEqual(before);
  });
});

describe('exit confirmation copy', () => {
  it('uses the agreed wording and actions', () => {
    expect(EXIT_CONFIRMATION_COPY).toEqual({
      heading: 'Leave this quiz?',
      body: 'Your answers in this round will be cleared.',
      keepPlayingLabel: 'Keep playing',
      leaveLabel: 'Leave quiz',
    });
  });
});
