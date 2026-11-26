import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeKonva, game, createController, openCheckpoint, createModel, checkpoint, labels, walk, clickOption } from './helpers';

installFakeKonva();
const { EvolutionScreenView } = game('screens/EvolutionScreen/EvolutionScreenView.js');

test('keeping preferences resumes without applying an unsubmitted trait change', async () => {
  const f = createController();
  try {
    openCheckpoint(f, 10);
    f.controller.chooseTarget('long');
    const before = f.model.getPreferences();
    await f.controller.submitChoice(true);
    assert.deepEqual(f.model.getPreferences(), before);
    assert.deepEqual(f.coordinator.keepCalls, [10]);
    assert.deepEqual(f.coordinator.submissionCalls, []);
    assert.equal(f.coordinator.isPaused(), false);
    assert.deepEqual(f.switcher.screens.at(-1), { type: 'game' });
    assert.deepEqual(f.model.getDecisions(), [{ generation: 10, kind: 'unchanged', populationAtDecision: 12 }]);
    openCheckpoint(f, 20);
    f.controller.chooseTarget('long');
    await f.controller.submitChoice();
    assert.equal(f.model.getPreferences().beakLength, 'long');
    assert.equal(f.model.getDecisions().length, 2);
  } finally { f.controller.dispose(); }
});

test('keeping preferences cannot submit twice or race a trait change', async () => {
  const f = createController();
  try {
    openCheckpoint(f, 10);
    let resolve!: (value: any) => void;
    f.coordinator.keepBehavior = () => new Promise(r => { resolve = r; });
    const pending = f.controller.submitChoice(true);
    await f.controller.submitChoice(true);
    await f.controller.submitChoice();
    assert.deepEqual(f.coordinator.keepCalls, [10]);
    assert.deepEqual(f.coordinator.submissionCalls, []);
    resolve({ ok: true });
    await pending;
    assert.equal(f.model.getDecisions().length, 1);
  } finally { f.controller.dispose(); }
});

test('rejected keep request leaves the player at the checkpoint', async () => {
  const f = createController();
  try {
    openCheckpoint(f, 10);
    f.coordinator.keepBehavior = async () => ({ ok: false, error: 'Not ready' });
    const before = f.model.getPreferences();
    await f.controller.submitChoice(true);
    assert.equal(f.coordinator.isPaused(), true);
    assert.equal(f.model.error, 'Not ready');
    assert.deepEqual(f.model.getPreferences(), before);
    assert.equal(f.model.getDecisions().length, 0);
    assert.equal(f.view.last().submitting, false);
  } finally { f.controller.dispose(); }
});

test('model rejects duplicate and stale decisions including keep requests', () => {
  const model = createModel();
  checkpoint(model, 10);
  assert.throws(() => model.recordKeptPreferences(0), /current checkpoint/);
  model.recordKeptPreferences(10);
  assert.throws(() => model.recordKeptPreferences(10), /already been recorded/);
  assert.match(model.validateChoice({ generation: 10, traitKey: 'beakLength', fromValue: 'medium', targetValue: 'long' }, 10), /already been recorded/);
  checkpoint(model, 20);
  model.recordAcceptedChoice({ generation: 20, traitKey: 'beakLength', fromValue: 'medium', targetValue: 'long' });
  assert.throws(() => model.recordKeptPreferences(20), /already been recorded/);
});

test('view offers an explicit keep action and records it in history', () => {
  const model = createModel();
  checkpoint(model, 10);
  const view = new EvolutionScreenView();
  let kept = 0;
  view.bind({ openPage() {}, back() {}, selectTrait() {}, selectTarget() {}, toggleHint() {}, submit() {}, keepPreferences() { kept++; } });
  const state = { model, generation: 10, interval: 10, page: 'choice', selectedTrait: 'beakLength', selectedTarget: null, selectedHint: null, submitting: false };
  view.render(state);
  clickOption(view.getGroup(), 'K. Keep current preferences');
  assert.equal(kept, 1);
  view.render({ ...state, submitting: true });
  assert.equal(walk(view.getGroup()).some(n => n.listeners.has('click') && labels(n).includes('K. Keep current preferences')), false);
  model.recordKeptPreferences(10);
  view.render({ ...state, page: 'decisions' });
  assert.ok(labels(view.getGroup()).includes('Gen 10: Kept current preferences'));
});
