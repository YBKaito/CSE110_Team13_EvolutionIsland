// Real-DOM regression checks for the US9 quiz views' lifecycle edge cases
// (copied redraws, heading focus, stale/hidden/blocked controls, closed dialog).
// Run `npm run dev` and open http://localhost:5173/dev/quiz/lifecycle.html.
// The page lists each check as PASS/FAIL and sets <body data-result="pass|fail">.
// Vitest runs in Node without a DOM, so these checks live here instead.

import '@fontsource/vt323/400.css';
import '../../src/styles/styles.css';

import { QUIZ_QUESTIONS } from '../../src/minigames/quiz/questions';
import type { FeedbackViewRenderState, QuestionViewRenderState, QuizResult } from '../../src/minigames/quiz/quizTypes';
import { ExitConfirmationView } from '../../src/minigames/quiz/views/ExitConfirmationView';
import { FeedbackView } from '../../src/minigames/quiz/views/FeedbackView';
import { IntroView } from '../../src/minigames/quiz/views/IntroView';
import { QuestionView } from '../../src/minigames/quiz/views/QuestionView';
import { ResultsView } from '../../src/minigames/quiz/views/ResultsView';

const mount = document.getElementById('mount')!;
const list = document.querySelector<HTMLUListElement>('.checks')!;
const outcomes: boolean[] = [];

const q = QUIZ_QUESTIONS[0];
const response = { questionId: q.id, selectedOptionId: q.correctOptionId, isCorrect: true };
const feedbackState: FeedbackViewRenderState = { question: q, response, questionNumber: 1, totalQuestions: 1 };
const questionState: QuestionViewRenderState = {
  question: { id: q.id, prompt: q.prompt, options: q.options }, questionNumber: 1, totalQuestions: 1,
};
const result: QuizResult = { correct: 1, total: 1, responses: [response] };

function check(name: string, actual: unknown, expected: unknown): void {
  const pass = Object.is(actual, expected);
  outcomes.push(pass);
  const item = document.createElement('li');
  item.className = pass ? 'pass' : 'fail';
  item.textContent = `${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : ` (got ${String(actual)}, expected ${String(expected)})`}`;
  list.append(item);
}

/** Attach fresh views to an empty mount. */
function fresh<T extends { getElement(): HTMLElement }>(...views: T[]): T[] {
  mount.replaceChildren(...views.map(view => view.getElement()));
  return views;
}

const button = (view: { getElement(): HTMLElement }, index = 0) =>
  view.getElement().querySelectorAll('button')[index] as HTMLButtonElement;
const activeTag = () => {
  const a = document.activeElement as HTMLElement | null;
  return a?.dataset.focusKey ?? a?.tagName ?? 'none';
};

// 1. Feedback Next stays locked for a copied response; reset() starts a new attempt.
{
  const [view] = fresh(new FeedbackView());
  let calls = 0;
  view.bind({ onNext: () => calls++, onExit() {} });
  view.render(feedbackState); view.show();
  button(view).click();
  view.render({ ...feedbackState, response: { ...response } });
  button(view).click();
  check('1. Feedback: copied response does not unlock Next', calls, 1);
  check('1. Feedback: Next stays disabled after the redraw', button(view).disabled, true);
  view.reset();
  view.render({ ...feedbackState, response: { ...response } });
  button(view).click();
  check('1. Feedback: reset() unlocks Next for a new attempt', calls, 2);
  view.render({ ...feedbackState, questionNumber: 2, totalQuestions: 2 });
  button(view).click();
  check('1. Feedback: a new question position unlocks Next', calls, 3);
}

// 2. Results Try again/Done stay locked for a copied result; reset() starts a new attempt.
{
  const [view] = fresh(new ResultsView());
  let retries = 0;
  let dones = 0;
  view.bind({ onRetry: () => retries++, onDone: () => dones++ });
  view.render({ result }); view.show();
  button(view, 0).click();
  view.render({ result: structuredClone(result) });
  button(view, 0).click();
  button(view, 1).click();
  check('2. Results: copied result does not unlock Try again', retries, 1);
  check('2. Results: copied result does not unlock Done', dones, 0);
  view.reset();
  check('2. Results: reset() re-enables the buttons in place', button(view, 0).disabled, false);
  view.render({ result: structuredClone(result) });
  button(view, 0).click();
  check('2. Results: reset() allows one action for the new attempt', retries, 2);
}

