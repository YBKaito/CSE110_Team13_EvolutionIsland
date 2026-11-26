// Decides when a minigame interrupts the main run and which one it is.
// Holds no game rules and draws nothing: the run session asks it after each
// batch of generations, launches whatever it returns, then reports back with finish().

/** Minigames that can pop up between generations: Extinction Prediction (US8) and Hatching Rhythm (US10). */
export type MidRunMinigameId = 'extinction' | 'hatching';
/** The quiz (US9) only runs once, at the end of the run. */
export type MinigameId = MidRunMinigameId | 'quiz';

export const MID_RUN_MINIGAMES: readonly MidRunMinigameId[] = ['extinction', 'hatching'];

export const MINIGAME_SCHEDULE = {
  /** Generations that must pass after the start of the run, or after the last minigame, before another can appear. */
  MIN_GAP: 5,
  /** Once eligible, the chance a minigame appears after a given batch of generations, so they land at random points. */
  CHANCE: 0.35,
} as const;

export interface MinigameManagerOptions {
  minGap?: number;
  chance?: number;
  /** Returns a number in [0, 1). Defaults to Math.random so the seeded simulation is not touched. */
  random?: () => number;
  midRun?: readonly MidRunMinigameId[];
}

export class MinigameManager {
  private readonly minGap: number;
  private readonly chance: number;
  private readonly random: () => number;
  private readonly midRun: readonly MidRunMinigameId[];
  private activeId: MinigameId | null = null;
  private lastGeneration = 0;
  private quizPlayed = false;

  constructor(options: MinigameManagerOptions = {}) {
    this.minGap = options.minGap ?? MINIGAME_SCHEDULE.MIN_GAP;
    this.chance = options.chance ?? MINIGAME_SCHEDULE.CHANCE;
    this.random = options.random ?? Math.random;
    this.midRun = options.midRun ?? MID_RUN_MINIGAMES;
    if (this.midRun.length === 0) throw new Error('At least one mid-run minigame is required.');
  }

  /** The minigame on screen right now, if any. */
  get active(): MinigameId | null { return this.activeId; }

  /** Generation the last mid-run minigame started at (0 before the first one). */
  get lastMinigameGeneration(): number { return this.lastGeneration; }

  /** True when nothing is running and at least `minGap` generations have passed since the last minigame. */
  isEligible(generation: number): boolean {
    return this.activeId === null && generation - this.lastGeneration >= this.minGap;
  }

  /**
   * Call when the run is back between generations. Returns the minigame to
   * launch (and marks it active), or null when none should appear now.
   */
  startMidRun(generation: number): MidRunMinigameId | null {
    if (!this.isEligible(generation)) return null;
    if (this.random() >= this.chance) return null;
    const id = this.midRun[Math.min(this.midRun.length - 1, Math.floor(this.random() * this.midRun.length))];
    this.activeId = id;
    this.lastGeneration = generation;
    return id;
  }

  /** Call when the run is over. Returns 'quiz' the first time, if nothing else is running. */
  startEndOfRun(): 'quiz' | null {
    if (this.activeId !== null || this.quizPlayed) return null;
    this.quizPlayed = true;
    this.activeId = 'quiz';
    return 'quiz';
  }

  /** The minigame closed; control goes back to the run. Ignores a minigame that is not the active one. */
  finish(id: MinigameId): void {
    if (this.activeId === id) this.activeId = null;
  }
}
