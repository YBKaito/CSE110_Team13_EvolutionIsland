import type { QuizQuestion, QuizTopic } from './quizTypes';

const ALLOWED_TOPICS: ReadonlySet<string> = new Set<QuizTopic>([
  'mutation', 'drift', 'migration', 'selection',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${context} must be a nonempty string`);
  }
}

function requireId(value: unknown, context: string): asserts value is string {
  requireText(value, context);
  if (value !== value.trim()) {
    throw new Error(`${context} must not have leading or trailing whitespace`);
  }
}

/**
 * Validate authored content before PR2 creates a round. Returns no value and
 * never repairs/mutates input. Counts and topic coverage are content choices.
 */
export function validateQuizQuestions(
  questions: unknown,
): asserts questions is readonly QuizQuestion[] {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Quiz questions must be a nonempty array');
  }

  const questionIds = new Set<string>();
  for (let index = 0; index < questions.length; index++) {
    const question: unknown = questions[index];
    const position = `Question ${index + 1}`;
    if (!isRecord(question)) throw new Error(`${position} must be an object`);

    requireId(question.id, `${position}: id`);
    const context = question.id;
    if (questionIds.has(question.id)) {
      throw new Error(`${context}: duplicate question ID "${question.id}"`);
    }
    questionIds.add(question.id);

    requireText(question.prompt, `${context}: prompt`);
    requireText(question.correctOptionId, `${context}: correctOptionId`);
    requireText(question.explanation, `${context}: explanation`);
    if (typeof question.topic !== 'string' || !ALLOWED_TOPICS.has(question.topic)) {
      throw new Error(`${context}: topic must be mutation, drift, migration, or selection`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`${context}: options must be an array with at least two choices`);
    }

    const optionIds = new Set<string>();
    const optionTexts = new Set<string>();
    for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) {
      const option: unknown = question.options[optionIndex];
      const optionContext = `${context}: option ${optionIndex + 1}`;
      if (!isRecord(option)) throw new Error(`${optionContext} must be an object`);

      requireId(option.id, `${optionContext}: id`);
      requireText(option.text, `${optionContext}: text`);
      if (optionIds.has(option.id)) {
        throw new Error(`${context}: duplicate option ID "${option.id}"`);
      }
      optionIds.add(option.id);

      const normalizedText = option.text.trim().toLowerCase();
      if (optionTexts.has(normalizedText)) {
        throw new Error(`${context}: duplicate option text "${option.text}"`);
      }
      optionTexts.add(normalizedText);
    }

    if (!optionIds.has(question.correctOptionId)) {
      throw new Error(`${context}: correctOptionId "${question.correctOptionId}" does not match an option`);
    }
  }
}
