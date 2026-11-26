// Add menu options and How to Play card text
import { BIRD_COLORS, type BirdColor, type HowToPlayCard, type SpeciesTraits } from "./types";

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

export const PLACEHOLDER_TEXT: Record<"creation", string> = {
  creation: "Species creation is coming in US2.",
};

// US10: minigames menu (main menu option 3) and the Hatching Rhythm difficulty picker.
export const MINIGAME_OPTIONS: string[] = ["Hatching Rhythm"];

export const MINIGAME_ERROR =
  "Please type 1 to play, or B to go back to the menu.";

export const DIFFICULTY_OPTIONS: string[] = ["Easy", "Hard"];

export const DIFFICULTY_ERROR =
  "Please type 1 or 2, or B to go back to the minigames.";

const COLOR_DESCRIPTIONS: Record<BirdColor, {
  label: string;
  advantage: string;
  disadvantage: string;
}> = {
  brown: {
    label: "Brown",
    advantage: "Blends in well with forests.",
    disadvantage: "Stands out against sandy ground.",
  },
  gray: {
    label: "Gray",
    advantage: "Blends in fairly well in different habitats, especially scrubland.",
    disadvantage: "Other colors provide better camouflage in forests and sandy areas.",
  },
  yellow: {
    label: "Yellow",
    advantage: "Blends in well with sandy ground.",
    disadvantage: "Predators can easily spot it in forests.",
  },
  white: {
    label: "White",
    advantage: "Provides the best camouflage in sandy areas.",
    disadvantage: "Stands out in forests and scrubland.",
  },
};

export const TRAIT_OPTIONS = {
  beakLength: [
    {
      value: "short",
      label: "Short",
      advantage: "Good at eating small seeds and insects",
      disadvantage: "Has trouble eating hard seeds.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Can eat many different kinds of food.",
      disadvantage: "Not especially good at gathering any one type of food.",
    },
    {
      value: "long",
      label: "Long",
      advantage: "Good at eating plants and hard seeds.",
      disadvantage: "Has trouble catching insects.",
    },
  ],
  bodySize: [
    {
      value: "small",
      label: "Small",
      advantage: "Needs less food and is less likely to be caught by predators.",
      disadvantage: "Gets cold more easily.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Has balanced food needs and body warmth.",
      disadvantage: "Has no special advantage when food is scarce.",
    },
    {
      value: "large",
      label: "Large",
      advantage: "Stays warmer in cold weather.",
      disadvantage: "Needs more food and is more likely to be caught by predators.",
    },
  ],
  featherDensity: [
    {
      value: "thin",
      label: "Thin",
      advantage: "Helps the bird stay cool in hot weather.",
      disadvantage: "Offers little protection from the cold.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Keeps the bird comfortable in mild weather.",
      disadvantage: "Offers less protection in very hot or cold weather.",
    },
    {
      value: "thick",
      label: "Thick",
      advantage: "Helps the bird survive cold winters.",
      disadvantage: "The bird may overheat on hot days.",
    },
  ],
  color: BIRD_COLORS.map((value) => ({ value, ...COLOR_DESCRIPTIONS[value] })),
} as const satisfies {
  [Key in keyof SpeciesTraits]: readonly {
    value: SpeciesTraits[Key];
    label: string;
    advantage: string;
    disadvantage: string;
  }[];
};

export const CREATION_STEPS = [
  "name",
  "beakLength",
  "bodySize",
  "featherDensity",
  "color",
  "confirm",
] as const;

// Tunable balance numbers for the simulation and events.
// These are game-balancing targets, not scientific values; adjust during playtesting.

export const SIM = {
  // Population
  START_POP: 80,
  /** Chance each starting bird's trait matches the player's pick (otherwise a random other option). */
  START_MATCH: 0.7,
  /** Chance per trait per chick of a mutation. */
  MUTATION: 0.02,
  /** Extra chance for a chick to develop an option the player has favored. */
  INHERITANCE_BIAS_CHANCE: 0.10,
  LOW_POP: 10,
  MAX_POP: 250,

  // Reproduction
  EGGS_PER_PAIR: 4,
  BASE_HATCH: 0.55,
  /** Crowding scale used in the density factor (DENSITY_OFFSET - survivors / K). */
  K: 150,
  DENSITY_OFFSET: 1.6,
  MAX_HATCH: 0.95,
  // Reproductive fitness: clamp(REP_BASE + REP_SLOPE * feeding, REP_FIT_MIN, REP_FIT_MAX)
  REP_BASE: 0.6,
  REP_SLOPE: 0.4,
  REP_FIT_MIN: 0.5,
  REP_FIT_MAX: 1.3,

  // Starvation: clamp(STARVE_BASE + STARVE_SLOPE * (1 - feeding), STARVE_MIN, STARVE_MAX)
  STARVE_BASE: 0.05,
  STARVE_SLOPE: 0.6,
  STARVE_MIN: 0.02,
  STARVE_MAX: 0.9,

  // Exposure: clamp(EXPOSURE_SLOPE * |insulation - ideal|, 0, EXPOSURE_MAX)
  EXPOSURE_SLOPE: 0.08,
  EXPOSURE_MAX: 0.6,
  /** Temperature points (on the 0-100 scale) per unit of ideal insulation. */
  TEMP_PER_INSULATION: 10,
  IDEAL_INSULATION_MAX: 1.5,

  // Predation: clamp(PRED_BASE * (predation/NORMAL) * detect * exposure * vulnerability, 0, PRED_MAX)
  PRED_BASE: 0.12,
  PRED_MAX: 0.8,
  /** How much full habitat cover reduces exposure to predators. */
  COVER_SHIELD: 0.5,
} as const;

// Every island value is a whole number from MIN to MAX,
// and NORMAL is the starting level.
// Competition starts at 0, meaning no competing species.

export const ENV = {
  NORMAL: 50,
  MIN: 0,
  MAX: 100,
  /**
   * The design report's event numbers assume normal = 100.
   * Event effects are multiplied by this so eventDefinitions.ts
   * can keep the report's numbers while the island uses normal = 50.
   */
  REPORT_SCALE: 50 / 100,
  /** Fraction of the gap to its target a derived resource closes each generation. */
  REGEN_RATE: 0.2,
  /** Fraction of the gap to normal that rainfall/temperature close when no event touches them. */
  PRIMARY_DRIFT: 0.1,
} as const;

export const EVENTS = {
  /** No events can start in generations 1..PROTECTED_GENS. */
  PROTECTED_GENS: 4,
  /** Start chance = min(P_MAX, P_BASE + P_STEP * generations since the last event started). */
  P_BASE: 0.05,
  P_STEP: 0.04,
  P_MAX: 0.5,
  /** Don't start events right before an observation milestone (gen % 10). */
  NO_START_MOD10: [8, 9],
  SEVERITY: [0.8, 1.2],
  MILESTONE_EVERY: 10,
} as const;

// Stage dimensions
export const STAGE_WIDTH = 1200;
export const STAGE_HEIGHT = 820;

// Game settings
export const GAME_DURATION = 10; // seconds

// Game Colors
export const COLORS = {
  bg: '#081320', panel: '#122337', panel2: '#182c40', border: '#284158',
  text: '#f2f7fb', muted: '#a4b9c7', teal: '#60dfba', blue: '#80bfff',
  orange: '#f7bc76', red: '#ff9b94', line: '#254056'
};
