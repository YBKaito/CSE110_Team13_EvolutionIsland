import { describe, expect, it, vi } from 'vitest';
import { MOCKUP_SCRIPT } from '../src/events/eventDefinitions';
import { ScriptedScheduler } from '../src/events/EventFactory';
import { GameController } from '../src/game/GameController';
import { EventScreenController } from '../src/screens/EventScreen/EventScreenController';
import { eventCardView } from '../src/screens/EventScreen/EventScreenView';
import type { EventLogEntry } from '../src/types';
import { MEDIUM_BIRD } from './helpers/fixtures';
import { FakeNavigator, screenText } from './helpers/screens';

/** Plays the mockup storyline until an event log entry matches. */
function runUntil(match: (e: EventLogEntry) => boolean) {
  const game = GameController.startRun({ name: 'Sparrow', traits: MEDIUM_BIRD }, 42, new ScriptedScheduler(MOCKUP_SCRIPT));
  for (let i = 0; i < 80 && !game.isOver; i++) {
    const found = game.step().events.find(match);
    if (found) return { game, entry: found };
  }
  throw new Error('event not found');
}

function cardFor(match: (e: EventLogEntry) => boolean) {
  const { game, entry } = runUntil(match);
  const nav = new FakeNavigator();
  const onContinue = vi.fn();
  const screen = new EventScreenController(nav, game.state, entry, onContinue);
  return { game, entry, nav, onContinue, screen };
}

const droughtStart = (e: EventLogEntry) => e.eventId === 'drought' && e.kind === 'started';

describe('event card', () => {
  it('shows the headline, generation, flock size, message, and what changed (mockup p.41)', () => {
    const { screen, game } = cardFor(droughtStart);
    const text = screenText(screen.spec());
    expect(text[0]).toBe('The rains are slowing');
    expect(text[1]).toBe(`Generation 6        Your flock: ${game.state.population.birds.length} birds`);
    expect(text).toContain('Rainfall is decreasing, and some plants are beginning to disappear.');
    expect(text.some((l) => l.startsWith('Rainfall: 100 to '))).toBe(true);
    expect(text).toEqual(expect.arrayContaining(['1. View island changes', '2. Continue simulation']));
  });

  it('uses the stage headline and the total change since the event began', () => {
    const { game, entry } = runUntil((e) => e.eventId === 'drought' && e.stage === 'peak');
    const view = eventCardView(game.state, entry);
    expect(view.title).toBe('Drought grips the island');
    expect(view.beforeGeneration).toBe(5);
    const rain = view.changeLine.match(/Rainfall: (\d+) to (\d+)/);
    expect(rain).not.toBeNull();
    expect(Number(rain![1])).toBe(100);
    expect(Number(rain![2])).toBeLessThan(85);
  });

  it("only lists the event's own changes, even when another event is changing the island too", () => {
    const { game, entry } = runUntil((e) => e.eventId === 'newPredator' && e.kind === 'stageChanged');
    const view = eventCardView(game.state, entry);
    expect(view.changeLine).toMatch(/^Predators: 100 to \d+$/);
  });

  it('announces when a temporary event ends', () => {
    const { game, entry } = runUntil((e) => e.eventId === 'drought' && e.kind === 'resolved');
    expect(eventCardView(game.state, entry).title).toBe('The drought is over');
  });

  it('rejects invalid input', () => {
    const { screen, nav } = cardFor(droughtStart);
    screen.submit('9');
    expect(screen.spec().prompt.error).toBe('Invalid. Type 1 or 2.');
    expect(nav.refreshes).toBe(1);
  });

  it('2 continues the simulation', () => {
    const { screen, onContinue } = cardFor(droughtStart);
    screen.submit('2');
    expect(onContinue).toHaveBeenCalledOnce();
  });
});

describe('island changes table (mockup p.42)', () => {
  it('1 opens a before/after table, and Enter returns to the card', () => {
    const { screen, onContinue } = cardFor(droughtStart);
    screen.submit('1');
    const spec = screen.spec();
    const text = screenText(spec);
    expect(text[0]).toBe('Island changes at Gen 6');
    expect(text).toContain('Island measure | Before (Gen 5) | After (Gen 6)');
    expect(text.some((l) => l.startsWith('Rainfall | 100 | '))).toBe(true);
    expect(text.some((l) => l.startsWith('Hard seeds | 100 | 100'))).toBe(true);
    expect(spec.prompt).toMatchObject({ mode: 'enter', label: 'Press Enter to return to the event.' });

    screen.submit('');
    expect(screenText(screen.spec())[0]).toBe('The rains are slowing');
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('adds a competing-birds row once a competitor arrives', () => {
    const game = GameController.startRun({ name: 'Sparrow', traits: MEDIUM_BIRD }, 1, new ScriptedScheduler([{ generation: 1, eventId: 'newCompetitor' }]));
    let entry: EventLogEntry | undefined;
    for (let i = 0; i < 20 && !entry; i++) entry = game.step().events.find((e) => e.kind === 'stageChanged');
    const screen = new EventScreenController(new FakeNavigator(), game.state, entry!, () => {});
    screen.submit('1');
    expect(screenText(screen.spec()).some((l) => l.startsWith('Competing birds | 0 | '))).toBe(true);
  });
});
