// Development demo for the US9 question and feedback views (PR3).
// Run `npm run dev` and open http://localhost:5173/dev/quiz/ (add ?show=wrong etc. below)
// Uses the PR1 fixtures only; no engine. Production code must not import this file.

import '@fontsource/vt323/400.css';
import '../../src/styles/styles.css';

import type {
  FeedbackViewRenderState, QuestionViewRenderState, QuizSession,
} from '../../src/minigames/quiz/quizTypes';
import { FeedbackView } from '../../src/minigames/quiz/views/FeedbackView';
import { QuestionView } from '../../src/minigames/quiz/views/QuestionView';
import {
  correctFeedbackSession, initialSession, lastFeedbackSession, wrongFeedbackSession,
} from '../../tests/helpers/quizFixtures';

function questionState(session: QuizSession, index: number): QuestionViewRenderState {
  const { id, prompt, options } = session.questions[index];
  return { question: { id, prompt, options }, questionNumber: index + 1, totalQuestions: session.questions.length };
}

function feedbackState(session: QuizSession): FeedbackViewRenderState {
  return {
    question: session.questions[session.currentIndex],
    response: session.responses[session.currentIndex],
    questionNumber: session.currentIndex + 1,
    totalQuestions: session.questions.length,
  };
}

const root = document.getElementById('quiz-root')!;
const bar = document.querySelector<HTMLElement>('.demo-bar')!;
const log = document.querySelector<HTMLElement>('.demo-log')!;

const question = new QuestionView();
const feedback = new FeedbackView();
root.append(question.getElement(), feedback.getElement());

function record(action: string): void {
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()}  ${action}`;
  log.prepend(line);
}

question.bind({
  onSubmit: optionId => record(`onSubmit("${optionId}")`),
  onExit: () => record('onExit()'),
});
feedback.bind({
  onNext: () => record('onNext()'),
  onExit: () => record('onExit()'),
});

const demos: Record<string, () => void> = {
  'Question 1': () => showQuestion(0),
  'Question 2': () => showQuestion(1),
  'Question 3': () => showQuestion(2),
  'Question 4': () => showQuestion(3),
  'Correct feedback': () => showFeedback(correctFeedbackSession),
  'Wrong feedback': () => showFeedback(wrongFeedbackSession),
  'Final feedback': () => showFeedback(lastFeedbackSession),
  'Reset (retry)': () => { question.reset(); feedback.reset(); record('reset()'); },
};

function showQuestion(index: number): void {
  feedback.hide();
  question.render(questionState(initialSession, index));
  question.show();
}

function showFeedback(session: QuizSession): void {
  question.hide();
  feedback.render(feedbackState(session));
  feedback.show();
}

for (const [label, run] of Object.entries(demos)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => {
    if (label !== 'Reset (retry)') {
      bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    }
    run();
  });
  bar.append(button);
}

// ?show=question1..question4 | correct | wrong | final picks the starting state; the default is Question 1.
const slugs: Record<string, string> = {
  question1: 'Question 1', question2: 'Question 2', question3: 'Question 3', question4: 'Question 4',
  correct: 'Correct feedback', wrong: 'Wrong feedback', final: 'Final feedback',
};
const start = slugs[new URLSearchParams(window.location.search).get('show') ?? ''] ?? 'Question 1';
Array.from(bar.querySelectorAll('button')).find(b => b.textContent === start)?.click();
