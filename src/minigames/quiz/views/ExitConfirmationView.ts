import type { ExitConfirmationHandlers, ExitConfirmationRenderState } from '../quizTypes';
import { EXIT_CONFIRMATION_COPY } from './quizScreenModels';
import { el } from './QuizScreenElement';

let nextDialogId = 0;

/**
 * "Leave this quiz?" confirmation, shown over the question or feedback screen.
 *
 * Uses a native modal <dialog>: focus stays inside it, the screen behind is
 * inert, and Escape counts as Keep playing. Opening remembers the focused
 * control; closing returns focus to it if it is still visible. The view only
 * emits actions. The runner decides what Keep playing / Leave quiz do and
 * closes it with `render({ open: false })`, so the screen behind keeps its
 * selection and lock untouched.
 */
export class ExitConfirmationView {
  private readonly dialog: HTMLDialogElement;
  private readonly keepButton: HTMLButtonElement;
  private readonly leaveButton: HTMLButtonElement;
  private handlers: ExitConfirmationHandlers | null = null;
  private returnFocus: HTMLElement | null = null;
  private locked = false;

  constructor() {
    const id = `quiz-dialog-${++nextDialogId}`;
    this.keepButton = el('button', {
      className: 'quiz-button quiz-button--primary', text: EXIT_CONFIRMATION_COPY.keepPlayingLabel,
      attrs: { type: 'button' },
    });
    this.leaveButton = el('button', {
      className: 'quiz-button', text: EXIT_CONFIRMATION_COPY.leaveLabel,
      attrs: { type: 'button' },
    });
    this.keepButton.addEventListener('click', () => this.choose(() => this.handlers?.onKeepPlaying()));
    this.leaveButton.addEventListener('click', () => this.choose(() => this.handlers?.onLeave()));

    this.dialog = el('dialog', {
      className: 'quiz-dialog',
      attrs: { 'aria-labelledby': `${id}-heading`, 'aria-describedby': `${id}-body` },
    }, [
      el('h2', { className: 'quiz-heading', text: EXIT_CONFIRMATION_COPY.heading, attrs: { id: `${id}-heading` } }),
      el('p', { text: EXIT_CONFIRMATION_COPY.body, attrs: { id: `${id}-body` } }),
      el('div', { className: 'quiz-actions' }, [this.keepButton, this.leaveButton]),
    ]);

    // Escape: keep the dialog open until the runner closes it, and treat it as Keep playing.
    this.dialog.addEventListener('cancel', event => {
      event.preventDefault();
      this.choose(() => this.handlers?.onKeepPlaying());
    });
    // Runs for every close, including one the browser forces.
    this.dialog.addEventListener('close', () => this.restoreFocus());
    // A modal dialog makes the page behind it inert, but Tab can still leave the
    // page; wrap between the two buttons instead.
    this.dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const first = this.keepButton;
      const last = this.leaveButton;
      if (event.shiftKey && document.activeElement !== last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement !== first) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /** The <dialog> element; the runner attaches it once, next to the quiz screens. */
  getElement(): HTMLDialogElement { return this.dialog; }

  bind(handlers: ExitConfirmationHandlers): void {
    this.handlers = handlers;
  }

  render(state: ExitConfirmationRenderState): void {
    if (state.open && !this.dialog.open) {
      if (!this.dialog.isConnected) {
        throw new Error('Attach ExitConfirmationView.getElement() to the page before opening it');
      }
      const active = document.activeElement;
      this.returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
      this.setLocked(false);
      this.dialog.showModal();
      // Default to the non-destructive choice.
      this.keepButton.focus();
    } else if (!state.open && this.dialog.open) {
      this.dialog.close();
    }
  }

  private choose(action: () => void): void {
    if (this.locked) return;
    this.setLocked(true);
    action();
  }

  private setLocked(locked: boolean): void {
    this.locked = locked;
    this.keepButton.disabled = locked;
    this.leaveButton.disabled = locked;
  }

  /** Return focus to the control that opened the dialog, unless its screen was hidden (Leave quiz). */
  private restoreFocus(): void {
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target && target.isConnected && !target.closest('[hidden]')) target.focus();
  }
}
