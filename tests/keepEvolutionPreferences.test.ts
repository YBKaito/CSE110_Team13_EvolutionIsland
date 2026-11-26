import { describe, expect, it } from 'vitest';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import { GameSimulationCoordinator } from '../src/game/GameSimulationCoordinator';
import { toEvolutionPreferences } from '../src/game/EvolutionAdapters';
import { MEDIUM_BIRD } from './helpers/fixtures';

const setup = () => new GameSimulationCoordinator(GameController.startRun(
  { name: 'Sparrow', traits: MEDIUM_BIRD }, 2, new ScriptedScheduler([]),
));

describe('keeping evolution preferences', () => {
  it('resolves the checkpoint without modifying the population, RNG, or favored traits', async () => {
    const simulation = setup();
    for (let i = 0; i < 10; i++) simulation.step();
    const before = structuredClone(simulation.game.state);
    expect(await simulation.keepPreferences(10)).toEqual({ ok: true });
    expect(simulation.game.state).toEqual({ ...before, lastEvolutionChoiceGeneration: 10 });
    expect(simulation.game.state.favoredTraits).toEqual({});
    expect(simulation.isPaused()).toBe(false);
    expect(simulation.step().result.generation).toBe(11);
    simulation.dispose();
  });

  it('preserves a previously favored trait and rejects stale or repeated decisions', async () => {
    const simulation = setup();
    expect(await simulation.keepPreferences(0)).toMatchObject({ ok: false });
    for (let i = 0; i < 10; i++) simulation.step();
    const current = toEvolutionPreferences(simulation.game.state);
    const choice = { generation: 10, traitKey: 'beakLength' as const, fromValue: current.beakLength, targetValue: 'long' };
    expect(await simulation.submitTraitFocus(choice, { ...current, beakLength: 'long' })).toEqual({ ok: true });
    for (let i = 0; i < 10; i++) simulation.step();
    expect(await simulation.keepPreferences(10)).toMatchObject({ ok: false });
    expect(simulation.isPaused()).toBe(true);
    expect(await simulation.keepPreferences(20)).toEqual({ ok: true });
    expect(simulation.game.state.favoredTraits).toEqual({ beak: 2 });
    expect(await simulation.keepPreferences(20)).toMatchObject({ ok: false });
    expect(() => simulation.game.applyEvolutionChoice({ generation: 20, traitKey: 'beakLength', fromValue: 'long', targetValue: 'medium' })).toThrow(/already made/);
    simulation.dispose();
  });

  it('rejects keeping preferences after the run ends', async () => {
    const simulation = setup();
    for (let i = 0; i < 10; i++) simulation.step();
    simulation.endRun();
    expect(await simulation.keepPreferences(10)).toMatchObject({ ok: false });
    expect(simulation.game.state.lastEvolutionChoiceGeneration).toBeNull();
    simulation.dispose();
  });
});
