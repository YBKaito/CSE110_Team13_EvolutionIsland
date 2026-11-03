
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

// Used for species creation
export type BeakLength = "short" | "medium" | "long";
export type BodySize = "small" | "medium" | "large";
export type FeatherDensity = "thin" | "medium" | "thick";
export type BirdColor = "brown" | "gray" | "yellow" | "white";

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

// Shared data contracts for the simulation (US3), events (US4),
// and the game coordinator.
// ---------- Birds ----------

export type TraitName = "beak" | "body" | "feathers" | "color";

/** Each trait is stored as an index into that trait's option list (see simulation/traitContent.ts). */
export type Traits = Record<TraitName, number>;

export interface Bird {
  id: number;
  traits: Traits;
}

export interface Population {
  birds: Bird[];
  generation: number;
  /** Next id to hand out to a newborn bird. */
  nextId: number;
}

// ---------- Environment ----------

export type FoodType =
  | "softPlants"
  | "smallSeeds"
  | "hardSeeds"
  | "insects";

export const FOOD_TYPES: FoodType[] = [
  "softPlants",
  "smallSeeds",
  "hardSeeds",
  "insects",
];

export type Background = "forest" | "scrub" | "sand";

/** Every island value is a whole number from 0 to 100, where 50 is normal (competition: 0 = no competitor). */
export interface EnvironmentState {
  /** 50 = the island's normal climate. */
  temperature: number;
  /** 50 = normal rainfall. */
  rainfall: number;
  /** Derived food resources, 50 = normal abundance. */
  food: Record<FoodType, number>;
  /** Derived habitat cover / shelter, 50 = normal. */
  cover: number;
  /** 50 = normal predator pressure. */
  predation: number;
  /** 0 = no competing species. */
  competition: number;
  /** What the competing species eats, if one exists. */
  competitorDiet: FoodType | null;
  background: Background;
  /** Regeneration capacity multipliers; 1.0 = normal. Lasting event damage lowers these. */
  capacity: Record<FoodType | "cover", number>;
}

/** Numeric environment variables that events can change. */
export type EnvVariable =
  | "temperature"
  | "rainfall"
  | "predation"
  | "competition"
  | "cover"
  | FoodType;

export interface EnvChange {
  variable: EnvVariable;
  before: number;
  after: number;
}

// ---------- Generation results ----------

export type DeathCause =
  | "starvation"
  | "exposure"
  | "predation"
  | "disaster";

export const DEATH_CAUSES: DeathCause[] = [
  "starvation",
  "exposure",
  "predation",
  "disaster",
];

export interface GenerationResult {
  generation: number;
  /** Adults alive at the start of the generation. */
  startPopulation: number;
  /** Chicks that make up the next generation. */
  population: number;
  born: number;
  /** Every adult leaves the flock (non-overlapping generations). */
  died: number;
  /** Adults that died before they could breed, by cause. */
  deathsByCause: Record<DeathCause, number>;
  /** Count of birds per option index, for each trait, in the new population. */
  traitCounts: Record<TraitName, number[]>;
  /** Average per-bird risks the adults faced this generation. */
  avgRisk: {
    starvation: number;
    exposure: number;
    predation: number;
  };
  lowPopulation: boolean;
  extinct: boolean;
}

// ---------- Events ----------

export type EventCategory =
  | "climate"
  | "disturbance"
  | "biological"
  | "habitat";

export type StageName =
  | "warning"
  | "growing"
  | "peak"
  | "recovery"
  | "impact"
  | "aftermath"
  | "establishing"
  | "established";

export interface EffectSpec {
  variable: EnvVariable;
  /** perGen: applied every generation of the stage. once: applied on the stage's first generation. */
  mode: "perGen" | "once";
  /** Change in index points; sampled with a bias toward the middle of the range. */
  range: [number, number];
}

