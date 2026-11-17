import { describe, expect, it } from 'vitest';
import type {
  FeedbackViewRenderState, QuestionViewRenderState, QuizSession,
} from '../../src/minigames/quiz/quizTypes';
import { QuestionSelection } from '../../src/minigames/quiz/views/QuestionSelection';
import {
  CORRECT_ANSWER_TAG, YOUR_ANSWER_TAG, feedbackViewModel, progressLabel, questionViewModel,
} from '../../src/minigames/quiz/views/quizViewModels';
import {
  correctFeedbackSession, initialSession, lastFeedbackSession, wrongFeedbackSession,
} from '../helpers/quizFixtures';

/** Build question render data the way the runner will: only id, prompt, and options. */
function questionState(session: QuizSession, index = session.currentIndex): QuestionViewRenderState {
  const { id, prompt, options } = session.questions[index];
  return {
    question: { id, prompt, options },
    questionNumber: index + 1,
    totalQuestions: session.questions.length,
  };
}

function feedbackState(session: QuizSession): FeedbackViewRenderState {
  return {
    question: session.questions[session.currentIndex],
    response: session.responses[session.currentIndex],
    questionNumber: session.currentIndex + 1,
    totalQuestions: session.questions.length,
  };
}

const MECHANISMS = ['Mutation', 'Natural Selection', 'Migration (gene flow)', 'Genetic Drift'];

describe('question view model', () => {
  it('shows progress, prompt, and every option, with Submit disabled while unanswered', () => {
    const vm = questionViewModel(questionState(initialSession), { selectedOptionId: null, submitted: false });
    expect(vm.heading).toBe('Question 1 of 4');
    expect(vm.prompt).toBe(initialSession.questions[0].prompt);
    expect(vm.options.map(option => option.text)).toEqual(MECHANISMS);
    expect(vm.options.every(option => !option.checked)).toBe(true);
    expect(vm.submitDisabled).toBe(true);
    expect(vm.optionsDisabled).toBe(false);
    expect(vm.submitLabel).toBe('Submit');
  });

  it('checks exactly the selected option and enables Submit', () => {
    const vm = questionViewModel(questionState(initialSession), { selectedOptionId: 'c', submitted: false });
    expect(vm.options.filter(option => option.checked).map(option => option.id)).toEqual(['c']);
    expect(vm.submitDisabled).toBe(false);
  });

  it('locks the options and Submit after submission', () => {
    const vm = questionViewModel(questionState(initialSession), { selectedOptionId: 'a', submitted: true });
    expect(vm.submitDisabled).toBe(true);
    expect(vm.optionsDisabled).toBe(true);
    expect(vm.submitLabel).toBe('Submitted');
  });

  it('never names the mechanism in the heading before submission', () => {
    initialSession.questions.forEach((_, index) => {
      const vm = questionViewModel(questionState(initialSession, index), { selectedOptionId: null, submitted: false });
      expect(vm.heading).toBe(progressLabel(index + 1, 4));
      for (const mechanism of MECHANISMS) expect(vm.heading).not.toContain(mechanism);
    });
  });
});

