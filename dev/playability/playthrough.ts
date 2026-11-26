import { SIM } from '../../src/constants';
import { RandomScheduler, ScriptedScheduler } from '../../src/events/EventFactory';
import { EVENT_DEFS, MOCKUP_SCRIPT } from '../../src/events/eventDefinitions';
import { GameController, GAME_OVER_PREVIEW_GENERATION } from '../../src/game/GameController';
import { GameSimulationCoordinator } from '../../src/game/GameSimulationCoordinator';
import { toEvolutionPreferences } from '../../src/game/EvolutionAdapters';
import { createBaselineEnvironment } from '../../src/models/Environment';
import { exposureRisk, predationRisk, reproductiveFitness, starvationRisk } from '../../src/simulation/Fitness';
import { RandomSource } from '../../src/simulation/Random';
import { hatchChance } from '../../src/simulation/SimulationEngine';
import { SIMULATION_TRAIT_FOR_CHOICE, TRAIT_OPTIONS } from '../../src/simulation/traitContent';
import type { EnvironmentState, TraitFocusChoice, TraitKey, Traits } from '../../src/types';

export type Strategy = 'adaptive' | 'mismatched' | 'random';
export type Scenario = 'random' | 'quiet' | 'mockup' | 'winter';
export const strategies: Strategy[] = ['adaptive', 'mismatched', 'random'];

// Expected breeders' contribution before density. Used only to choose a legal
// neighboring preference, never to advance or modify the actual simulation.
function fitness(traits: Traits, env: EnvironmentState): number {
  return (1 - starvationRisk(traits, env)) * (1 - exposureRisk(traits, env)) *
    (1 - predationRisk(traits, env)) * reproductiveFitness(traits, env);
}

export function choose(game: GameController, strategy: Strategy, rng: RandomSource): TraitFocusChoice {
  const prefs = toEvolutionPreferences(game.state);
  const candidates: { choice: TraitFocusChoice; gain: number }[] = [];
  for (const traitKey of Object.keys(SIMULATION_TRAIT_FOR_CHOICE) as TraitKey[]) {
    const trait = SIMULATION_TRAIT_FOR_CHOICE[traitKey];
    const options = TRAIT_OPTIONS[trait];
    const from = options.indexOf(prefs[traitKey]);
    for (const target of [from - 1, from + 1]) {
      if (target < 0 || target >= options.length) continue;
      // Average over the real flock's other traits; no future-event knowledge.
      const gain = game.state.population.birds.reduce((sum, bird) => sum +
        fitness({ ...bird.traits, [trait]: target }, game.state.environment) -
        fitness({ ...bird.traits, [trait]: from }, game.state.environment), 0) /
        game.state.population.birds.length;
      candidates.push({ choice: { generation: game.state.generation, traitKey,
        fromValue: prefs[traitKey], targetValue: options[target] }, gain });
    }
  }
  if (strategy === 'random') return rng.pick(candidates).choice;
  candidates.sort((a, b) => strategy === 'adaptive' ? b.gain - a.gain : a.gain - b.gain);
  return candidates[0].choice;
}

