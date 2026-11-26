import { describe, expect, it, vi } from 'vitest';
import { QuizController } from '../../src/minigames/quiz/QuizController';
import { QUIZ_QUESTIONS } from '../../src/minigames/quiz/questions';
import type {
  ExitConfirmationHandlers, ExitConfirmationRenderState, FeedbackViewHandlers,
  FeedbackViewRenderState, IntroViewHandlers, IntroViewRenderState, QuestionViewHandlers, QuestionViewRenderState,
  QuizQuestion, ResultsViewHandlers, ResultsViewRenderState,
} from '../../src/minigames/quiz/quizTypes';
import { FIXTURE_QUESTIONS, mixedResult } from '../helpers/quizFixtures';

class FakeView<State, Handlers> {
  handlers!: Handlers;
  readonly renders: State[] = [];
  visible = false;
  resets = 0;
  bind(handlers: Handlers) { this.handlers = handlers; }
  render(state: State) { this.renders.push(state); }
  get current(): State { return this.renders.at(-1)!; }
  show() { this.visible = true; }
  hide() { this.visible = false; }
  reset() { this.resets++; }
}

function setup(questions: readonly QuizQuestion[] = QUIZ_QUESTIONS, extra: { required?: boolean } = {}) {
  const views = {
    intro: new FakeView<IntroViewRenderState | undefined, IntroViewHandlers>(),
    question: new FakeView<QuestionViewRenderState, QuestionViewHandlers>(),
    feedback: new FakeView<FeedbackViewRenderState, FeedbackViewHandlers>(),
    results: new FakeView<ResultsViewRenderState, ResultsViewHandlers>(),
    confirmation: new FakeView<ExitConfirmationRenderState, ExitConfirmationHandlers>(),
    unavailable: new FakeView<void, { onBack(): void }>(),
  };
  const onExit = vi.fn();
  const onComplete = vi.fn();
  const controller = new QuizController(views, { questions, onExit, onComplete, ...extra });
  controller.show();
  return { controller, views, onExit, onComplete };
}

function completeRound(views: ReturnType<typeof setup>['views'], choices: readonly string[]) {
  for (const choice of choices) {
    views.question.handlers.onSubmit(choice);
    views.feedback.handlers.onNext();
  }
}

function makeQuestions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `test-${index}`, topic: 'mutation' as const, prompt: `Question ${index + 1}?`,
    options: [{ id: 'yes', text: 'Keyed choice' }, { id: 'no', text: 'Other choice' }],
    correctOptionId: 'yes', explanation: 'An explanation.',
  }));
}

