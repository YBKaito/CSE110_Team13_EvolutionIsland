// Development demo for the US9 quiz views (PR3 question/feedback, PR4 intro/results/exit).
// Run `npm run dev` and open http://localhost:5173/dev/quiz/ (add ?show=wrong etc. below)
// Uses the PR1 fixtures only; no engine or runner. Production code must not import this file.
// The small amount of wiring below (Exit opens the confirmation, Leave returns to the intro)
// only lets reviewers try the screens; PR5's runner owns the real lifecycle.

import '@fontsource/vt323/400.css';
import '../../src/styles/styles.css';

import type {
  FeedbackViewRenderState, QuestionViewRenderState, QuizResult, QuizSession,
} from '../../src/minigames/quiz/quizTypes';
import { ExitConfirmationView } from '../../src/minigames/quiz/views/ExitConfirmationView';
import { FeedbackView } from '../../src/minigames/quiz/views/FeedbackView';
import { IntroView } from '../../src/minigames/quiz/views/IntroView';
import { QuestionView } from '../../src/minigames/quiz/views/QuestionView';
import { ResultsView } from '../../src/minigames/quiz/views/ResultsView';
import {
  correctFeedbackSession, initialSession, lastFeedbackSession, mixedResult,
  perfectResult, wrongFeedbackSession, zeroResult,
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

const intro = new IntroView();
const question = new QuestionView();
const feedback = new FeedbackView();
const results = new ResultsView();
const exitConfirmation = new ExitConfirmationView();
const screens = [intro, question, feedback, results];
root.append(...screens.map(s => s.getElement()), exitConfirmation.getElement());

function record(action: string): void {
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()}  ${action}`;
  log.prepend(line);
}

function only(screen: (typeof screens)[number]): void {
  exitConfirmation.render({ open: false });
  for (const s of screens) if (s !== screen) s.hide();
  screen.show();
}

function showIntro(): void {
  intro.render();
  only(intro);
}

function showQuestion(index: number): void {
  question.render(questionState(initialSession, index));
  only(question);
}

function showFeedback(session: QuizSession): void {
  // Each fixture is shown as a fresh feedback screen, so Next unlocks.
  feedback.reset();
  feedback.render(feedbackState(session));
  only(feedback);
}

function showResults(result: QuizResult): void {
  // Each fixture is shown as a newly finished round, so the buttons unlock.
  results.reset();
  results.render({ result });
  only(results);
}

intro.bind({
  onStart: () => { record('onStart()'); question.reset(); showQuestion(0); },
  onBack: () => record('onBack()'),
});
question.bind({
  onSubmit: optionId => record(`onSubmit("${optionId}")`),
  onExit: () => { record('onExit()'); exitConfirmation.render({ open: true }); },
});
feedback.bind({
  onNext: () => record('onNext()'),
  onExit: () => { record('onExit()'); exitConfirmation.render({ open: true }); },
});
results.bind({
  onRetry: () => { record('onRetry()'); question.reset(); showQuestion(0); },
  onDone: () => record('onDone()'),
});
exitConfirmation.bind({
  onKeepPlaying: () => { record('onKeepPlaying()'); exitConfirmation.render({ open: false }); },
  onLeave: () => { record('onLeave()'); question.reset(); feedback.reset(); showIntro(); },
});

const demos: Record<string, () => void> = {
  'Intro': showIntro,
  'Question 1': () => showQuestion(0),
  'Question 2': () => showQuestion(1),
  'Question 3': () => showQuestion(2),
  'Question 4': () => showQuestion(3),
  'Correct feedback': () => showFeedback(correctFeedbackSession),
  'Wrong feedback': () => showFeedback(wrongFeedbackSession),
  'Final feedback': () => showFeedback(lastFeedbackSession),
  'Results 0/4': () => showResults(zeroResult),
  'Results 2/4': () => showResults(mixedResult),
  'Results 4/4': () => showResults(perfectResult),
  'Reset (retry)': () => { question.reset(); feedback.reset(); record('reset()'); },
};

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

// ?show=intro | question1..question4 | correct | wrong | final | zero | mixed | perfect | exit
// picks the starting state; the default is the introduction. "exit" opens the confirmation over Question 1.
const slugs: Record<string, string> = {
  intro: 'Intro',
  question1: 'Question 1', question2: 'Question 2', question3: 'Question 3', question4: 'Question 4',
  correct: 'Correct feedback', wrong: 'Wrong feedback', final: 'Final feedback',
  zero: 'Results 0/4', mixed: 'Results 2/4', perfect: 'Results 4/4', exit: 'Question 1',
};
const show = new URLSearchParams(window.location.search).get('show') ?? '';
const start = slugs[show] ?? 'Intro';
Array.from(bar.querySelectorAll('button')).find(b => b.textContent === start)?.click();
if (show === 'exit') exitConfirmation.render({ open: true });
