// Temporary dev harness for US3/US4: runs a simulation and prints one line per generation.
// Replace with the real screens once the menu/creation screens land.
// URL options: ?seed=42  ?script=mockup  ?gens=40

import { MOCKUP_SCRIPT } from './events/eventDefinitions';
import { RandomScheduler, ScriptedScheduler } from './events/EventFactory';
import { describeActive } from './events/EventManager';
import { GameController } from './game/GameController';
import { TRAIT_OPTIONS } from './simulation/traitContent';
import type { GenerationResult, TraitName } from './types';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? 42);
const generations = Number(params.get('gens') ?? 40);
const scheduler = params.get('script') === 'mockup' ? new ScriptedScheduler(MOCKUP_SCRIPT) : new RandomScheduler();

const game = GameController.startRun({ name: 'Sparrow', traits: { beak: 0, body: 1, feathers: 1, color: 0 } }, seed, scheduler);

function shares(result: GenerationResult, trait: TraitName): string {
  const total = Math.max(1, result.population);
  return TRAIT_OPTIONS[trait].map((option, i) => `${option[0]}${Math.round((100 * result.traitCounts[trait][i]) / total)}`).join('/');
}

const pad = (value: string | number, width: number) => String(value).padStart(width);
const lines: string[] = [`seed=${seed}  scheduler=${scheduler instanceof ScriptedScheduler ? 'mockup script' : 'random'}`, ''];

for (let i = 0; i < generations && !game.isOver; i++) {
  const { result, events } = game.step();
  const env = game.state.environment;
  const d = result.deathsByCause;
  const active = game.state.activeEvents.map((e) => describeActive(e)).join(', ') || '-';
  lines.push(
    `Gen ${pad(result.generation, 3)} | pop ${pad(result.population, 3)} (adults ${pad(result.startPopulation, 3)}) ` +
      `| died: starve ${pad(d.starvation, 2)} cold/heat ${pad(d.exposure, 2)} hawks ${pad(d.predation, 2)} storm ${pad(d.disaster, 2)} ` +
      `| beak ${shares(result, 'beak')} color ${shares(result, 'color')} ` +
      `| rain ${pad(env.rainfall.toFixed(0), 3)} temp ${pad(env.temperature.toFixed(0), 3)} soft ${pad(env.food.softPlants.toFixed(0), 3)} ` +
      `hard ${pad(env.food.hardSeeds.toFixed(0), 3)} pred ${pad(env.predation.toFixed(0), 3)} | ${active}`,
  );
  for (const entry of events) lines.push(`        >> ${entry.eventName} [${entry.stage}] ${entry.message}`);
  if (result.lowPopulation) lines.push('        !! Warning: your flock is close to extinction.');
  if (result.extinct) lines.push('        XX The flock has died out.');
}

const app = document.getElementById('app');
if (app) app.textContent = lines.join('\n');
