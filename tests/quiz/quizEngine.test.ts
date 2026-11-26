import { describe, expect, it } from 'vitest';
import { createSession, getResult, nextQuestion, submitAnswer } from '../../src/minigames/quiz/quizEngine';
import { QUIZ_QUESTIONS } from '../../src/minigames/quiz/questions';
import type { QuizQuestion, QuizSession } from '../../src/minigames/quiz/quizTypes';
import { FIXTURE_QUESTIONS, mixedResult } from '../helpers/quizFixtures';

function makeQuestions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `question-${index}`,
    topic: 'mutation' as const,
    prompt: `Which answer is correct for question ${index + 1}?`,
    options: [
      { id: 'correct', text: 'Keyed answer' },
      { id: 'wrong', text: 'Another answer' },
    ],
    correctOptionId: 'correct',
    explanation: `Explanation for question ${index + 1}.`,
  }));
}

/** Plain test data has no cycles; freeze every nested container and record. */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function playRound(questions: readonly QuizQuestion[], choices: readonly string[]): QuizSession {
  let session = createSession(questions);
  for (const choice of choices) {
    session = submitAnswer(session, choice);
    session = nextQuestion(session);
  }
  return session;
}

describe('createSession', () => {
  it('starts at the first supplied question with an isolated content snapshot', () => {
    const questions = makeQuestions(2).reverse();
    const before = structuredClone(questions);
    const session = createSession(questions);

    expect(session).toEqual({ questions: before, currentIndex: 0, phase: 'question', responses: [] });
    expect(questions).toEqual(before);
    expect(session.questions).not.toBe(questions);
    questions.forEach((question, index) => {
      expect(session.questions[index]).not.toBe(question);
      expect(session.questions[index].options).not.toBe(question.options);
      question.options.forEach((option, optionIndex) => {
        expect(session.questions[index].options[optionIndex]).not.toBe(option);
      });
    });
  });

  it('propagates the existing validation error for empty content', () => {
    expect(() => createSession([])).toThrowError('Quiz questions must be a nonempty array');
  });

  it('isolates wording, options, order, and grading from later caller edits', () => {
    const questions = makeQuestions(2);
    const before = structuredClone(questions);
    const session = createSession(questions);

    questions[0].id = 'changed';
    questions[0].prompt = 'Changed prompt';
    questions[0].explanation = 'Changed explanation';
    questions[0].correctOptionId = 'wrong';
    questions[0].options[0].id = 'changed-option';
    questions[0].options[0].text = 'Changed text';
    questions[0].options.push({ id: 'extra', text: 'Extra choice' });
    questions.reverse();
    questions.push(...makeQuestions(1));

    expect(session.questions).toEqual(before);
    expect(submitAnswer(session, 'correct').responses[0]).toEqual({
      questionId: 'question-0', selectedOptionId: 'correct', isCorrect: true,
    });
  });

  it('creates a clean independent attempt after another round has completed', () => {
    const questions = makeQuestions(1);
    const completed = playRound(questions, ['wrong']);
    const fresh = createSession(questions);

    expect(completed.phase).toBe('results');
    expect(fresh).toEqual({ questions, currentIndex: 0, phase: 'question', responses: [] });
    expect(fresh).not.toBe(completed);
    expect(fresh.responses).not.toBe(completed.responses);
    expect(fresh.questions).not.toBe(completed.questions);
    expect(fresh.questions[0]).not.toBe(completed.questions[0]);
    expect(fresh.questions[0].options).not.toBe(completed.questions[0].options);
    expect(fresh.questions[0].options[0]).not.toBe(completed.questions[0].options[0]);
    expect(getResult(completed)?.correct).toBe(0);
  });
});

