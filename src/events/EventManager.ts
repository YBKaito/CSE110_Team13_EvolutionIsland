// Runs active events through their stages and applies their effects to the environment (module view: eventManager).
// Events only ever change environment variables; they never touch birds or fitness directly.

import { EVENTS } from '../constants';
import { clampEnvironment, cloneEnvironment, getValue, setValue } from '../models/Environment';
import type { RandomSource } from '../simulation/Random';
import type { ActiveEvent, EnvironmentState, EnvVariable, EventDef, EventLogEntry } from '../types';
import { EVENT_DEFS } from './eventDefinitions';
import type { EventScheduler } from './EventFactory';

export interface EventStepResult {
  env: EnvironmentState;
  active: ActiveEvent[];
  log: EventLogEntry[];
  /** Variables events controlled this generation; regeneration leaves them alone. */
  held: Set<EnvVariable>;
  /** Fraction of the flock lost to disasters this generation (trait-independent). */
  mortality: number;
  lastStartGen: number;
}

function logEntry(generation: number, def: EventDef, event: ActiveEvent, kind: EventLogEntry['kind'], message: string): EventLogEntry {
  return { generation, eventId: def.id, eventName: def.name, kind, stage: def.stages[event.stageIndex].name, message };
}

/** Starts a new event (if the scheduler says so), applies every active event's current stage, and advances stages. */
export function advanceEvents(
  envIn: EnvironmentState,
  activeIn: readonly ActiveEvent[],
  generation: number,
  scheduler: EventScheduler,
  rng: RandomSource,
  lastStartGenIn = 0,
  defs: Record<string, EventDef> = EVENT_DEFS,
): EventStepResult {
  const env = cloneEnvironment(envIn);
  const active = activeIn.map((e) => ({ ...e }));
  const log: EventLogEntry[] = [];
  const held = new Set<EnvVariable>();
  let survivalFromDisasters = 1;
  let lastStartGen = lastStartGenIn;

  const started = scheduler.maybeStart({ generation, active, lastStartGen }, rng);
  if (started) {
    const event: ActiveEvent = {
      defId: started.id,
      stageIndex: 0,
      genInStage: 0,
      startedAt: generation,
      severity: rng.triangular(EVENTS.SEVERITY[0], EVENTS.SEVERITY[1]),
      resolved: false,
    };
    if (started.setsCompetitorDiet) env.competitorDiet = started.setsCompetitorDiet;
    active.push(event);
    lastStartGen = generation;
    log.push(logEntry(generation, started, event, 'started', started.stages[0].message));
  }

  for (const event of active) {
    const def = defs[event.defId];
    const stage = def.stages[event.stageIndex];
    const firstGen = event.genInStage === 0;

    for (const effect of stage.effects) {
      held.add(effect.variable);
      if (effect.mode === 'once' && !firstGen) continue;
      const delta = rng.triangular(effect.range[0], effect.range[1]) * event.severity;
      setValue(env, effect.variable, getValue(env, effect.variable) + delta);
    }
    for (const variable of stage.holds ?? []) held.add(variable);
    if (stage.randomMortality && firstGen) {
      const [min, max] = stage.randomMortality;
      survivalFromDisasters *= 1 - Math.min(1, rng.triangular(min, max) * event.severity);
    }

    event.genInStage++;
    const reachedMax = stage.maxDuration !== null && event.genInStage >= stage.maxDuration;
    const mayMove = stage.maxDuration !== null && event.genInStage >= stage.minDuration && rng.chance(stage.transitionChance);
    if (!reachedMax && !mayMove) continue;

    if (event.stageIndex + 1 < def.stages.length) {
      event.stageIndex++;
      event.genInStage = 0;
      log.push(logEntry(generation, def, event, 'stageChanged', def.stages[event.stageIndex].message));
    } else {
      event.resolved = true;
      if (def.lastingEffect && rng.chance(def.lastingEffect.chance)) {
        for (const [key, value] of Object.entries(def.lastingEffect.capacity)) {
          const k = key as keyof EnvironmentState['capacity'];
          env.capacity[k] = Math.min(env.capacity[k], value as number);
        }
        log.push(logEntry(generation, def, event, 'resolved', `The ${def.name.toLowerCase()} has ended, but the island has not fully recovered.`));
      } else {
        log.push(logEntry(generation, def, event, 'resolved', `The ${def.name.toLowerCase()} has ended.`));
      }
    }
  }

  return {
    env: clampEnvironment(env),
    active: active.filter((e) => !e.resolved),
    log,
    held,
    mortality: 1 - survivalFromDisasters,
    lastStartGen,
  };
}

/** Human-readable stage for an active event, for status lines and event cards. */
export function describeActive(event: ActiveEvent, defs: Record<string, EventDef> = EVENT_DEFS): string {
  const def = defs[event.defId];
  return `${def.name} (${def.stages[event.stageIndex].name})`;
}
