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
  "Press Enter to continue or type B to go back to the menu.";

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



export const TRAIT_OPTIONS = {
  beakLength: [
    {
      value: "short",
      label: "Short",
      advantage: "Good for handling some small seeds.",
      disadvantage: "Cannot reach food in deep flowers.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Can access a variety of foods.",
      disadvantage: "Less specialized for certain foods.",
    },
    {
      value: "long",
      label: "Long",
      advantage: "Can reach food inside deep flowers.",
      disadvantage: "May struggle with some hard seeds.",
    },
  ],
  bodySize: [
    {
      value: "small",
      label: "Small",
      advantage: "Requires less food to survive.",
      disadvantage: "Vulnerable to some predators.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Balances food needs and body strength.",
      disadvantage: "Lacks some specialized advantages.",
    },
    {
      value: "large",
      label: "Large",
      advantage: "Can resist some smaller predators.",
      disadvantage: "Requires more food.",
    },
  ],
  featherDensity: [
    {
      value: "thin",
      label: "Thin",
      advantage: "Helps release heat in warm weather.",
      disadvantage: "Provides less cold insulation.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Provides moderate insulation.",
      disadvantage: "Less effective in extreme temperatures.",
    },
    {
      value: "thick",
      label: "Thick",
      advantage: "Provides better insulation in cold weather.",
      disadvantage: "Can increase overheating risk.",
    },
  ],
  color: [
    {
      value: "light",
      label: "Light",
      advantage: "Camouflages well in pale environments.",
      disadvantage: "More visible in dark environments.",
    },
    {
      value: "brown",
      label: "Brown",
      advantage: "Camouflages well in earthy environments.",
      disadvantage: "More visible in very pale environments.",
    },
    {
      value: "dark",
      label: "Dark",
      advantage: "Camouflages well in dark environments.",
      disadvantage: "More visible in pale environments.",
    },
  ],
} as const;

export const CREATION_STEPS = [
  "name",
  "beakLength",
  "bodySize",
  "featherDensity",
  "color",
  "confirm",
] as const;
