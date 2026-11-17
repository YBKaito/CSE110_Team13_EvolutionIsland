import './quiz.css';

let nextScreenId = 0;

interface ElementProps {
  readonly className?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

/** Create an element with text set safely through textContent. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: ElementProps = {}, children: readonly Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

/** The open modal dialog, if any. Everything outside it is blocked. */
function openModal(doc: Document): Element | null {
  try {
    return doc.querySelector('dialog:modal');
  } catch {
    return null; // :modal unsupported; fall back to the other checks.
  }
}

/**
 * Whether a control may still act for its screen: it belongs to the current
 * contents of a connected root, nothing above it is hidden or inert, and no
 * modal dialog outside it is open. A replaced control fails the membership check.
 */
export function isControlActive(root: HTMLElement, control: Element): boolean {
  if (!root.isConnected || !root.contains(control)) return false;
  if (control.closest('[hidden], [inert]')) return false;
  const modal = openModal(root.ownerDocument);
  return modal === null || modal.contains(control);
}

/**
 * Shared shell for quiz screens: one <section> the runner attaches wherever it
 * likes, plus show/hide and heading focus. Starts hidden, like the Konva views.
 *
 * Elements marked `data-focus-key` get focus back after a same-screen re-render;
 * the heading has one too, so a redraw keeps focus on it.
 * The element marked `data-quiz-heading` gets focus when a new screen appears.
 * Controls wired with `listen()` stop acting once replaced, hidden, or blocked.
 */
export abstract class QuizScreenElement {
  protected readonly root: HTMLElement;
  protected readonly screenId = `quiz-screen-${++nextScreenId}`;
  private headingFocusPending = false;

  constructor(kind: string) {
    this.root = el('section', {
      className: `quiz-screen quiz-screen--${kind}`,
      attrs: { 'aria-labelledby': `${this.screenId}-heading` },
    });
    this.root.hidden = true;
  }

  getElement(): HTMLElement { return this.root; }

  show(): void {
    this.root.hidden = false;
    this.flushHeadingFocus();
  }

  hide(): void { this.root.hidden = true; }

  /** Ask for the heading to be focused as soon as the screen is visible and attached. */
  protected requestHeadingFocus(): void {
    this.headingFocusPending = true;
  }

  /** Replace the screen contents, keeping keyboard focus on the same control if possible. */
  protected replaceContents(children: readonly Node[]): void {
    const active = document.activeElement;
    const focusKey = active instanceof HTMLElement && this.root.contains(active)
      ? active.dataset.focusKey
      : undefined;

    this.root.replaceChildren(...children);

    if (this.headingFocusPending) {
      this.flushHeadingFocus();
    } else if (focusKey !== undefined) {
      const match = Array.from(this.root.querySelectorAll<HTMLElement>('[data-focus-key]'))
        .find(node => node.dataset.focusKey === focusKey);
      match?.focus();
    }
  }

  protected headingAttrs(): Record<string, string> {
    return {
      id: `${this.screenId}-heading`, tabindex: '-1', 'data-quiz-heading': '', 'data-focus-key': 'heading',
    };
  }

  /**
   * Add a listener that runs only while `control` is active (see isControlActive).
   * The check uses the control captured here, so an old control cannot reach
   * handlers that were rebound for a newer screen. Submit events are always
   * prevented so a stale form never navigates the page.
   */
  protected listen<K extends keyof HTMLElementEventMap>(
    control: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void,
  ): void {
    control.addEventListener(type, event => {
      if (type === 'submit') event.preventDefault();
      if (isControlActive(this.root, control)) listener(event);
    });
  }

  private flushHeadingFocus(): void {
    if (!this.headingFocusPending || this.root.hidden || !this.root.isConnected) return;
    const heading = this.root.querySelector<HTMLElement>('[data-quiz-heading]');
    if (!heading) return;
    heading.focus();
    this.headingFocusPending = false;
  }
}