describe('quiz controller wiring', () => {
  it('opens intro once and starts with explicit answer-free question data', () => {
    const { controller, views } = setup();
    expect(views.intro.visible).toBe(true);
    controller.show();
    expect(views.intro.renders).toHaveLength(1);
    views.intro.handlers.onStart();
    expect(views.intro.visible).toBe(false);
    expect(views.question.visible).toBe(true);
    expect(views.question.current).toEqual({
      question: { id: QUIZ_QUESTIONS[0].id, prompt: QUIZ_QUESTIONS[0].prompt, options: QUIZ_QUESTIONS[0].options },
      questionNumber: 1, totalQuestions: QUIZ_QUESTIONS.length,
    });
    expect(Object.keys(views.question.current.question).sort()).toEqual(['id', 'options', 'prompt']);
    expect(views.question.current.question.options).not.toBe(QUIZ_QUESTIONS[0].options);
  });

  it('plays real content with final feedback before emitting its actual result', () => {
    const { views, onComplete } = setup(FIXTURE_QUESTIONS);
    views.intro.handlers.onStart();
    mixedResult.responses.forEach((response, index) => {
      views.question.handlers.onSubmit(response.selectedOptionId);
      expect(views.feedback.visible).toBe(true);
      expect(views.question.visible).toBe(false);
      expect(views.feedback.current).toEqual({
        question: FIXTURE_QUESTIONS[index], response, questionNumber: index + 1, totalQuestions: FIXTURE_QUESTIONS.length,
      });
      expect(onComplete).not.toHaveBeenCalled();
      expect(views.results.visible).toBe(false);
      views.feedback.handlers.onNext();
    });
    expect(views.results.visible).toBe(true);
    expect(views.results.current.result).toEqual(mixedResult);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(mixedResult);
  });

  it('plays every question in the expanded production bank before showing results', () => {
    const { views, onComplete } = setup();
    views.intro.handlers.onStart();
    QUIZ_QUESTIONS.forEach((question, index) => {
      expect(views.question.current.question.id).toBe(question.id);
      expect(views.question.current.questionNumber).toBe(index + 1);
      expect(views.question.current.totalQuestions).toBe(QUIZ_QUESTIONS.length);
      views.question.handlers.onSubmit(question.correctOptionId);
      expect(views.feedback.current.response.isCorrect).toBe(true);
      expect(onComplete).not.toHaveBeenCalled();
      views.feedback.handlers.onNext();
    });
    expect(views.results.visible).toBe(true);
    expect(views.results.current.result).toMatchObject({
      correct: QUIZ_QUESTIONS.length, total: QUIZ_QUESTIONS.length,
    });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(views.results.current.result);
  });

  it('ignores invalid answers without rendering feedback', () => {
    const { views } = setup();
    views.intro.handlers.onStart();
    views.question.handlers.onSubmit('unknown');
    expect(views.question.visible).toBe(true);
    expect(views.feedback.renders).toHaveLength(0);
  });

  it('rejects captured Submit, Next, and Exit handlers from older contexts', () => {
    const { views } = setup();
    const intro = views.intro.handlers;
    intro.onStart();
    const firstQuestion = views.question.handlers;
    firstQuestion.onSubmit('a');
    firstQuestion.onSubmit('b');
    const firstFeedback = views.feedback.handlers;
    firstFeedback.onNext();
    firstFeedback.onNext();
    firstQuestion.onSubmit('a');
    firstQuestion.onExit();
    intro.onStart();
    expect(views.question.current.questionNumber).toBe(2);
    expect(views.feedback.renders).toHaveLength(1);
  });

  it.each(['question', 'feedback'] as const)('cancels exit on %s without rendering or resetting it', phase => {
    const { views, onComplete } = setup();
    views.intro.handlers.onStart();
    if (phase === 'feedback') views.question.handlers.onSubmit('b');
    const underlying = views[phase];
    const data = underlying.current;
    const renders = underlying.renders.length;
    const resets = underlying.resets;
    const actions = underlying.handlers;
    actions.onExit();
    expect(views.confirmation.current.open).toBe(true);
    expect(underlying.visible).toBe(true);
    views.question.handlers.onSubmit('a');
    if (phase === 'feedback') views.feedback.handlers.onNext();
    actions.onExit();
    views.confirmation.handlers.onKeepPlaying();
    expect(views.confirmation.current.open).toBe(false);
    expect(underlying.current).toBe(data);
    expect(underlying.renders).toHaveLength(renders);
    expect(underlying.resets).toBe(resets);
    expect(onComplete).not.toHaveBeenCalled();
    if (phase === 'question') views.question.handlers.onSubmit('a');
    else views.feedback.handlers.onNext();
    expect(views[phase === 'question' ? 'feedback' : 'question'].visible).toBe(true);
  });

  it('retires confirmation callbacks after cancel and between openings', () => {
    const { views } = setup();
    views.intro.handlers.onStart();
    views.question.handlers.onExit();
    const oldDialog = views.confirmation.handlers;
    oldDialog.onKeepPlaying();
    oldDialog.onLeave();
    expect(views.question.visible).toBe(true);
    views.question.handlers.onExit();
    oldDialog.onKeepPlaying();
    oldDialog.onLeave();
    expect(views.confirmation.current.open).toBe(true);
    views.confirmation.handlers.onKeepPlaying();
    expect(views.question.visible).toBe(true);
  });

  it.each(['question', 'feedback'] as const)('abandons %s without completing and restarts clean', phase => {
    const { views, onExit, onComplete } = setup();
    views.intro.handlers.onStart();
    const oldQuestion = views.question.handlers;
    if (phase === 'feedback') oldQuestion.onSubmit('b');
    const resets = views.question.resets;
    views[phase].handlers.onExit();
    const dialog = views.confirmation.handlers;
    dialog.onLeave();
    dialog.onLeave();
    expect(views.intro.visible).toBe(true);
    expect(views.confirmation.current.open).toBe(false);
    expect(onExit).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    views.intro.handlers.onStart();
    oldQuestion.onSubmit('b');
    expect(views.question.current.questionNumber).toBe(1);
    expect(views.question.resets).toBeGreaterThan(resets);
    views.question.handlers.onSubmit('a');
    expect(views.feedback.current.response.isCorrect).toBe(true);
  });

  it('resets on retry and completes once per attempt', () => {
    const { views, onComplete } = setup(makeQuestions(1));
    views.intro.handlers.onStart();
    completeRound(views, ['yes']);
    const firstResult = views.results.current.result;
    const oldResults = views.results.handlers;
    const oldFeedback = views.feedback.handlers;
    const resets = views.question.resets;
    oldResults.onRetry();
    oldResults.onRetry();
    oldResults.onDone();
    oldFeedback.onNext();
    expect(views.question.current.questionNumber).toBe(1);
    expect(views.question.resets).toBe(resets + 1);
    completeRound(views, ['no']);
    expect(views.results.current.result).toMatchObject({ correct: 0, total: 1 });
    expect(firstResult).toMatchObject({ correct: 1, total: 1 });
    expect(onComplete).toHaveBeenCalledTimes(2);
    views.feedback.handlers.onNext();
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('resets the results view before rendering each completed attempt, even with the same score', () => {
    const { views } = setup(makeQuestions(1));
    const calls: string[] = [];
    const { reset, render } = views.results;
    views.results.reset = () => { calls.push('reset'); reset.call(views.results); };
    views.results.render = state => { calls.push('render'); render.call(views.results, state); };
    views.intro.handlers.onStart();
    completeRound(views, ['yes']);
    views.results.handlers.onRetry();
    completeRound(views, ['yes']);
    expect(calls).toEqual(['reset', 'render', 'reset', 'render']);
    expect(views.results.renders.map(state => state.result.correct)).toEqual([1, 1]);
  });

  it('shows committed results before notifying a host that immediately disposes', () => {
    const { controller, views, onComplete } = setup(makeQuestions(1));
    onComplete.mockImplementation(() => {
      expect(views.results.visible).toBe(true);
      expect(views.results.current.result.correct).toBe(1);
      controller.dispose();
    });
    views.intro.handlers.onStart();
    completeRound(views, ['yes']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(views.results.visible).toBe(false);
  });

  it.each(['Back', 'Done'])('%s exits once and retained callbacks become harmless', action => {
    const { controller, views, onExit, onComplete } = setup(makeQuestions(1));
    const intro = views.intro.handlers;
    if (action === 'Done') { intro.onStart(); completeRound(views, ['yes']); }
    const results = views.results.handlers;
    const exit = action === 'Back' ? intro.onBack : results.onDone;
    exit();
    const counts = [views.intro.renders.length, views.question.renders.length, views.results.renders.length];
    exit();
    intro.onStart();
    results?.onRetry();
    views.question.handlers.onSubmit('yes');
    controller.dispose();
    controller.show();
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(action === 'Done' ? 1 : 0);
    expect([views.intro.renders.length, views.question.renders.length, views.results.renders.length]).toEqual(counts);
  });

  it('disposes an open dialog without navigation and ignores its old callbacks', () => {
    const { controller, views, onExit } = setup();
    views.intro.handlers.onStart();
    views.question.handlers.onExit();
    const handlers = views.confirmation.handlers;
    controller.dispose();
    handlers.onKeepPlaying();
    handlers.onLeave();
    controller.dispose();
    expect(views.confirmation.current.open).toBe(false);
    expect(views.question.visible).toBe(false);
    expect(views.intro.visible).toBe(false);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('shows unavailable for invalid setup and returns to intro', () => {
    const { views, onComplete, onExit } = setup([]);
    views.intro.handlers.onStart();
    expect(views.unavailable.visible).toBe(true);
    expect(views.question.renders).toHaveLength(0);
    const errorBack = views.unavailable.handlers.onBack;
    errorBack();
    errorBack();
    expect(views.intro.visible).toBe(true);
    expect(views.intro.renders).toHaveLength(2);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('does not disguise rendering errors as invalid content', () => {
    const { views } = setup(makeQuestions(1));
    const failure = new Error('Render failed');
    views.question.render = () => { throw failure; };
    expect(() => views.intro.handlers.onStart()).toThrow(failure);
    expect(views.unavailable.visible).toBe(false);
  });

  it.each([1, 5])('plays a %i-question set with two choices and repeated topics', count => {
    const { views, onComplete } = setup(makeQuestions(count));
    views.intro.handlers.onStart();
    for (let index = 0; index < count; index++) {
      expect(views.question.current.question.options).toHaveLength(2);
      views.question.handlers.onSubmit(index % 2 === 0 ? 'yes' : 'no');
      expect(views.feedback.current.totalQuestions).toBe(count);
      views.feedback.handlers.onNext();
    }
    expect(views.results.current.result).toMatchObject({ correct: Math.ceil(count / 2), total: count });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('required quiz (end of a run)', () => {
  const required = (questions: readonly QuizQuestion[] = makeQuestions(2)) => setup(questions, { required: true });

  it('hides Back on the intro and Exit on question and feedback screens', () => {
    const { views } = required();
    expect(views.intro.renders).toEqual([{ canGoBack: false }]);
    views.intro.handlers.onStart();
    expect(views.question.current.canExit).toBe(false);
    views.question.handlers.onSubmit('yes');
    expect(views.feedback.current.canExit).toBe(false);
  });

  it('cannot be skipped from the intro or left mid-round', () => {
    const { views, onExit } = required();
    views.intro.handlers.onBack();
    expect(onExit).not.toHaveBeenCalled();
    expect(views.intro.visible).toBe(true);

    views.intro.handlers.onStart();
    views.question.handlers.onExit();
    expect(views.confirmation.renders.some(state => state.open)).toBe(false);
    views.question.handlers.onSubmit('yes');
    views.feedback.handlers.onExit();
    expect(views.confirmation.renders.some(state => state.open)).toBe(false);
    expect(views.feedback.visible).toBe(true);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('only exits after the player finishes and presses Done', () => {
    const { views, onExit, onComplete } = required();
    views.intro.handlers.onStart();
    completeRound(views, ['yes', 'no']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();
    views.results.handlers.onDone();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('still allows Try again before Done', () => {
    const { views, onExit } = required();
    views.intro.handlers.onStart();
    completeRound(views, ['yes', 'yes']);
    views.results.handlers.onRetry();
    expect(views.question.visible).toBe(true);
    expect(views.question.current.canExit).toBe(false);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('lets the player leave when the quiz cannot be set up, instead of trapping them', () => {
    const { views, onExit } = required([]);
    views.intro.handlers.onStart();
    expect(views.unavailable.visible).toBe(true);
    views.unavailable.handlers.onBack();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('keeps Back and Exit when not required', () => {
    const { views } = setup(makeQuestions(1));
    expect(views.intro.renders).toEqual([undefined]);
    views.intro.handlers.onStart();
    expect(views.question.current).not.toHaveProperty('canExit');
  });
});
