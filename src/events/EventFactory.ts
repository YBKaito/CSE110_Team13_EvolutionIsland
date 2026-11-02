// Decides when a new environmental event starts (module view: eventFactory).
// RandomScheduler is the real game; ScriptedScheduler replays a fixed timeline for tests and demos.

import { EVENTS } from '../constants';
import type { RandomSource } from '../simulation/Random';
import type { ActiveEvent, EventDef } from '../types';
import { EVENT_DEFS, type ScriptEntry } from './eventDefinitions';

export interface SchedulerContext {
  generation: number;
  active: readonly ActiveEvent[];
  /** Generation the most recent event started, or 0 if none has. */
  lastStartGen: number;
}

export interface EventScheduler {
  maybeStart(ctx: SchedulerContext, rng: RandomSource): EventDef | null;
}

/**
 * Whether `def` may start alongside the currently active events.
 * MVP limits: one climate event, one disturbance, one biological event still establishing;
 * a permanent event never repeats; conflicting events never overlap.
 */
export function isEligible(def: EventDef, active: readonly ActiveEvent[], defs: Record<string, EventDef> = EVENT_DEFS): boolean {
  for (const event of active) {
    const other = defs[event.defId];
    if (!other) continue;
    if (other.id === def.id) return false;
    if (def.conflictsWith?.includes(other.id) || other.conflictsWith?.includes(def.id)) return false;
    if (other.category === def.category) {
      if (def.category !== 'biological') return false;
      const stillEstablishing = other.stages[event.stageIndex]?.name !== 'established';
      if (stillEstablishing) return false;
    }
  }
  return true;
}

export class RandomScheduler implements EventScheduler {
  constructor(private readonly defs: Record<string, EventDef> = EVENT_DEFS) {}

  /** Chance an event starts this generation; grows the longer the island has been quiet. */
  static startChance(generation: number, lastStartGen: number): number {
    const quietFor = generation - lastStartGen;
    return Math.min(EVENTS.P_MAX, EVENTS.P_BASE + EVENTS.P_STEP * quietFor);
  }

  maybeStart(ctx: SchedulerContext, rng: RandomSource): EventDef | null {
    const { generation, active, lastStartGen } = ctx;
    if (generation <= EVENTS.PROTECTED_GENS) return null;
    // Let the player first meet an event in its warning stage, not right before an observation milestone.
    if ((EVENTS.NO_START_MOD10 as readonly number[]).includes(generation % EVENTS.MILESTONE_EVERY)) return null;
    if (!rng.chance(RandomScheduler.startChance(generation, lastStartGen))) return null;

    const eligible = Object.values(this.defs).filter((def) => isEligible(def, active, this.defs));
    if (eligible.length === 0) return null;
    return rng.weightedPick(eligible, eligible.map((def) => def.weight));
  }
}

export class ScriptedScheduler implements EventScheduler {
  constructor(
    private readonly script: readonly ScriptEntry[],
    private readonly defs: Record<string, EventDef> = EVENT_DEFS,
  ) {}

  maybeStart(ctx: SchedulerContext): EventDef | null {
    const entry = this.script.find((e) => e.generation === ctx.generation);
    if (!entry) return null;
    const def = this.defs[entry.eventId];
    if (!def) throw new Error(`Unknown event id in script: ${entry.eventId}`);
    return def;
  }
}
