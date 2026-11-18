// A plain description of what a text-style screen shows. Views build these; the Konva renderer draws them.
// Keeping this free of Konva lets views and controllers be unit-tested without a canvas.

export type TextSize = 'title' | 'heading' | 'body' | 'small';
export type TextColor = 'normal' | 'error' | 'success' | 'muted';
export type TextAlign = 'left' | 'center' | 'right';

export interface LineChartSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

export interface LineChartMarker {
  x: number;
  label: string;
  color: string;
}

export interface LineChartEventMarker {
  x: number;
  label: string;
}

export interface StatCardItem {
  value: string;
  label: string;
  color?: string;
}

export interface LineChartSidePanel {
  title: string;
  introLines: string[];
  countHeading: string;
  counts: { label: string; count: number; total: number; color: string }[];
  footerLines: string[];
  footerDividerAfter?: number;
}

export type Block =
  | { kind: 'text'; text: string; size?: TextSize; color?: TextColor; bold?: boolean; indent?: number; align?: TextAlign }
  | { kind: 'gap'; size?: number }
  | { kind: 'table'; columns: string[]; rows: string[][]; columnWidths: number[]; bordered?: boolean; size?: TextSize; align?: TextAlign; headerBold?: boolean }
  | { kind: 'bars'; label: string; segments: { option: string; count: number; total: number }[] }
  | { kind: 'statCards'; items: StatCardItem[]; width: number; height: number }
  | {
      kind: 'lineChart';
      xLabel: string;
      yLabel: string;
      width: number;
      height: number;
      xMax: number;
      xTicks: number[];
      yTicks: number[];
      series: LineChartSeries[];
      markers?: LineChartMarker[];
      eventMarkers?: LineChartEventMarker[];
      selectedGeneration?: number;
      sidePanel?: LineChartSidePanel;
    };

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
  /** Optional screen-specific key handling. Return true when the key changed the screen. */
  handleKey?(key: string): boolean;
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
