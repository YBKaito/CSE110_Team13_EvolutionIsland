import test from 'node:test';
import assert from 'node:assert/strict';
import { game, environment, counts, completed, createModel, checkpoint } from './helpers';
const { EvolutionScreenModel } = game('screens/EvolutionScreen/EvolutionScreenModel.js');

const choice = (g = 10, trait = 'beakLength', from = 'medium', to = 'long') => ({
  generation: g, traitKey: trait, fromValue: from, targetValue: to
});

test('constructor sets generation 0, default preferences, and no decisions', () => {
  const model = createModel(12);
  assert.equal(model.getCurrentObservation().generation, 0);
  assert.equal(model.getCurrentObservation().results.newPopulation, 12);
  assert.equal(model.getPreviousObservation(), null);
  assert.deepEqual(model.getDecisions(), []);
  assert.equal(model.getLastDecision(), null);
  assert.equal(model.getPreferences().beakLength, 'medium');
  assert.equal(model.hasEnvironment(0), true);
});

test('constructor rejects bad population counts and invalid environment', () => {
  assert.throws(() => new EvolutionScreenModel(12, counts(11), environment()), /trait counts/);
  assert.throws(() => new EvolutionScreenModel(12, counts(12), environment({ rainfall: 102 })), /rainfall/);
});

test('constructor copies the starting inputs', () => {
  const c = counts(12), env = environment(), prefs = { beakLength: 'short', bodySize: 'medium', featherDensity: 'medium', color: 'brown' };
  const model = new EvolutionScreenModel(12, c, env, prefs);
  c.beakLength.short = 7;
  env.habitatBackground[0] = 17;
  prefs.beakLength = 'long';
  assert.equal(model.getCurrentObservation().traitCounts.beakLength.short, 0);
  assert.equal(model.getCurrentObservation().environment.habitatBackground[0], 182);
  assert.equal(model.getPreferences().beakLength, 'short');
});

test('cacheEnvironment ignores invalid generations and duplicate values', () => {
  const model = createModel();
  model.cacheEnvironment({ generation: 0, state: environment({ rainfall: 5 }) });
  model.cacheEnvironment({ generation: -1, state: environment({ rainfall: 6 }) });
  model.cacheEnvironment({ generation: 1.5, state: environment({ rainfall: 7 }) });
  assert.equal(model.getCurrentObservation().environment.rainfall, 0);
  model.cacheEnvironment({ generation: 10, state: environment({ rainfall: 11 }) });
  model.cacheEnvironment({ generation: 10, state: environment({ rainfall: 99 }) });
  model.recordGeneration(completed(10));
  assert.equal(model.captureObservation(10).environment.rainfall, 11);
});

test('cacheEnvironment validates input and stores copies', () => {
  const model = createModel();
  assert.throws(() => model.cacheEnvironment({ generation: 10, state: environment({ rainfall: 200 }) }), /rainfall/);
  const env = environment({ rainfall: 21 });
  model.cacheEnvironment({ generation: 10, state: env });
  env.rainfall = 66;
  env.habitatBackground[0] = 99;
  model.recordGeneration(completed(10));
  assert.equal(model.captureObservation(10).environment.rainfall, 21);
  assert.equal(model.getCurrentObservation().environment.habitatBackground[0], 182);
});

test('recordGeneration rejects duplicate and invalid generations', () => {
  const model = createModel();
  assert.equal(model.recordGeneration(completed(0)), false);
  assert.equal(model.recordGeneration(completed(-2)), false);
  assert.equal(model.recordGeneration(completed(1.8)), false);
  assert.equal(model.recordGeneration(completed(10)), true);
  assert.equal(model.recordGeneration(completed(10)), false);
});

test('recordGeneration validates trait counts and copies the results', () => {
  const model = createModel();
  assert.throws(() => model.recordGeneration(completed(10, 12, { traitCounts: counts(11) })), /trait counts/);
  const value = completed(10);
  value.results.eventList.push('Drought');
  model.recordGeneration(value);
  value.traitCounts.color.brown = 99;
  value.results.eventList.push('Hurricane');
  model.cacheEnvironment({ generation: 10, state: environment() });
  const obs = model.captureObservation(10);
  assert.deepEqual(obs.results.eventList, ['Drought']);
  assert.equal(obs.traitCounts.color.brown, 12);
});

