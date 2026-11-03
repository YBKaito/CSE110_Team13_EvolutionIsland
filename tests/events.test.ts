import { describe, expect, it } from 'vitest';
import { EVENT_DEFS } from '../src/events/eventDefinitions';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { advanceEvents } from '../src/events/EventManager';
import { createBaselineEnvironment, regenerate } from '../src/models/Environment';
import { RandomSource } from '../src/simulation/Random';
import type { ActiveEvent, EnvironmentState, EventDef, EventLogEntry } from '../src/types';

interface EventRun {
  /** Stage index that applied in each generation the event was active. */
  stages: number[];
  envs: EnvironmentState[];
  log: EventLogEntry[];
  mortality: number[];
  resolvedAt: number | null;
  active: ActiveEvent[];
}

/** Runs one event on its own from generation 1 and records what happens. */
function runEvent(eventId: string, seed: number, generations = 120, defs: Record<string, EventDef> = EVENT_DEFS): EventRun {
  const rng = new RandomSource(seed);
  const scheduler = new ScriptedScheduler([{ generation: 1, eventId }], defs);
  let env = createBaselineEnvironment();
  let active: ActiveEvent[] = [];
  const run: EventRun = { stages: [], envs: [], log: [], mortality: [], resolvedAt: null, active: [] };

  for (let gen = 1; gen <= generations; gen++) {
    const stageBefore = gen === 1 ? 0 : active[0]?.stageIndex;
    const step = advanceEvents(env, active, gen, scheduler, rng, 0, defs);
    if (stageBefore !== undefined && (gen === 1 || active.length > 0)) run.stages.push(stageBefore);
    env = regenerate(step.env, step.held);
    active = step.active;
    run.envs.push(env);
    run.log.push(...step.log);
    run.mortality.push(step.mortality);
    if (run.resolvedAt === null && step.log.some((e) => e.kind === 'resolved')) run.resolvedAt = gen;
  }
  run.active = active;
  return run;
}

/** Lengths of consecutive runs of the same stage index, e.g. [0,0,1,1,1] -> [[0,2],[1,3]]. */
function stageDurations(stages: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const s of stages) {
    if (out.length > 0 && out[out.length - 1][0] === s) out[out.length - 1][1]++;
    else out.push([s, 1]);
  }
  return out;
}

describe.each(Object.values(EVENT_DEFS))('$name', (def) => {
  it('goes through every stage in order, each lasting within its configured duration', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const durations = stageDurations(runEvent(def.id, seed).stages);
      expect(durations.map(([s]) => s)).toEqual(def.stages.map((_, i) => i));
      for (const [index, length] of durations) {
        const stage = def.stages[index];
        if (stage.maxDuration === null) continue; // indefinite stage, still running at the end
        expect(length).toBeGreaterThanOrEqual(stage.minDuration);
        expect(length).toBeLessThanOrEqual(stage.maxDuration);
      }
    }
  });

  it('logs a start and a message for every stage it reaches', () => {
    const { log } = runEvent(def.id, 3);
    expect(log[0]).toMatchObject({ kind: 'started', generation: 1, eventId: def.id, stage: def.stages[0].name });
    const stagesLogged = log.filter((e) => e.kind !== 'resolved').map((e) => e.stage);
    expect(stagesLogged).toEqual(def.stages.map((s) => s.name));
  });

  if (def.persistence === 'temporary') {
    it('resolves, and climate returns close to normal afterwards', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const run = runEvent(def.id, seed, 120);
        expect(run.resolvedAt).not.toBeNull();
        expect(run.active).toHaveLength(0);
        const end = run.envs.at(-1)!;
        expect(Math.abs(end.rainfall - 100)).toBeLessThan(5);
        expect(Math.abs(end.temperature - 100)).toBeLessThan(5);
      }
    });
  } else {
    it('becomes permanent and settles at a new level instead of growing forever', () => {
      const run = runEvent(def.id, 5, 80);
      expect(run.active).toHaveLength(1);
      expect(def.stages[run.active[0].stageIndex].name).toBe('established');
      const lastTwenty = run.envs.slice(-20);
      expect(new Set(lastTwenty.map((e) => e.predation)).size).toBe(1);
      expect(new Set(lastTwenty.map((e) => e.competition)).size).toBe(1);
    });
  }
});

