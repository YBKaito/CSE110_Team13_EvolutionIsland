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
export interface EnvironmentState {
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
export type NumericEnvironmentKey = Exclude<keyof EnvironmentState, 'habitatBackground'>;

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
  state: Readonly<EnvironmentState>;
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
  environment: EnvironmentState;
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