describe('question selection', () => {
  function started(index = 0) {
    const selection = new QuestionSelection();
    const isNew = selection.sync(questionState(initialSession, index));
    return { selection, isNew };
  }

  it('starts empty and refuses an empty submission', () => {
    const { selection, isNew } = started();
    expect(isNew).toBe(true);
    expect(selection.snapshot()).toEqual({ selectedOptionId: null, submitted: false });
    expect(selection.submit()).toBeNull();
    expect(selection.snapshot().submitted).toBe(false);
  });

  it('keeps one selection that can change freely before submission', () => {
    const { selection } = started();
    expect(selection.select('a')).toBe(true);
    expect(selection.select('d')).toBe(true);
    expect(selection.snapshot().selectedOptionId).toBe('d');
  });

  it('ignores option IDs that are not on the current question', () => {
    const { selection } = started();
    selection.select('b');
    expect(selection.select('z')).toBe(false);
    expect(selection.snapshot().selectedOptionId).toBe('b');
  });

  it('emits the option ID once, even with repeated submits', () => {
    const { selection } = started();
    selection.select('b');
    expect(selection.submit()).toBe('b');
    expect(selection.submit()).toBeNull();
    expect(selection.submit()).toBeNull();
  });

  it('locks the answer after submission', () => {
    const { selection } = started();
    selection.select('b');
    selection.submit();
    expect(selection.select('a')).toBe(false);
    expect(selection.snapshot()).toEqual({ selectedOptionId: 'b', submitted: true });
  });

  it('keeps the selection when the same question re-renders', () => {
    const { selection } = started();
    selection.select('c');
    expect(selection.sync(questionState(initialSession))).toBe(false);
    expect(selection.snapshot().selectedOptionId).toBe('c');
  });

  it('clears the selection and lock for the next question', () => {
    const { selection } = started();
    selection.select('a');
    selection.submit();
    expect(selection.sync(questionState(initialSession, 1))).toBe(true);
    expect(selection.snapshot()).toEqual({ selectedOptionId: null, submitted: false });
  });

  it('clears the selection on reset even when the first question ID repeats (retry)', () => {
    const { selection } = started();
    selection.select('a');
    selection.submit();
    selection.reset();
    expect(selection.sync(questionState(initialSession))).toBe(true);
    expect(selection.snapshot()).toEqual({ selectedOptionId: null, submitted: false });
  });

  it('treats a repeated question ID at a new position as a new question', () => {
    const selection = new QuestionSelection();
    const first = questionState(initialSession, 0);
    selection.sync(first);
    selection.select('a');
    expect(selection.sync({ ...first, questionNumber: 2 })).toBe(true);
    expect(selection.snapshot().selectedOptionId).toBeNull();
  });

  it('drops a selection whose option disappears on re-render', () => {
    const { selection } = started();
    selection.select('d');
    const state = questionState(initialSession);
    selection.sync({ ...state, question: { ...state.question, options: state.question.options.slice(0, 2) } });
    expect(selection.snapshot().selectedOptionId).toBeNull();
  });
});

describe('feedback view model', () => {
  it('shows a correct answer with one combined tag and no separate correction', () => {
    const vm = feedbackViewModel(feedbackState(correctFeedbackSession));
    expect(vm.heading).toBe('Correct!');
    expect(vm.isCorrect).toBe(true);
    expect(vm.progress).toBe('Question 1 of 4');
    expect(vm.options.find(option => option.id === 'a')?.tags).toEqual([YOUR_ANSWER_TAG, CORRECT_ANSWER_TAG]);
    expect(vm.options.filter(option => option.tags.length > 0)).toHaveLength(1);
    expect(vm.summary).toEqual(['Your answer: Mutation']);
  });

  it('shows a wrong answer with the selected and correct options marked in text', () => {
    const vm = feedbackViewModel(feedbackState(wrongFeedbackSession));
    expect(vm.heading).toBe('Not quite');
    expect(vm.isCorrect).toBe(false);
    expect(vm.options.find(option => option.id === 'b')?.tags).toEqual([YOUR_ANSWER_TAG]);
    expect(vm.options.find(option => option.id === 'a')?.tags).toEqual([CORRECT_ANSWER_TAG]);
    expect(vm.summary).toEqual(['Your answer: Natural Selection', 'Correct answer: Mutation']);
  });

  it('shows the prompt and the authored explanation', () => {
    const state = feedbackState(wrongFeedbackSession);
    const vm = feedbackViewModel(state);
    expect(vm.prompt).toBe(state.question.prompt);
    expect(vm.explanation).toBe(state.question.explanation);
  });

  it('labels Next as Next question before the last question', () => {
    expect(feedbackViewModel(feedbackState(correctFeedbackSession)).nextLabel).toBe('Next question');
  });

  it('labels Next as See results on the last question', () => {
    const vm = feedbackViewModel(feedbackState(lastFeedbackSession));
    expect(vm.progress).toBe('Question 4 of 4');
    expect(vm.nextLabel).toBe('See results');
  });

  it('displays the recorded result instead of re-grading', () => {
    const state = feedbackState(wrongFeedbackSession);
    const recordedCorrect = { ...state, response: { ...state.response, isCorrect: true } };
    expect(feedbackViewModel(recordedCorrect).heading).toBe('Correct!');
  });

  it('does not change the fixtures it reads', () => {
    const before = structuredClone(lastFeedbackSession);
    feedbackViewModel(feedbackState(lastFeedbackSession));
    expect(lastFeedbackSession).toEqual(before);
  });
});
