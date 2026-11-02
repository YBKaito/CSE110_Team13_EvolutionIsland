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
  /** Temperature points per unit of ideal insulation. */
  TEMP_PER_INSULATION: 20,
  IDEAL_INSULATION_MAX: 1.5,

  // Predation: clamp(PRED_BASE * (predation/100) * detect * exposure * vulnerability, 0, PRED_MAX)
  PRED_BASE: 0.12,
  PRED_MAX: 0.8,
  /** How much full habitat cover reduces exposure to predators. */
  COVER_SHIELD: 0.5,
} as const;

export const ENV = {
  /** Fraction of the gap to its target a derived resource closes each generation. */
  REGEN_RATE: 0.2,
  /** Fraction of the gap to baseline that rainfall/temperature close when no event touches them. */
  PRIMARY_DRIFT: 0.1,
  BASELINE: 100,
  BOUNDS: {
    temperature: [50, 150],
    rainfall: [0, 150],
    food: [0, 150],
    cover: [0, 150],
    predation: [0, 200],
    competition: [0, 100],
  },
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