// Add screen and input types for US1
// Every screen the game can show. Later stories add more.
export type ScreenId =
  | "menu"
  | "howToPlay"
  | "minigames"
  | "end"
  | "creation"
  | "simulation";

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

//Used for species creation 
export type BeakLength = "short" | "medium" | "long";
export type BodySize = "small" | "medium" | "large";
export type FeatherDensity = "thin" | "medium" | "thick";
export type BirdColor = "light" | "brown" | "dark";

export interface SpeciesTraits {
  beakLength: BeakLength;
  bodySize: BodySize;
  featherDensity: FeatherDensity;
  color: BirdColor;
}

export interface SpeciesData {
  name: string;
  traits: SpeciesTraits;
}
