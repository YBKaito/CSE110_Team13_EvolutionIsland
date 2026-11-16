import { describe, expect, it } from 'vitest';
import { QUIZ_QUESTIONS } from '../../src/minigames/quiz/questions';
import type { QuizQuestion } from '../../src/minigames/quiz/quizTypes';
import { validateQuizQuestions } from '../../src/minigames/quiz/validateQuizQuestions';

function freshQuestions() {
  return QUIZ_QUESTIONS.map(question => ({
    ...question,
    options: question.options.map(option => ({ ...option })),
  }));
}

describe('initial authored content', () => {
  it('validates and preserves the reviewed order, coverage, and answer keys', () => {
    expect(() => validateQuizQuestions(QUIZ_QUESTIONS)).not.toThrow();
    expect(QUIZ_QUESTIONS.map(({ id, topic, correctOptionId }) => [id, topic, correctOptionId]))
      .toEqual([
        ['MUT-01', 'mutation', 'a'],
        ['DRIFT-01', 'drift', 'd'],
        ['MIG-01', 'migration', 'c'],
        ['SELECT-01', 'selection', 'b'],
      ]);
    for (const question of QUIZ_QUESTIONS) expect(question.options).toHaveLength(4);
  });
});

describe('validateQuizQuestions', () => {
  it.each([1, 4, 7])('accepts %i questions without requiring topic coverage', count => {
    const questions = Array.from({ length: count }, (_, index) => ({
      ...freshQuestions()[0], id: `mutation-${index}`,
    }));
    expect(() => validateQuizQuestions(questions)).not.toThrow();
  });

  it('accepts reordered questions and options with their IDs and keys preserved', () => {
    const questions = freshQuestions().reverse();
    for (const question of questions) question.options.reverse();
    expect(() => validateQuizQuestions(questions)).not.toThrow();
  });

  it.each([2, 3, 5])('accepts %i options rather than enforcing four choices', count => {
    const question = {
      ...freshQuestions()[0],
      options: Array.from({ length: count }, (_, index) => ({ id: `choice-${index}`, text: `Choice ${index}` })),
      correctOptionId: 'choice-0',
    };
    expect(() => validateQuizQuestions([question])).not.toThrow();
  });

  it('accepts reused option IDs across questions and narrows unknown input', () => {
    const input: unknown = freshQuestions();
    validateQuizQuestions(input);
    const questions: readonly QuizQuestion[] = input;
    expect(questions[0].options[0].id).toBe(questions[1].options[0].id);
  });

  it.each([undefined, null, 4, 'questions', {}, []])('rejects non-array or empty input: %j', input => {
    expect(() => validateQuizQuestions(input)).toThrow(/nonempty array/);
  });

  it.each([undefined, null, 4, 'question', []])('rejects malformed question records: %j', question => {
    expect(() => validateQuizQuestions([question])).toThrow(/Question 1.*object/);
  });

  it('rejects sparse question arrays', () => {
    const questions = new Array(2);
    questions[1] = freshQuestions()[0];
    expect(() => validateQuizQuestions(questions)).toThrow(/Question 1/);
  });

  for (const field of ['id', 'prompt', 'correctOptionId', 'explanation']) {
    it.each([undefined, null, 3, '', ' \t '])(`rejects invalid ${field}: %j`, value => {
      const question = { ...freshQuestions()[0], [field]: value };
      expect(() => validateQuizQuestions([question])).toThrow(new RegExp(`${field}.*nonempty string`));
    });
  }

  it('identifies the position of a question missing its ID', () => {
    expect(() => validateQuizQuestions([freshQuestions()[0], {}])).toThrow(/Question 2: id/);
  });

  it.each([' MUT-01', 'MUT-01 '])('rejects surrounding question ID whitespace: %j', id => {
    expect(() => validateQuizQuestions([{ ...freshQuestions()[0], id }])).toThrow(/id.*whitespace/);
  });

  it('rejects duplicate question IDs', () => {
    const questions = freshQuestions();
    questions[1].id = questions[0].id;
    expect(() => validateQuizQuestions(questions)).toThrow(/MUT-01.*duplicate question ID/);
  });

  it.each([undefined, null, 3, '', 'unknown', 'Mutation'])('rejects invalid topics: %j', topic => {
    expect(() => validateQuizQuestions([{ ...freshQuestions()[0], topic }])).toThrow(/MUT-01.*topic/);
  });

  it.each([undefined, null, {}, 'options', [], [{ id: 'a', text: 'Only choice' }]])(
    'rejects missing, malformed, or insufficient options: %j', options => {
      expect(() => validateQuizQuestions([{ ...freshQuestions()[0], options }])).toThrow(/MUT-01.*at least two/);
    },
  );

  it.each([undefined, null, 3, 'option', []])('rejects malformed option records: %j', option => {
    const question = { ...freshQuestions()[0], options: [option, { id: 'b', text: 'Other' }] };
    expect(() => validateQuizQuestions([question])).toThrow(/MUT-01.*option 1.*object/);
  });

  it('rejects sparse option arrays', () => {
    const options = new Array(2);
    options[0] = { id: 'a', text: 'Mutation' };
    expect(() => validateQuizQuestions([{ ...freshQuestions()[0], options }])).toThrow(/MUT-01.*option 2/);
  });

  for (const field of ['id', 'text']) {
    it.each([undefined, null, 3, '', ' \t '])(`rejects invalid option ${field}: %j`, value => {
      const question = freshQuestions()[0];
      const options = [{ ...question.options[0], [field]: value }, ...question.options.slice(1)];
      expect(() => validateQuizQuestions([{ ...question, options }]))
        .toThrow(new RegExp(`MUT-01.*option 1.*${field}.*nonempty string`));
    });
  }

  it.each([' a', 'a '])('rejects surrounding option ID whitespace: %j', id => {
    const question = freshQuestions()[0];
    question.options[0].id = id;
    expect(() => validateQuizQuestions([question])).toThrow(/MUT-01.*option 1.*id.*whitespace/);
  });

  it('rejects duplicate option IDs within a question', () => {
    const question = freshQuestions()[0];
    question.options[1].id = 'a';
    expect(() => validateQuizQuestions([question])).toThrow(/MUT-01.*duplicate option ID "a"/);
  });

  it('rejects duplicate option text regardless of case and surrounding whitespace', () => {
    const question = freshQuestions()[0];
    question.options[1].text = '  mUTATION\t';
    expect(() => validateQuizQuestions([question])).toThrow(/MUT-01.*duplicate option text/);
  });

  it.each(['z', ' a '])('requires an exact answer-key match: %j', correctOptionId => {
    expect(() => validateQuizQuestions([{ ...freshQuestions()[0], correctOptionId }]))
      .toThrow(/MUT-01.*correctOptionId.*does not match an option/);
  });

  it('preserves valid text, whitespace, and authored order without repairing data', () => {
    const questions = freshQuestions().reverse();
    questions[0].prompt = `  ${questions[0].prompt}  `;
    questions[0].options[0].text = '  Mutation  ';
    const before = structuredClone(questions);
    expect(validateQuizQuestions(questions)).toBeUndefined();
    expect(questions).toEqual(before);
  });

  it('leaves invalid input unchanged even after inspecting earlier questions', () => {
    const questions = freshQuestions();
    questions[1].correctOptionId = 'missing';
    const before = structuredClone(questions);
    expect(() => validateQuizQuestions(questions)).toThrow(/DRIFT-01.*correctOptionId/);
    expect(questions).toEqual(before);
  });
});
