import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeKonva, createController, openCheckpoint } from './helpers';
installFakeKonva();
const testGlobal: any = globalThis;

/** Simulate the window only for keyboard tests; normal controller tests don't need it. */
function keyboardWindow() {
  const listeners = new Map<string, (event: any) => void>();
  const prev = { window: testGlobal.window, HTMLInputElement: testGlobal.HTMLInputElement, HTMLTextAreaElement: testGlobal.HTMLTextAreaElement };
  testGlobal.HTMLInputElement = class HTMLInputElement {};
  testGlobal.HTMLTextAreaElement = class HTMLTextAreaElement {};
  testGlobal.window = {
    addEventListener(event: string, handler: (event: any) => void) { listeners.set(event, handler); },
    removeEventListener(event: string, handler: (event: any) => void) { if (listeners.get(event) === handler) listeners.delete(event); }
  };
  return {
    key(key: string, extras: Record<string, unknown> = {}) {
      const event = {
        key, repeat: false, ctrlKey: false, altKey: false, metaKey: false,
        target: null, prevented: false, preventDefault() { this.prevented = true; }, ...extras
      };
      listeners.get('keydown')?.(event);
      return event;
    },
    get active() { return listeners.has('keydown'); },
    restore() { Object.assign(testGlobal, prev); }
  };
}

test('constructor subscribes to environment and population and binds view actions', () => {
  const fixture = createController();
  assert.equal(fixture.coordinator.environment.size, 1);
  assert.equal(fixture.coordinator.generations.size, 1);
  for (const key of ['openPage', 'back', 'selectTrait', 'selectTarget', 'submit']) {
    assert.equal(typeof fixture.view.handlers[key], 'function');
  }
  assert.equal(fixture.controller.getView(), fixture.view);
  fixture.controller.dispose();
});

test('show and hide only change visibility; they keep subscriptions', () => {
  const fixture = createController();
  fixture.controller.show();
  assert.equal(fixture.view.shown, true);
  fixture.controller.hide();
  assert.equal(fixture.view.shown, false);
  assert.equal(fixture.coordinator.environment.size, 1);
  assert.equal(fixture.coordinator.generations.size, 1);
  openCheckpoint(fixture, 10);
  assert.equal(fixture.switcher.screens.at(-1).type, 'evolution-choice');
  fixture.controller.dispose();
});

test('ordinary generations do not pause, but the tenth generation opens choice screen', () => {
  const fixture = createController();
  fixture.coordinator.emitEnvironment(9);
  fixture.coordinator.emitGeneration(9);
  assert.equal(fixture.coordinator.pauseCalls, 0);
  assert.equal(fixture.switcher.screens.length, 0);
  openCheckpoint(fixture, 10);
  fixture.controller.show();
  assert.equal(fixture.coordinator.pauseCalls, 1);
  assert.equal(fixture.coordinator.isPaused(), true);
  assert.deepEqual(fixture.switcher.screens.at(-1), { type: 'evolution-choice' });
  assert.equal(fixture.model.getCurrentObservation().generation, 10);
  assert.equal(fixture.view.last().page, 'choice');
  fixture.controller.dispose();
});

test('custom checkpoint interval works beyond generation 30', () => {
  const fixture = createController(5);
  openCheckpoint(fixture, 5);
  assert.equal(fixture.coordinator.pauseCalls, 1);
  assert.equal(fixture.model.getCurrentObservation().generation, 5);
  fixture.controller.dispose();
});

test('duplicate and older generation updates cannot open the same checkpoint twice', () => {
  const fixture = createController();
  openCheckpoint(fixture, 10);
  fixture.coordinator.emitGeneration(10);
  fixture.coordinator.emitGeneration(8);
  fixture.coordinator.emitEnvironment(10, { rainfall: 99 });
  assert.equal(fixture.coordinator.pauseCalls, 1);
  assert.equal(fixture.model.getCurrentObservation().environment.rainfall, 0);
  assert.equal(fixture.switcher.screens.length, 1);
  fixture.controller.dispose();
});

test('a checkpoint without matching environment data pauses and gives an error', () => {
  const fixture = createController();
  assert.throws(() => fixture.coordinator.emitGeneration(10), /Missing environmental snapshot for Gen 10/);
  assert.equal(fixture.coordinator.isPaused(), true);
  assert.equal(fixture.model.getCurrentObservation().generation, 0);
  assert.equal(fixture.switcher.screens.length, 0);
  fixture.controller.dispose();
});

