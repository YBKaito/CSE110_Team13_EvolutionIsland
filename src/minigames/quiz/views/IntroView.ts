import type { IntroViewHandlers, IntroViewRenderState } from '../quizTypes';
import { INTRO_COPY } from './quizScreenModels';
import { el, QuizScreenElement } from './QuizScreenElement';

/**
 * Fixed introduction: title, instructions, Start, and Back (hidden for a required quiz). No topic or
 * difficulty inputs. The first button press locks both buttons, so a double
 * click starts one round; call `render()` again to show the screen anew.
 */
export class IntroView extends QuizScreenElement {
  private handlers: IntroViewHandlers | null = null;
  private buttons: HTMLButtonElement[] = [];
  private locked = false;

  constructor() {
    super('intro');
  }

  bind(handlers: IntroViewHandlers): void {
    this.handlers = handlers;
  }

  /** Draw the introduction. Each call is a fresh visit: buttons unlock and the heading takes focus. */
  render(state: IntroViewRenderState = {}): void {
    this.locked = false;
    this.requestHeadingFocus();

    const start = this.button(INTRO_COPY.startLabel, 'start', true, () => this.handlers?.onStart());
    this.buttons = state.canGoBack === false
      ? [start]
      : [start, this.button(INTRO_COPY.backLabel, 'back', false, () => this.handlers?.onBack())];

    this.replaceContents([
      el('h2', { className: 'quiz-heading', text: INTRO_COPY.heading, attrs: this.headingAttrs() }),
      el('p', { className: 'quiz-intro-text', text: INTRO_COPY.instructions }),
      el('div', { className: 'quiz-actions' }, this.buttons),
    ]);
  }

  private button(label: string, key: string, primary: boolean, action: () => void): HTMLButtonElement {
    const button = el('button', {
      className: primary ? 'quiz-button quiz-button--primary' : 'quiz-button',
      text: label,
      attrs: { type: 'button', 'data-focus-key': key },
    });
    this.listen(button, 'click', () => {
      if (this.locked) return;
      this.locked = true;
      for (const b of this.buttons) b.disabled = true;
      action();
    });
    return button;
  }
}