// 3. Same-screen redraws keep focus on the heading (and still on controls).
{
  const [view] = fresh(new QuestionView());
  view.render(questionState); view.show();
  check('3. Focus: showing a question focuses its heading', activeTag(), 'heading');
  view.render(questionState);
  check('3. Focus: redraw keeps focus on the question heading', activeTag(), 'heading');
  (view.getElement().querySelector('input') as HTMLInputElement).focus();
  view.render(questionState);
  check('3. Focus: redraw keeps focus on the same option', activeTag(), `option:${q.options[0].id}`);

  const [feedback] = fresh(new FeedbackView());
  feedback.render(feedbackState); feedback.show();
  feedback.render(feedbackState);
  check('3. Focus: redraw keeps focus on the feedback heading', activeTag(), 'heading');

  const [results] = fresh(new ResultsView());
  results.render({ result }); results.show();
  results.render({ result });
  check('3. Focus: redraw keeps focus on the results heading', activeTag(), 'heading');
}

// 4. Replaced, hidden, and modal-blocked controls do not act.
{
  const [view] = fresh(new QuestionView());
  let submits = 0;
  view.bind({ onSubmit: () => submits++, onExit() {} });
  view.render(questionState); view.show();
  const oldInput = view.getElement().querySelector('input') as HTMLInputElement;
  const oldForm = view.getElement().querySelector('form') as HTMLFormElement;
  view.render(questionState);
  oldInput.dispatchEvent(new Event('change'));
  oldForm.dispatchEvent(new Event('submit', { cancelable: true }));
  check('4. Stale: replaced question form does not submit', submits, 0);
  check('4. Stale: replaced input does not change the selection', button(view, 0).disabled, true);

  const live = view.getElement().querySelector('input') as HTMLInputElement;
  live.click();
  (view.getElement().querySelector('form') as HTMLFormElement).requestSubmit();
  check('4. Stale: the current form still submits once', submits, 1);
}
{
  const [view] = fresh(new QuestionView());
  let submits = 0;
  view.bind({ onSubmit: () => submits++, onExit() {} });
  view.render(questionState); view.show();
  (view.getElement().querySelector('input') as HTMLInputElement).click();
  view.hide();
  view.getElement().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  check('4. Hidden: a hidden question view does not submit', submits, 0);
  mount.hidden = true;
  view.show();
  view.getElement().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  mount.hidden = false;
  check('4. Hidden: a view inside a hidden container does not submit', submits, 0);
}
{
  const [intro] = fresh(new IntroView());
  let oldStarts = 0;
  let newStarts = 0;
  intro.bind({ onStart: () => oldStarts++, onBack() {} });
  intro.render(); intro.show();
  const oldStart = button(intro, 0);
  intro.bind({ onStart: () => newStarts++, onBack() {} });
  intro.render();
  oldStart.click();
  check('4. Stale: an old intro button cannot reach rebound handlers', oldStarts + newStarts, 0);
  button(intro, 0).click();
  check('4. Stale: the current intro button still starts once', newStarts, 1);
}
{
  const question = new QuestionView();
  const exit = new ExitConfirmationView();
  mount.replaceChildren(question.getElement(), exit.getElement());
  let exits = 0;
  let submits = 0;
  question.bind({ onSubmit: () => submits++, onExit: () => exits++ });
  exit.bind({ onKeepPlaying() {}, onLeave() {} });
  question.render(questionState); question.show();
  (question.getElement().querySelector('input') as HTMLInputElement).click();
  exit.render({ open: true });
  button(question, 1).click();
  question.getElement().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  check('4. Modal: background Exit does nothing while the dialog is open', exits, 0);
  check('4. Modal: background submit does nothing while the dialog is open', submits, 0);
  exit.render({ open: false });
  button(question, 1).click();
  check('4. Modal: Exit works again once the dialog closes', exits, 1);
}

// 5. The confirmation only acts while open and attached.
{
  const view = new ExitConfirmationView();
  mount.replaceChildren(view.getElement());
  let leaves = 0;
  let keeps = 0;
  view.bind({ onKeepPlaying: () => keeps++, onLeave: () => leaves++ });
  button(view, 1).click();
  check('5. Dialog: Leave on a closed dialog does nothing', leaves, 0);
  view.render({ open: true });
  button(view, 1).click();
  button(view, 1).click();
  check('5. Dialog: Leave on the open dialog emits once', leaves, 1);
  view.render({ open: false });
  view.render({ open: true });
  view.getElement().dispatchEvent(new Event('cancel', { cancelable: true }));
  check('5. Dialog: Escape still counts as Keep playing', keeps, 1);
  check('5. Dialog: Escape leaves closing to the runner', view.getElement().open, true);
  view.render({ open: false });
}
{
  const view = new ExitConfirmationView();
  mount.replaceChildren(view.getElement());
  let leaves = 0;
  view.bind({ onKeepPlaying() {}, onLeave: () => leaves++ });
  const leave = button(view, 1);
  view.getElement().remove();
  leave.click();
  check('5. Dialog: a removed dialog does nothing', leaves, 0);
}

mount.replaceChildren();
const passed = outcomes.every(Boolean);
document.body.dataset.result = passed ? 'pass' : 'fail';
document.getElementById('summary')!.textContent =
  `${outcomes.filter(Boolean).length} of ${outcomes.length} checks passed`;