export interface StageDef {
  name: StageName;
  minDuration: number;
  /** null = indefinite (e.g. an established predator). */
  maxDuration: number | null;
  /** Chance per generation of moving on once minDuration is reached. */
  transitionChance: number;
  effects: EffectSpec[];
  /**
   * Variables this stage keeps where they are: no drift back to normal and no regeneration.
   * (e.g. a drought's peak holds rainfall low.)
   * Variables the stage's effects change are held automatically.
   */
  holds?: EnvVariable[];
  /** Fraction of the flock killed at random (trait-independent), applied on the stage's first generation. */
  randomMortality?: [number, number];
  /** Player-facing text for this stage. */
  message: string;
  /** Short headline for the event card, e.g. "The rains are slowing". */
  title?: string;
}

export interface EventDef {
  id: string;
  name: string;
  category: EventCategory;
  /** Relative chance of being picked by the random scheduler. */
  weight: number;
  persistence: "temporary" | "permanent";
  stages: StageDef[];
  /** Chance of permanently lowering regeneration capacity when a temporary event resolves. */
  lastingEffect?: {
    chance: number;
    capacity: Partial<EnvironmentState["capacity"]>;
  };
  setsCompetitorDiet?: FoodType;
  /** Event ids that cannot be active at the same time as this one. */
  conflictsWith?: string[];
}

export interface ActiveEvent {
  defId: string;
  stageIndex: number;
  /** Generations completed in the current stage. */
  genInStage: number;
  startedAt: number;
  /** Per-run strength multiplier applied to every effect of this event. */
  severity: number;
  resolved: boolean;
}

export interface EventLogEntry {
  generation: number;
  eventId: string;
  eventName: string;
  kind: "started" | "stageChanged" | "resolved";
  stage: StageName;
  message: string;
}
/**
 * Data types shared by the evolution choice screen and simulation.
 */
export type TraitKey = 'beakLength' | 'bodySize' | 'featherDensity' | 'color';
export type RGB = readonly [number, number, number];

/** Number of birds with each option, for each of the four traits. */
export type TraitCounts = Record<TraitKey, Record<string, number>>;

/** Which option the player currently favors for future offspring. */
export type PreferredTraits = Record<TraitKey, string>;

/** 
 * Environment indices are integers from 0 to 100. They start at 0 and cap at 100.
 */
export interface EnvironmentStateMock {
  temperature: number;
  rainfall: number;
  softPlants: number;
  smallSeeds: number;
  hardSeeds: number;
  insects: number;
  predationPressure: number;
  habitatCover: number;
  competition: number;
  habitatBackground: RGB;
}
export type NumericEnvironmentKey = Exclude<keyof EnvironmentStateMock, 'habitatBackground'>;

/**
 * Results from one generation.
 */
export interface GenerationResults {
  eventList: string[];
  populationDecline: number;
  populationIncrease: number;
  newPopulation: number;
}

/** Environment values tagged with the generation they belong to. */
export interface EnvironmentUpdated {
  generation: number;
  state: Readonly<EnvironmentStateMock>;
}

/** Generation results with trait counts for the choice screen's distribution bars. */
export interface GenerationCompleted {
  generation: number;
  results: GenerationResults;
  traitCounts: TraitCounts;
}

/** A saved copy of the data shown at an observation checkpoint. */
export interface ObservationSnapshot {
  generation: number;
  results: GenerationResults;
  environment: EnvironmentStateMock;
  traitCounts: TraitCounts;
}

/** A neighboring change to one preferred trait option. */
export interface TraitFocusChoice {
  generation: number;
  traitKey: TraitKey;
  fromValue: string;
  targetValue: string;
}

/** A previously accepted choice, including the flock size at the time. */
export interface DecisionRecord extends TraitFocusChoice {
  populationAtDecision: number;
}

/** Result returned by the coordinator after submitting a preference. */
export type SubmitResult = { ok: true } | { ok: false; error: string };