describe('submitAnswer', () => {
  it.each([
    ['correct', true],
    ['wrong', false],
  ] as const)('records option %s as correctness %s without advancing', (optionId, isCorrect) => {
    const previous = deepFreeze(createSession(makeQuestions(2)));
    const before = structuredClone(previous);
    const feedback = submitAnswer(previous, optionId);

    expect(feedback).not.toBe(previous);
    expect(feedback.phase).toBe('feedback');
    expect(feedback.currentIndex).toBe(0);
    expect(feedback.questions).toBe(previous.questions);
    expect(feedback.responses).toEqual([{ questionId: 'question-0', selectedOptionId: optionId, isCorrect }]);
    expect(previous).toEqual(before);
  });

  it('uses option IDs after choices are reordered, without relying on answer text or topic', () => {
    const questions = makeQuestions(1);
    questions[0].options.reverse();
    questions[0].options[0].text = 'Mutation';
    questions[0].options[1].text = 'Genetic Drift';

    expect(submitAnswer(createSession(questions), 'correct').responses[0].isCorrect).toBe(true);
    expect(submitAnswer(createSession(questions), 'wrong').responses[0].isCorrect).toBe(false);
  });

  it('appends responses in question order while preserving earlier records', () => {
    const first = deepFreeze(submitAnswer(createSession(makeQuestions(2)), 'wrong'));
    const secondQuestion = deepFreeze(nextQuestion(first));
    const secondFeedback = submitAnswer(secondQuestion, 'correct');

    expect(secondFeedback.responses).toEqual([
      { questionId: 'question-0', selectedOptionId: 'wrong', isCorrect: false },
      { questionId: 'question-1', selectedOptionId: 'correct', isCorrect: true },
    ]);
    expect(secondFeedback.responses).not.toBe(secondQuestion.responses);
    expect(secondFeedback.responses[0]).toBe(first.responses[0]);
    expect(first.responses).toHaveLength(1);
    expect(secondQuestion.responses).toHaveLength(1);
  });

  it.each(['unknown', 'CORRECT', ' correct', 'correct ', '', '1'])(
    'ignores an invalid exact option ID: %j', optionId => {
      const session = deepFreeze(createSession(makeQuestions(1)));
      const before = structuredClone(session);
      expect(submitAnswer(session, optionId)).toBe(session);
      expect(session).toEqual(before);
    },
  );

  it('ignores submissions during feedback and results, including attempted answer changes', () => {
    const feedback = deepFreeze(submitAnswer(createSession(makeQuestions(1)), 'wrong'));
    const results = deepFreeze(nextQuestion(feedback));

    for (const session of [feedback, results]) {
      const before = structuredClone(session);
      expect(submitAnswer(session, 'correct')).toBe(session);
      expect(submitAnswer(session, 'wrong')).toBe(session);
      expect(session).toEqual(before);
    }
    expect(getResult(results)?.correct).toBe(0);
  });
});

describe('nextQuestion', () => {
  it('advances once from feedback and cannot skip the next unanswered question', () => {
    const feedback = deepFreeze(submitAnswer(createSession(makeQuestions(2)), 'correct'));
    const before = structuredClone(feedback);
    const next = nextQuestion(feedback);

    expect(next).not.toBe(feedback);
    expect(next.phase).toBe('question');
    expect(next.currentIndex).toBe(1);
    expect(next.responses).toBe(feedback.responses);
    expect(next.questions).toBe(feedback.questions);
    expect(feedback).toEqual(before);
    expect(nextQuestion(next)).toBe(next);
  });

  it('ignores Next in question and results phases', () => {
    const initial = deepFreeze(createSession(makeQuestions(1)));
    const completed = deepFreeze(nextQuestion(submitAnswer(initial, 'correct')));

    for (const session of [initial, completed]) {
      const before = structuredClone(session);
      expect(nextQuestion(session)).toBe(session);
      expect(session).toEqual(before);
    }
  });

  it.each([1, 5])('requires final feedback before results in a %i-question round', count => {
    let session = createSession(makeQuestions(count));
    for (let index = 0; index < count; index++) {
      expect(session.phase).toBe('question');
      expect(session.currentIndex).toBe(index);
      expect(session.responses).toHaveLength(index);
      expect(getResult(session)).toBeNull();

      const questionState = deepFreeze(session);
      session = submitAnswer(questionState, 'correct');
      expect(session).not.toBe(questionState);
      expect(session.phase).toBe('feedback');
      expect(session.currentIndex).toBe(index);
      expect(session.responses).toHaveLength(index + 1);
      expect(getResult(session)).toBeNull();
      expect(submitAnswer(session, 'correct')).toBe(session);

      const feedbackState = deepFreeze(session);
      session = nextQuestion(feedbackState);
      expect(session).not.toBe(feedbackState);
      expect(session.responses).toBe(feedbackState.responses);
    }

    expect(session.phase).toBe('results');
    expect(session.currentIndex).toBe(count - 1);
    expect(session.responses).toHaveLength(count);
    expect(getResult(session)).toEqual({ correct: count, total: count, responses: session.responses });
  });
});

