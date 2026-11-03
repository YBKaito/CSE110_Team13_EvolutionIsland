import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/constants';
import { EVENT_DEFS, MOCKUP_SCRIPT } from '../src/events/eventDefinitions';
import { isEligible, RandomScheduler, ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import { RandomSource } from '../src/simulation/Random';
import type { ActiveEvent } from '../src/types';
import { MEDIUM_BIRD } from './helpers/fixtures';

const activeAt = (defId: string, stageName?: string): ActiveEvent => {
  const def = EVENT_DEFS[defId];
  const stageIndex = stageName ? def.stages.findIndex((s) => s.name === stageName) : 0;
  return { defId, stageIndex, genInStage: 0, startedAt: 1, severity: 1, resolved: false };
};

describe('RandomScheduler timing', () => {
  const scheduler = new RandomScheduler();

  it('never starts an event in the protected first generations', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = new RandomSource(seed);
      for (let generation = 1; generation <= EVENTS.PROTECTED_GENS; generation++) {
        expect(scheduler.maybeStart({ generation, active: [], lastStartGen: 0 }, rng)).toBeNull();
      }
    }
  });

  it('never starts an event just before an observation milestone', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = new RandomSource(seed);
      for (const generation of [8, 9, 18, 19, 28, 29, 38, 39]) {
        expect(scheduler.maybeStart({ generation, active: [], lastStartGen: 0 }, rng)).toBeNull();
      }
    }
  });

  it('becomes more likely to start an event the longer the island stays quiet', () => {
    expect(RandomScheduler.startChance(10, 9)).toBeLessThan(RandomScheduler.startChance(10, 2));
    expect(RandomScheduler.startChance(100, 0)).toBe(EVENTS.P_MAX);
  });
});

describe('overlap rules', () => {
  it('allows only one climate event at a time', () => {
    expect(isEligible(EVENT_DEFS.harshWinter, [activeAt('drought')])).toBe(false);
  });

  it('allows only one disturbance at a time', () => {
    expect(isEligible(EVENT_DEFS.hurricane, [activeAt('hurricane')])).toBe(false);
  });

  it('never runs a drought and a hurricane together', () => {
    expect(isEligible(EVENT_DEFS.hurricane, [activeAt('drought')])).toBe(false);
    expect(isEligible(EVENT_DEFS.drought, [activeAt('hurricane')])).toBe(false);
  });

  it('allows one biological event to establish at a time', () => {
    expect(isEligible(EVENT_DEFS.newCompetitor, [activeAt('newPredator', 'establishing')])).toBe(false);
    expect(isEligible(EVENT_DEFS.newCompetitor, [activeAt('newPredator', 'established')])).toBe(true);
  });

  it('never repeats a permanent event', () => {
    expect(isEligible(EVENT_DEFS.newPredator, [activeAt('newPredator', 'established')])).toBe(false);
  });

  it('lets climate and biological events overlap', () => {
    expect(isEligible(EVENT_DEFS.drought, [activeAt('newPredator', 'established')])).toBe(true);
  });

  it('holds across many full random runs', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const game = GameController.startRun({ name: 'test', traits: MEDIUM_BIRD }, seed);
      for (let gen = 0; gen < 100 && !game.isOver; gen++) {
        game.step();
        const defs = game.state.activeEvents.map((e) => ({ def: EVENT_DEFS[e.defId], stage: EVENT_DEFS[e.defId].stages[e.stageIndex].name }));
        const count = (pred: (d: (typeof defs)[number]) => boolean) => defs.filter(pred).length;
        expect(count((d) => d.def.category === 'climate')).toBeLessThanOrEqual(1);
        expect(count((d) => d.def.category === 'disturbance')).toBeLessThanOrEqual(1);
        expect(count((d) => d.def.category === 'biological' && d.stage !== 'established')).toBeLessThanOrEqual(1);
        const ids = defs.map((d) => d.def.id);
        expect(ids.includes('drought') && ids.includes('hurricane')).toBe(false);
      }
    }
  });
});

describe('random runs', () => {
  it('produce events in every run, and different timelines for different seeds', () => {
    const timelines = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const game = GameController.startRun({ name: 'test', traits: MEDIUM_BIRD }, seed);
      for (let i = 0; i < 60 && !game.isOver; i++) game.step();
      const starts = game.eventHistory().filter((e) => e.kind === 'started');
      expect(starts.length).toBeGreaterThan(0);
      for (const s of starts) expect(s.generation).toBeGreaterThan(EVENTS.PROTECTED_GENS);
      timelines.add(starts.map((s) => `${s.generation}:${s.eventId}`).join(','));
    }
    expect(timelines.size).toBeGreaterThan(15);
  });
});

describe('ScriptedScheduler', () => {
  it('replays the mockup storyline: drought at Gen 6, predator at Gen 24', () => {
    const game = GameController.startRun({ name: 'test', traits: MEDIUM_BIRD }, 42, new ScriptedScheduler(MOCKUP_SCRIPT));
    for (let i = 0; i < 30 && !game.isOver; i++) game.step();
    const starts = game.eventHistory().filter((e) => e.kind === 'started');
    expect(starts.map((s) => [s.generation, s.eventId])).toEqual([
      [6, 'drought'],
      [24, 'newPredator'],
    ]);
    const envs = game.state.history.environments;
    expect(envs[5].rainfall).toBe(50);
    expect(envs[6].rainfall).toBeLessThan(50);
  });

  it('rejects unknown event ids', () => {
    const scheduler = new ScriptedScheduler([{ generation: 1, eventId: 'meteor' }]);
    expect(() => scheduler.maybeStart({ generation: 1, active: [], lastStartGen: 0 })).toThrow(/meteor/);
  });
});
