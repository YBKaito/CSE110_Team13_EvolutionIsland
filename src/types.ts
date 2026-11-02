export type TraitKey = 'beakLength' | 'bodySize' | 'featherDensity' | 'color';
export type RGB = readonly [number, number, number];
export type TraitCounts = Record<TraitKey, Record<string, number>>;
export type PreferredTraits = Record<TraitKey, string>;


/**

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

export interface GenerationResults {
  eventList: string[];
  populationDecline: number;
  populationIncrease: number;
  newPopulation: number;
}
export interface EnvironmentUpdated {
  generation: number;
  state: Readonly<EnvironmentState>;
}
export interface GenerationCompleted {
  generation: number;
  results: GenerationResults;
  traitCounts: TraitCounts;
}
export interface ObservationSnapshot {
  generation: number;
  results: GenerationResults;
  environment: EnvironmentState;
  traitCounts: TraitCounts;
}
export interface TraitFocusChoice {
  generation: number;
  traitKey: TraitKey;
  fromValue: string;
  targetValue: string;
}
export interface DecisionRecord extends TraitFocusChoice {
  populationAtDecision: number;
}
export type SubmitResult = { ok: true } | { ok: false; error: string };