describe('getResult and complete rounds', () => {
  it.each([
    ['zero', ['wrong', 'wrong', 'wrong', 'wrong', 'wrong'], 0],
    ['mixed', ['correct', 'wrong', 'correct', 'wrong', 'wrong'], 2],
    ['perfect', ['correct', 'correct', 'correct', 'correct', 'correct'], 5],
  ] as const)('derives a %s score from ordered responses', (_name, choices, correct) => {
    const completed = deepFreeze(playRound(makeQuestions(5), choices));
    const before = structuredClone(completed);
    const result = getResult(completed);

    expect(result).toEqual({
      correct,
      total: 5,
      responses: choices.map((selectedOptionId, index) => ({
        questionId: `question-${index}`, selectedOptionId, isCorrect: selectedOptionId === 'correct',
      })),
    });
    expect(completed).toEqual(before);
  });

  it('returns equal, independent result snapshots on repeated reads', () => {
    const completed = deepFreeze(playRound(makeQuestions(2), ['correct', 'wrong']));
    const before = structuredClone(completed);
    const first = getResult(completed);
    const second = getResult(completed);
    if (!first || !second) throw new Error('Completed round must have a result');

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(first.responses).not.toBe(completed.responses);
    expect(second.responses).not.toBe(first.responses);
    first.responses.forEach((response, index) => {
      expect(response).not.toBe(completed.responses[index]);
      expect(second.responses[index]).not.toBe(response);
      expect(second.responses[index]).not.toBe(completed.responses[index]);
    });
    expect(completed).toEqual(before);
  });

  it('plays the four-question fixture to the mixed result without changing earlier states', () => {
    const states: QuizSession[] = [];
    const snapshots: QuizSession[] = [];
    let session = createSession(deepFreeze(structuredClone(FIXTURE_QUESTIONS)));
    for (const response of mixedResult.responses) {
      states.push(deepFreeze(session));
      snapshots.push(structuredClone(session));
      session = submitAnswer(session, response.selectedOptionId);
      expect(session.phase).toBe('feedback');
      expect(getResult(session)).toBeNull();
      states.push(deepFreeze(session));
      snapshots.push(structuredClone(session));
      session = nextQuestion(session);
    }

    expect(session.phase).toBe('results');
    expect(getResult(session)).toEqual(mixedResult);
    expect(states).toEqual(snapshots);
  });

  it('grades all questions in the expanded production bank', () => {
    const questions = deepFreeze(structuredClone(QUIZ_QUESTIONS));
    const choices = questions.map((question, index) => index % 2 === 0
      ? question.correctOptionId
      : question.options.find(option => option.id !== question.correctOptionId)!.id);
    const completed = playRound(questions, choices);
    expect(completed.phase).toBe('results');
    expect(getResult(completed)).toEqual({
      correct: Math.ceil(questions.length / 2),
      total: questions.length,
      responses: questions.map((question, index) => ({
        questionId: question.id, selectedOptionId: choices[index], isCorrect: index % 2 === 0,
      })),
    });
  });
});
