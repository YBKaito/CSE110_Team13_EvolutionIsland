// US10 Hatching Rhythm: links beat speed and box size to the bird's fitness.
// A well-fit bird gets slow bars, more time between them, and a wide box (easy).
// A poorly fit bird gets fast, close bars and a narrow box (hard).

import { SIM } from '../../constants';
import { clamp, reproductiveFitness } from '../../simulation/Fitness';
import type { EnvironmentState, MinigameDifficulty, Traits } from '../../types';
import type { TrackSettings } from './noteTrack';

/** Settings for a perfectly fit bird (fitness 1). */
export const EASY_TRACK: TrackSettings = { speed: 0.35, beatInterval: 800, boxWidth: 230, noteCount: 20 };

/** Settings for the least fit bird (fitness 0). */
export const HARD_TRACK: TrackSettings = { speed: 0.55, beatInterval: 480, boxWidth: 60, noteCount: 20 };

/** Fitness at or above this plays as "easy"; below it plays as "hard". */
export const EASY_FITNESS_THRESHOLD = 0.5;

/** Fitness used when the player picks a difficulty from the minigames menu (no bird yet). */
export const DIFFICULTY_FITNESS: Record<MinigameDifficulty, number> = { easy: 1, hard: 0 };

/**
 * Shown under the title on hard, like the mockup.
 * The zero-width non-joiner (‌) stops Pixelify Sans from drawing "fi" as a ligature that reads like "At".
 */
export const HARD_MESSAGE = '“A poor f‌it made hatching harder.”';

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Track settings for a fitness from 0 (poor fit) to 1 (great fit). Values outside 0 to 1 are clamped. */
export function trackForFitness(fitness: number): TrackSettings {
  const t = clamp(fitness, 0, 1);
  return {
    speed: lerp(HARD_TRACK.speed, EASY_TRACK.speed, t),
    beatInterval: Math.round(lerp(HARD_TRACK.beatInterval, EASY_TRACK.beatInterval, t)),
    boxWidth: Math.round(lerp(HARD_TRACK.boxWidth, EASY_TRACK.boxWidth, t)),
    noteCount: EASY_TRACK.noteCount,
  };
}

export function difficultyForFitness(fitness: number): MinigameDifficulty {
  return fitness >= EASY_FITNESS_THRESHOLD ? 'easy' : 'hard';
}

/**
 * A bird's fitness on a 0 to 1 scale, from the simulation's reproductive fitness
 * (how well-fed parents are in this environment). Lets a run start the minigame for a real bird.
 */
export function birdFitness(traits: Traits, env: EnvironmentState): number {
  const raw = reproductiveFitness(traits, env);
  return clamp((raw - SIM.REP_FIT_MIN) / (SIM.REP_FIT_MAX - SIM.REP_FIT_MIN), 0, 1);
}

/**
 * Fitness of one bird picked at random from the current flock, so a run's
 * Hatching Rhythm difficulty reflects how well the flock suits the island now.
 * Uses its own random source so the seeded simulation is not touched.
 * Returns null for an empty flock.
 */
export function randomFlockBirdFitness(
  birds: readonly { traits: Traits }[],
  env: EnvironmentState,
  random: () => number = Math.random,
): number | null {
  if (birds.length === 0) return null;
  const bird = birds[Math.min(birds.length - 1, Math.floor(random() * birds.length))];
  return birdFitness(bird.traits, env);
}
