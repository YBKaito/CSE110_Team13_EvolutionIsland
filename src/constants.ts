
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
      advantage: "Efficient at eating small seeds and insects.",
      disadvantage: "Struggles with hard seeds and soft plants.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Can eat a wide variety of foods.",
      disadvantage: "Less efficient than specialized beaks.",
    },
    {
      value: "long",
      label: "Long",
      advantage: "Efficient at eating soft plants and hard seeds.",
      disadvantage: "Struggles with small seeds and insects.",
    },
  ],
  bodySize: [
    {
      value: "small",
      label: "Small",
      advantage: "Requires less food and is less vulnerable to predators.",
      disadvantage: "Retains less body heat.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Balances food needs, heat retention, and vulnerability.",
      disadvantage: "Lacks specialized advantages.",
    },
    {
      value: "large",
      label: "Large",
      advantage: "Retains more body heat in cold environments.",
      disadvantage: "Requires more food and is more vulnerable to predators.",
    },
  ],
  featherDensity: [
    {
      value: "thin",
      label: "Thin",
      advantage: "Better suited for warm environments.",
      disadvantage: "Provides less insulation in cold environments.",
    },
    {
      value: "medium",
      label: "Medium",
      advantage: "Provides balanced insulation.",
      disadvantage: "Less effective in extreme temperatures.",
    },
    {
      value: "thick",
      label: "Thick",
      advantage: "Provides better insulation in cold environments.",
      disadvantage: "Can increase overheating risk in warm environments.",
    },
  ],
  color: [
    {
      value: "brown",
      label: "Brown",
      advantage: "Blends into forest environments.",
      disadvantage: "More visible against sandy backgrounds.",
    },
    {
      value: "gray",
      label: "Gray",
      advantage: "Blends into scrub environments.",
      disadvantage: "More visible in forests.",
    },
    {
      value: "yellow",
      label: "Yellow",
      advantage: "Provides some camouflage in sandy environments.",
      disadvantage: "Highly visible in forests.",
    },
    {
      value: "white",
      label: "White",
      advantage: "Blends into sandy environments.",
      disadvantage: "Highly visible in forests.",
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

// Tunable balance numbers for the simulation and events.
// These are game-balancing targets, not scientific values; adjust during playtesting.

export const SIM = {
  // Population
  START_POP: 80,
  /** Chance each starting bird's trait matches the player's pick (otherwise a random other option). */
  START_MATCH: 0.7,
  /** Chance per trait per chick of a mutation. */
  MUTATION: 0.02,
  LOW_POP: 10,
  MAX_POP: 250,

  // Reproduction
  EGGS_PER_PAIR: 4,
  BASE_HATCH: 0.55,
  /** Crowding scale used in the density factor (DENSITY_OFFSET - survivors / K). */
  K: 100,
  DENSITY_OFFSET: 2.0,
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
