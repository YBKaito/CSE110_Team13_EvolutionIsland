import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeKonva, createController } from './helpers';
installFakeKonva();

test('environment is published first, then population; each checkpoint pauses once through generation 40', async () => {
  const fixture = createController();
  try {
    for (let generation = 1; generation <= 40; generation++) {
      fixture.coordinator.emitEnvironment(generation, { rainfall: Math.min(generation, 100) });
      fixture.coordinator.emitGeneration(generation);
      if (generation % 10 === 0) {
        assert.equal(fixture.coordinator.paused, true);
        assert.equal(fixture.model.getCurrentObservation().generation, generation);
        assert.equal(fixture.model.getCurrentObservation().environment.rainfall, generation);
        const pref = fixture.model.getPreferences().beakLength;
        fixture.controller.chooseTarget(pref === 'medium' ? 'long' : 'medium');
        await fixture.controller.submitChoice();
        assert.equal(fixture.coordinator.paused, false);
        assert.deepEqual(fixture.switcher.screens.at(-1), { type: 'game' });
      }
    }
    assert.deepEqual(fixture.model.getObservations().map((o: any) => o.generation), [0, 10, 20, 30, 40]);
    assert.deepEqual(fixture.model.getDecisions().map((d: any) => d.generation), [10, 20, 30, 40]);
    assert.equal(fixture.coordinator.pauseCalls, 4);
  } finally { fixture.controller.dispose(); }
});

test('extinction before checkpoint ends run without requiring a final trait choice', async () => {
  const fixture = createController();
  try {
    fixture.coordinator.emitEnvironment(10);
    fixture.coordinator.emitGeneration(10);
    fixture.controller.chooseTarget('long');
    await fixture.controller.submitChoice();
    fixture.coordinator.emitEnvironment(13);
    fixture.coordinator.emitGeneration(13, 0);
    assert.equal(fixture.coordinator.ended, true);
    assert.equal(fixture.model.getDecisions().length, 1);
    assert.deepEqual(fixture.switcher.screens.at(-1), { type: 'result', score: 0 });
  } finally { fixture.controller.dispose(); }
});