test('extinction ends the run and opens results instead of trait selection', () => {
  const fixture = createController();
  fixture.coordinator.emitEnvironment(10);
  fixture.coordinator.emitGeneration(10, 0);
  assert.equal(fixture.coordinator.endCalls, 1);
  assert.equal(fixture.coordinator.pauseCalls, 0);
  assert.deepEqual(fixture.switcher.screens, [{ type: 'result', score: 0 }]);
  fixture.controller.dispose();
});

test('page navigation and Back work without changing saved choices', () => {
  const fixture = createController();
  openCheckpoint(fixture);
  fixture.view.handlers.openPage('stats');
  assert.equal(fixture.view.last().page, 'stats');
  fixture.view.handlers.back();
  assert.equal(fixture.view.last().page, 'choice');
  fixture.view.handlers.openPage('decisions');
  assert.equal(fixture.view.last().page, 'decisions');
  fixture.view.handlers.back();
  assert.equal(fixture.view.last().page, 'choice');
  assert.equal(fixture.model.getDecisions().length, 0);
  fixture.controller.dispose();
});

test('selecting a different trait clears the old target; Back clears an unsubmitted target', () => {
  const fixture = createController();
  openCheckpoint(fixture);
  fixture.controller.chooseTarget('long');
  assert.equal(fixture.view.last().selectedTarget, 'long');
  fixture.controller.chooseTrait('color');
  assert.equal(fixture.view.last().selectedTrait, 'color');
  assert.equal(fixture.view.last().selectedTarget, null);
  fixture.controller.chooseTarget('gray');
  fixture.view.handlers.back();
  assert.equal(fixture.view.last().selectedTarget, null);
  fixture.controller.dispose();
});

test('invalid target shows an error; a valid 0%-frequency target is allowed', () => {
  const fixture = createController();
  openCheckpoint(fixture);
  fixture.controller.chooseTarget('wrong');
  assert.match(fixture.model.error, /neighboring/);
  assert.equal(fixture.view.last().selectedTarget, null);
  assert.equal(fixture.model.getCurrentObservation().traitCounts.beakLength.long, 0);
  fixture.controller.chooseTarget('long');
  assert.equal(fixture.model.error, null);
  assert.equal(fixture.view.last().selectedTarget, 'long');
  fixture.controller.dispose();
});

test('trait input is ignored if the simulation is not paused or page is not choice', () => {
  const fixture = createController();
  openCheckpoint(fixture);
  fixture.controller.show();
  fixture.coordinator.paused = false;
  fixture.controller.chooseTarget('long');
  assert.equal(fixture.view.last().selectedTarget, null);
  fixture.coordinator.paused = true;
  fixture.view.handlers.openPage('stats');
  fixture.controller.chooseTarget('long');
  assert.equal(fixture.view.last().selectedTarget, null);
  fixture.controller.dispose();
});

test('submitChoice with no selected target displays an error and does not submit', async () => {
  const fixture = createController();
  openCheckpoint(fixture);
  await fixture.controller.submitChoice();
  assert.match(fixture.model.error, /adjacent/);
  assert.equal(fixture.coordinator.submissionCalls.length, 0);
  fixture.controller.dispose();
});

test('accepted submission changes only the preference, records history, and returns to game', async () => {
  const fixture = createController();
  openCheckpoint(fixture);
  fixture.controller.chooseTarget('long');
  await fixture.controller.submitChoice();
  assert.equal(fixture.coordinator.submissionCalls.length, 1);
  const { choice, profile } = fixture.coordinator.submissionCalls[0];
  assert.equal(choice.generation, 10);
  assert.equal(profile.beakLength, 'long');
  assert.equal(profile.color, 'brown');
  assert.equal(fixture.model.getPreferences().beakLength, 'long');
  assert.equal(fixture.model.getLastDecision().populationAtDecision, 12);
  assert.equal(fixture.model.getCurrentObservation().traitCounts.beakLength.long, 0);
  assert.deepEqual(fixture.switcher.screens.at(-1), { type: 'game' });
  fixture.controller.dispose();
});

