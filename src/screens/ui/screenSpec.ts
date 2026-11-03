// A plain description of what a text-style screen shows. Views build these; the Konva renderer draws them.
// Keeping this free of Konva lets views and controllers be unit-tested without a canvas.

export type TextSize = 'title' | 'heading' | 'body' | 'small';
export type TextColor = 'normal' | 'error' | 'success' | 'muted';

export type Block =
  | { kind: 'text'; text: string; size?: TextSize; color?: TextColor; bold?: boolean; indent?: number }
  | { kind: 'gap'; size?: number }
  | { kind: 'table'; columns: string[]; rows: string[][]; columnWidths: number[]; bordered?: boolean; size?: TextSize }
  | { kind: 'bars'; label: string; segments: { option: string; count: number; total: number }[] };

export interface PromptSpec {
  /** 'choice' shows "What is your choice? __" and accepts typed text; 'enter' just waits for Enter. */
  mode: 'choice' | 'enter';
  label: string;
  /** Red line shown above the prompt after invalid input. */
  error?: string;
  /** Defaults to 'body'. */
  size?: TextSize;
}

export interface ScreenSpec {
  blocks: Block[];
  prompt: PromptSpec;
}

/** Anything the screen host can display. */
export interface Screen {
  spec(): ScreenSpec;
  /** Called when the player presses Enter, with whatever they typed (trimmed). */
  submit(input: string): void;
}

/** What controllers need from the host; lets them be tested with a fake host. */
export interface ScreenNavigator {
  show(screen: Screen): void;
  /** Re-draw the current screen after its state changed. */
  refresh(): void;
}

export const text = (value: string, options: Omit<Extract<Block, { kind: 'text' }>, 'kind' | 'text'> = {}): Block => ({
  kind: 'text',
  text: value,
  ...options,
});

export const gap = (size?: number): Block => ({ kind: 'gap', size });

export const CHOICE_PROMPT = 'What is your choice? ';