test('captureObservation waits for both updates of the SAME generation', () => {
  const model = createModel();
  model.cacheEnvironment({ generation: 10, state: environment() });
  model.recordGeneration(completed(20));
  assert.equal(model.captureObservation(10), null);
  assert.equal(model.captureObservation(20), null);
  model.recordGeneration(completed(10));
  assert.equal(model.captureObservation(10).generation, 10);
  model.cacheEnvironment({ generation: 20, state: environment() });
  assert.equal(model.captureObservation(20).generation, 20);
});

test('captureObservation saves checkpoints in order and cleans old temporary updates', () => {
  const model = createModel();
  model.cacheEnvironment({ generation: 2, state: environment() });
  model.recordGeneration(completed(2));
  assert.equal(checkpoint(model, 10).generation, 10);
  assert.equal(model.captureObservation(10), null);
  assert.equal(model.hasEnvironment(2), false);
  assert.equal(model.hasEnvironment(10), false);
  assert.equal(checkpoint(model, 20).generation, 20);
  assert.equal(model.captureObservation(15), null);
  assert.deepEqual(model.getObservations().map((o: any) => o.generation), [0, 10, 20]);
  assert.equal(model.getPreviousObservation().generation, 10);
});

test('all snapshot and preference getters return copies, not internal state', () => {
  const model = createModel();
  checkpoint(model, 10);
  const obs = model.getCurrentObservation();
  obs.results.eventList.push('bad data');
  obs.environment.habitatBackground[0] = 0;
  obs.traitCounts.beakLength.medium = 0;
  const history = model.getObservations();
  history[0].results.newPopulation = 99;
  const prefs = model.getPreferences();
  prefs.color = 'white';
  assert.equal(model.getCurrentObservation().results.eventList.length, 0);
  assert.equal(model.getCurrentObservation().environment.habitatBackground[0], 182);
  assert.equal(model.getCurrentObservation().traitCounts.beakLength.medium, 12);
  assert.equal(model.getObservations()[0].results.newPopulation, 12);
  assert.equal(model.getPreferences().color, 'brown');
});

test('validateChoice handles wrong generation, duplicate, stale value, unknown and skipped trait', () => {
  const model = createModel();
  checkpoint(model, 10);
  assert.match(model.validateChoice(choice(20), 10), /current checkpoint/);
  assert.match(model.validateChoice(choice(10, 'beakLength', 'short'), 10), /changed/);
  assert.match(model.validateChoice(choice(10, 'beakLength', 'medium', 'medium'), 10), /adjacent/);
  assert.match(model.validateChoice(choice(10, 'beakLength', 'medium', 'invalid'), 10), /adjacent/);
  assert.match(model.validateChoice({ ...choice(), traitKey: 'invented-trait' }, 10), /Unknown/);
  assert.equal(model.validateChoice(choice(), 10), null);
  model.recordAcceptedChoice(choice());
  assert.match(model.validateChoice(choice(), 10), /already been recorded/);
});

test('a zero-frequency target is still a valid choice', () => {
  const model = createModel();
  checkpoint(model, 10);
  assert.equal(model.getCurrentObservation().traitCounts.beakLength.long, 0);
  assert.equal(model.validateChoice(choice(), 10), null);
});

test('recordAcceptedChoice updates only the selected preference and stores choice history', () => {
  const model = createModel();
  checkpoint(model, 10, 9);
  model.error = 'Old error';
  model.recordAcceptedChoice(choice());
  assert.equal(model.getPreferences().beakLength, 'long');
  assert.equal(model.getPreferences().bodySize, 'medium');
  assert.equal(model.getLastDecision().populationAtDecision, 9);
  assert.equal(model.getDecisions().length, 1);
  assert.equal(model.error, null);
  assert.equal(model.getCurrentObservation().traitCounts.beakLength.long, 0);
  assert.throws(() => model.recordAcceptedChoice(choice()), /already been recorded/);
});

test('decision getters return safe copies and multi-checkpoint choices work', () => {
  const model = createModel();
  checkpoint(model, 10);
  model.recordAcceptedChoice(choice());
  const past = model.getDecisions();
  past[0].targetValue = 'short';
  const last = model.getLastDecision();
  last.populationAtDecision = 999;
  assert.equal(model.getLastDecision().targetValue, 'long');
  assert.equal(model.getLastDecision().populationAtDecision, 12);
  checkpoint(model, 20);
  model.recordAcceptedChoice(choice(20, 'beakLength', 'long', 'medium'));
  assert.deepEqual(model.getDecisions().map((x: any) => x.generation), [10, 20]);
  assert.equal(model.getPreferences().beakLength, 'medium');
});