test('rejected submission keeps the current choice and shows the coordinator error', async () => {
  const fixture = createController();
  openCheckpoint(fixture);
  fixture.coordinator.submitBehavior = async () => ({ ok: false, error: 'Not ready' });
  fixture.controller.chooseTarget('long');
  await fixture.controller.submitChoice();
  assert.equal(fixture.model.error, 'Not ready');
  assert.equal(fixture.model.getDecisions().length, 0);
  assert.equal(fixture.view.last().submitting, false);
  assert.equal(fixture.switcher.screens.length, 1);
  fixture.controller.dispose();
});

test('unexpected coordinator errors are caught and submission is unlocked', async () => {
  const fixture = createController();
  openCheckpoint(fixture);
  fixture.coordinator.submitBehavior = async () => { throw new Error('Network failed'); };
  fixture.controller.chooseTarget('long');
  await fixture.controller.submitChoice();
  assert.equal(fixture.model.error, 'Network failed');
  assert.equal(fixture.view.last().submitting, false);
  assert.equal(fixture.model.getDecisions().length, 0);
  fixture.controller.dispose();
});

test('a pending submission blocks duplicate clicks and waits for the result', async () => {
  const fixture = createController();
  openCheckpoint(fixture);
  let resolve: (value: any) => void = () => {};
  fixture.coordinator.submitBehavior = () => new Promise(r => { resolve = r; });
  fixture.controller.chooseTarget('long');
  const first = fixture.controller.submitChoice();
  assert.equal(fixture.view.last().submitting, true);
  fixture.controller.chooseTrait('color');
  await fixture.controller.submitChoice();
  assert.equal(fixture.coordinator.submissionCalls.length, 1);
  assert.equal(fixture.view.last().selectedTrait, 'beakLength');
  resolve({ ok: true });
  await first;
  assert.equal(fixture.model.getDecisions().length, 1);
  fixture.controller.dispose();
});

test('disposing during submission stops late responses from changing the old screen', async () => {
  const fixture = createController();
  openCheckpoint(fixture);
  let resolve: (value: any) => void = () => {};
  fixture.coordinator.submitBehavior = () => new Promise(r => { resolve = r; });
  fixture.controller.chooseTarget('long');
  const pending = fixture.controller.submitChoice();
  fixture.controller.dispose();
  resolve({ ok: true });
  await pending;
  assert.equal(fixture.model.getDecisions().length, 0);
  assert.equal(fixture.view.destroyed, true);
});

test('dispose removes listeners, destroys Konva group, and is safe to call twice', () => {
  const fixture = createController();
  fixture.controller.dispose();
  fixture.controller.dispose();
  assert.equal(fixture.coordinator.environment.size, 0);
  assert.equal(fixture.coordinator.generations.size, 0);
  assert.equal(fixture.view.destroyed, true);
  fixture.coordinator.emitEnvironment(10);
  fixture.coordinator.emitGeneration(10);
  assert.equal(fixture.switcher.screens.length, 0);
});

test('keyboard controls select traits, navigate pages, and ignore repeats/modifier input', async () => {
  const keyboard = keyboardWindow();
  const fixture = createController();
  try {
    openCheckpoint(fixture);
    fixture.controller.show();
    assert.equal(keyboard.active, true);
    keyboard.key('2');
    assert.equal(fixture.view.last().selectedTrait, 'bodySize');
    keyboard.key('ArrowRight');
    assert.equal(fixture.view.last().selectedTarget, 'large');
    keyboard.key('5');
    assert.equal(fixture.view.last().page, 'stats');
    keyboard.key('Enter');
    assert.equal(fixture.view.last().page, 'choice');
    keyboard.key('6');
    assert.equal(fixture.view.last().page, 'decisions');
    keyboard.key('b');
    assert.equal(fixture.view.last().page, 'choice');
    keyboard.key('3', { repeat: true });
    keyboard.key('3', { ctrlKey: true });
    keyboard.key('3', { target: new testGlobal.HTMLInputElement() });
    assert.equal(fixture.view.last().selectedTrait, 'bodySize');
    keyboard.key('s');
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(fixture.model.getPreferences().bodySize, 'large');
    fixture.controller.hide();
    assert.equal(keyboard.active, false);
  } finally {
    fixture.controller.dispose();
    keyboard.restore();
  }
});
