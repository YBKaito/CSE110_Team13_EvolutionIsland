// Add menu options and How to Play card text
import type { HowToPlayCard } from "./types";

export const GAME_TITLE = "EVOLUTION SIMULATOR";

export const MENU_OPTIONS: string[] = [
  "Start the game",
  "Learn about the mechanics",
  "Play the minigames",
  "End",
];

export const MENU_ERROR =
  "Please type a number from 1 to 4, then press Enter.";

export const CARD_ERROR =
  "Press Enter to continue, or type B to go back to the menu.";

export const HOW_TO_PLAY_CARDS: HowToPlayCard[] = [
  {
    title: "YOUR GOAL",
    lines: [
      "You design a bird species on a changing island.",
      "Keep your flock alive for as many generations as you can.",
      "If the population reaches 0, your species goes extinct.",
    ],
  },
  {
    title: "HOW A ROUND WORKS",
    lines: [
      "Each round is one generation.",
      "Events like droughts, floods, and predators change the island.",
      "Birds with traits that fit the island survive and lay eggs.",
      "Their chicks inherit those traits.",
    ],
  },
  {
    title: "YOUR CHOICES",
    lines: [
      "You pick 4 traits: beak length, body size, feather density, color.",
      "At Generation 10, 20, and 30 you make one evolution choice.",
      "Read the island stats first. Then pick the trait that helps most.",
      "The game gets harder every 10 generations.",
    ],
  },
];

export const PLACEHOLDER_TEXT: Record<"creation" | "minigames", string> = {
  creation: "Species creation is coming in US2.",
  minigames: "Minigames are coming in a later sprint.",
};
