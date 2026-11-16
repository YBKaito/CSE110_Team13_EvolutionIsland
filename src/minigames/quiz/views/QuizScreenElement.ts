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

/**
 * Shared shell for quiz screens: one <section> the runner attaches wherever it
 * likes, plus show/hide and heading focus. Starts hidden, like the Konva views.
 *
 * Elements marked `data-focus-key` get focus back after a same-screen re-render.
 * The element marked `data-quiz-heading` gets focus when a new screen appears.
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
    return { id: `${this.screenId}-heading`, tabindex: '-1', 'data-quiz-heading': '' };
  }

  private flushHeadingFocus(): void {
    if (!this.headingFocusPending || this.root.hidden || !this.root.isConnected) return;
    const heading = this.root.querySelector<HTMLElement>('[data-quiz-heading]');
    if (!heading) return;
    heading.focus();
    this.headingFocusPending = false;
  }
}
