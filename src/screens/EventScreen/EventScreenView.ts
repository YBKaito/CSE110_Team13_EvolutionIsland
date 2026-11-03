// What the event card (mockup p.41/43/44) and the island-changes table (p.42) show.
// Pure functions: game state + event log entry in, ScreenSpec out.

import { EVENT_DEFS } from '../../events/eventDefinitions';
import { diffEnvironment, getValue } from '../../models/Environment';
import type { GameState } from '../../models/GameState';
import type { EnvironmentState, EnvVariable, EventDef, EventLogEntry } from '../../types';
import { ENV_LABELS } from '../format';
import { CHOICE_PROMPT, gap, text, type ScreenSpec } from '../ui/screenSpec';

export const EVENT_CARD_CHOICES = 2;

const TABLE_VARIABLES: EnvVariable[] = ['rainfall', 'temperature', 'softPlants', 'smallSeeds', 'hardSeeds', 'insects', 'cover', 'predation'];

export interface EventCardView {
  title: string;
  generation: number;
  flock: number;
  message: string;
  /** e.g. "Rainfall: 100 to 80 / Soft plants: 100 to 90" (since the event began). */
  changeLine: string;
  beforeGeneration: number;
  before: EnvironmentState;
  after: EnvironmentState;
}

function cardTitle(entry: EventLogEntry, def: EventDef | undefined): string {
  if (!def) return entry.eventName;
  if (entry.kind === 'resolved') return `The ${def.name.toLowerCase()} is over`;
  return def.stages.find((s) => s.name === entry.stage)?.title ?? def.name;
}

/** Generation the event in `entry` started, so the card can show its total effect so far. */
function startGeneration(state: Readonly<GameState>, entry: EventLogEntry): number {
  const starts = state.history.events.filter((e) => e.kind === 'started' && e.eventId === entry.eventId && e.generation <= entry.generation);
  return starts.at(-1)?.generation ?? entry.generation;
}

export function eventCardView(state: Readonly<GameState>, entry: EventLogEntry, defs: Record<string, EventDef> = EVENT_DEFS): EventCardView {
  const envs = state.history.environments;
  const beforeGeneration = Math.max(0, startGeneration(state, entry) - 1);
  const before = envs[beforeGeneration];
  const after = envs[Math.min(entry.generation, envs.length - 1)];
  const flock = state.history.generations[entry.generation - 1]?.population ?? state.population.birds.length;

  // Show what *this* event changes (e.g. predators for a new predator), not side effects of other events.
  const def = defs[entry.eventId];
  const own = new Set<EnvVariable>(def?.stages.flatMap((s) => [...s.effects.map((e) => e.variable), ...(s.holds ?? [])]) ?? []);
  const allChanges = diffEnvironment(before, after, 1)
    .filter((c) => Math.round(c.before) !== Math.round(c.after))
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));
  const ownChanges = allChanges.filter((c) => own.has(c.variable));
  const changes = (ownChanges.length > 0 ? ownChanges : allChanges).slice(0, 3);
  const changeLine = changes.map((c) => `${ENV_LABELS[c.variable]}: ${Math.round(c.before)} to ${Math.round(c.after)}`).join(' / ');

  return {
    title: cardTitle(entry, defs[entry.eventId]),
    generation: entry.generation,
    flock,
    message: entry.message,
    changeLine,
    beforeGeneration,
    before,
    after,
  };
}

export function eventCardSpec(view: EventCardView, error?: string): ScreenSpec {
  return {
    blocks: [
      text(view.title, { size: 'title', bold: true }),
      gap(6),
      text(`Generation ${view.generation}        Your flock: ${view.flock} birds`),
      text(view.message),
      ...(view.changeLine ? [text(view.changeLine)] : []),
      gap(24),
      text('1. View island changes'),
      text('2. Continue simulation'),
    ],
    prompt: { mode: 'choice', label: CHOICE_PROMPT, error },
  };
}

export function islandChangesSpec(view: EventCardView): ScreenSpec {
  const variables = [...TABLE_VARIABLES];
  if (view.before.competition >= 1 || view.after.competition >= 1) variables.push('competition');
  const rows = variables.map((v) => [ENV_LABELS[v], String(Math.round(getValue(view.before, v))), String(Math.round(getValue(view.after, v)))]);

  return {
    blocks: [
      text(`Island changes at Gen ${view.generation}`, { size: 'title', bold: true }),
      gap(4),
      {
        kind: 'table',
        bordered: true,
        size: 'body',
        columns: ['Island measure', `Before (Gen ${view.beforeGeneration})`, `After (Gen ${view.generation})`],
        rows,
        columnWidths: [500, 280, 260],
      },
      text('Island measures start at 100 when your flock arrives.', { size: 'small' }),
    ],
    prompt: { mode: 'enter', label: 'Press Enter to return to the event.' },
  };
}
