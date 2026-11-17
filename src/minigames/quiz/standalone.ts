import '@fontsource/vt323/400.css';
import '../../styles/styles.css';
import './standalone.css';
import { startQuizSession } from './startQuizSession';
import { el } from './views/QuizScreenElement';

const root = document.getElementById('quiz-root');
if (!root) throw new Error('Missing standalone quiz container');
const container = root;
let session: { dispose(): void } | null = null;

function openQuiz(): void {
  session?.dispose();
  container.replaceChildren();
  session = startQuizSession(container, { onExit: showClosed });
}

function showClosed(): void {
  session = null;
  const open = el('button', { className: 'quiz-button quiz-button--primary', text: 'Open quiz', attrs: { type: 'button' } });
  open.addEventListener('click', openQuiz);
  container.replaceChildren(el('section', { className: 'quiz-screen' }, [
    el('h1', { className: 'quiz-heading', text: 'Quiz closed' }), open,
  ]));
  open.focus();
}

openQuiz();