describe('specific event effects', () => {
  it('drought lowers rainfall and soft plants', () => {
    const run = runEvent('drought', 1, 25);
    const lowest = (key: 'rainfall') => Math.min(...run.envs.map((e) => e[key]));
    expect(lowest('rainfall')).toBeLessThan(80);
    expect(Math.min(...run.envs.map((e) => e.food.softPlants))).toBeLessThan(85);
  });

  it('harsh winter lowers temperature and insects', () => {
    const run = runEvent('harshWinter', 1, 25);
    expect(Math.min(...run.envs.map((e) => e.temperature))).toBeLessThan(85);
    expect(Math.min(...run.envs.map((e) => e.food.insects))).toBeLessThan(85);
  });

  it('hurricane kills a random share of the flock exactly once and strips cover', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = runEvent('hurricane', seed, 60);
      const hits = run.mortality.filter((m) => m > 0);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toBeGreaterThanOrEqual(0.1 * 0.8);
      expect(hits[0]).toBeLessThanOrEqual(0.4 * 1.2);
      expect(Math.min(...run.envs.map((e) => e.cover))).toBeLessThan(90);
    }
  });

  it('new predator raises predation pressure', () => {
    expect(runEvent('newPredator', 1, 30).envs.at(-1)!.predation).toBeGreaterThan(110);
  });

  it('new competitor eats small seeds only', () => {
    const end = runEvent('newCompetitor', 1, 40).envs.at(-1)!;
    expect(end.competitorDiet).toBe('smallSeeds');
    expect(end.competition).toBeGreaterThan(10);
    expect(end.food.smallSeeds).toBeLessThan(97);
    expect(end.food.hardSeeds).toBeCloseTo(100, 5);
  });

  it('effects vary between runs but stay within the configured ranges', () => {
    const lows = Array.from({ length: 30 }, (_, i) => Math.min(...runEvent('drought', i + 1, 30).envs.map((e) => e.rainfall)));
    expect(new Set(lows.map((x) => x.toFixed(2))).size).toBeGreaterThan(20);
    for (const low of lows) expect(low).toBeGreaterThanOrEqual(0);
  });
});

describe('events only change the environment', () => {
  it('returns environment data and never anything about birds or fitness', () => {
    const step = advanceEvents(createBaselineEnvironment(), [], 1, new ScriptedScheduler([{ generation: 1, eventId: 'drought' }]), new RandomSource(1));
    expect(Object.keys(step).sort()).toEqual(['active', 'env', 'held', 'lastStartGen', 'log', 'mortality']);
  });
});

describe('extending with a new event', () => {
  it('runs an event defined only as data, with no engine changes', () => {
    const heatWave: EventDef = {
      id: 'heatWave',
      name: 'Heat Wave',
      category: 'climate',
      weight: 1,
      persistence: 'temporary',
      stages: [
        { name: 'warning', minDuration: 2, maxDuration: 3, transitionChance: 0.5, effects: [{ variable: 'temperature', mode: 'perGen', range: [3, 5] }], message: 'It is getting hotter.' },
        { name: 'recovery', minDuration: 2, maxDuration: 4, transitionChance: 0.5, effects: [{ variable: 'temperature', mode: 'perGen', range: [-5, -3] }], message: 'It is cooling down.' },
      ],
    };
    const run = runEvent('heatWave', 1, 30, { ...EVENT_DEFS, heatWave });
    expect(Math.max(...run.envs.map((e) => e.temperature))).toBeGreaterThan(105);
    expect(run.resolvedAt).not.toBeNull();
  });
});
