// Add screen and input types for US1
// Every screen the game can show. Later stories add more.
export type ScreenId =
  | "menu"
  | "howToPlay"
  | "creation"
  | "minigames"
  | "end";

// What the controller returns after the player types something.
export interface InputResult {
  nextScreen: ScreenId;
  error: string | null;
}

// One page of the How to Play section.
export interface HowToPlayCard {
  title: string;
  lines: string[];
}