export async function playthrough(seed: number, strategy: Strategy, scenario: Scenario = 'random',
  traits: Traits = { beak: 0, body: 1, feathers: 1, color: 0 }) {
  const scheduler = scenario === 'random' ? new RandomScheduler() : new ScriptedScheduler(
    scenario === 'mockup' ? MOCKUP_SCRIPT : scenario === 'winter' ? [{ generation: 6, eventId: 'harshWinter' }] : []);
  const game = GameController.startRun({ name: 'Playtest', traits }, seed, scheduler, GAME_OVER_PREVIEW_GENERATION);
  const simulation = new GameSimulationCoordinator(game);
  const strategyRng = new RandomSource(seed ^ 0xabcdef);
  const choices: TraitFocusChoice[] = [];
  const timeline = [];
  let peak: number = SIM.START_POP;
  let drawdown = 0;
  let largestLoss = 0;
  let low = false;
  try {
    while (!simulation.isEnded()) {
      // Use the same coordinator / step / checkpoint submission as startGameSession.
      const before = game.state.population.birds;
      // Record the stage whose effects apply, before EventManager queues the
      // following stage at the end of this step.
      const appliedStages = game.state.activeEvents.map(e => ({ id: e.defId,
        stage: EVENT_DEFS[e.defId].stages[e.stageIndex].name }));
      const outcome = simulation.step();
      const r = outcome.result;
      const env = game.state.environment;
      const survivors = r.startPopulation - Object.values(r.deathsByCause).reduce((a, b) => a + b, 0);
      peak = Math.max(peak, r.population);
      drawdown = Math.max(drawdown, 1 - r.population / peak);
      largestLoss = Math.max(largestLoss, 1 - r.population / r.startPopulation);
      low ||= r.lowPopulation;
      const repFit = before.reduce((sum, bird) => sum + reproductiveFitness(bird.traits, env), 0) / before.length;
      const eggs = Math.floor(survivors / 2) * SIM.EGGS_PER_PAIR;
      timeline.push({ ...r, environment: structuredClone(env), events: outcome.events,
        active: [...appliedStages, ...outcome.events.filter(e => e.kind === 'started')
          .map(e => ({ id: e.eventId, stage: e.stage }))],
        preferences: toEvolutionPreferences(game.state), breeders: survivors,
        eggs, unhatched: eggs - r.born, netChange: r.population - r.startPopulation,
        // Diagnostic approximation: actual pair fitness depends on which adults survived.
        approximateHatchChance: hatchChance(repFit, survivors, 1) });
      if (simulation.isPaused() && !simulation.isEnded()) {
        const choice = choose(game, strategy, strategyRng);
        const accepted = await simulation.submitTraitFocus(choice, {
          ...toEvolutionPreferences(game.state), [choice.traitKey]: choice.targetValue,
        });
        if (!accepted.ok) throw new Error(accepted.error);
        choices.push(choice);
      }
    }
    return { seed, strategy, scenario, traits, generation: game.state.generation,
      final: game.state.population.birds.length, extinct: game.state.population.birds.length === 0,
      drawdown, largestLoss, low, recovered: recoveredFromCrisis(timeline), choices, timeline };
  } finally { simulation.dispose(); }
}

/** A substantial recovery: below half the starting flock, then back to its initial size. */
function recoveredFromCrisis(timeline: { population: number }[]): boolean {
  const crisis = timeline.findIndex(t => t.population < SIM.START_POP / 2);
  return crisis >= 0 && timeline.slice(crisis + 1).some(t => t.population >= SIM.START_POP);
}

export function summarize(runs: Awaited<ReturnType<typeof playthrough>>[]) {
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  return strategies.map(strategy => {
    const group = runs.filter(r => r.strategy === strategy);
    return { strategy, runs: group.length, extinct: group.filter(r => r.extinct).length,
      meanFinal: +average(group.map(r => r.final)).toFixed(1),
      meanDrawdown: +average(group.map(r => r.drawdown)).toFixed(3),
      noticeableDecline: group.filter(r => r.drawdown >= 0.25).length,
      belowHalfStart: group.filter(r => r.timeline.some(t => t.population < SIM.START_POP / 2)).length,
      low: group.filter(r => r.low).length, recovered: group.filter(r => recoveredFromCrisis(r.timeline)).length,
      meanPopulation: +average(group.map(r => average(r.timeline.map(t => t.population)))).toFixed(1) };
  });
}

export function neutralGrowth() {
  const traits = { beak: 1, body: 1, feathers: 1, color: 0 };
  const env = createBaselineEnvironment();
  return { balance: { ...SIM }, neutralFitness: fitness(traits, env), lowDensityHatch: hatchChance(1, 10, 1) };
}
