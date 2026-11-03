import test from 'node:test';
import assert from 'node:assert/strict';
import { game } from './helpers';
const { TRAITS, traitKeys, DEFAULT_PREFERENCES, labelFor, adjacentTargets, isValidAdjacentChoice } = game('traits.js');

test('trait choices have the expected categories and ordered options', () => {
  assert.deepEqual(traitKeys, ['beakLength', 'bodySize', 'featherDensity', 'color']);
  for (const key of traitKeys) {
    assert.equal(TRAITS[key].options.length, 3);
    assert.equal(new Set(TRAITS[key].options.map((o: any) => o.id)).size, 3);
    assert.ok(TRAITS[key].options.some((o: any) => o.id === DEFAULT_PREFERENCES[key]));
  }
  assert.deepEqual(TRAITS.color.options.map((o: any) => o.id), ['tan', 'brown', 'dark-brown']);
});

test('labelFor converts IDs into readable labels and falls back on unknown IDs', () => {
  assert.equal(labelFor('color', 'dark-brown'), 'Dark brown');
  assert.equal(labelFor('beakLength', 'short'), 'Short');
  assert.equal(labelFor('bodySize', 'giant'), 'giant');
});

test('adjacentTargets returns only direct neighbors for every trait', () => {
  for (const key of traitKeys) {
    const [first, middle, last] = TRAITS[key].options.map((o: any) => o.id);
    assert.deepEqual(adjacentTargets(key, first), [middle]);
    assert.deepEqual(adjacentTargets(key, middle), [first, last]);
    assert.deepEqual(adjacentTargets(key, last), [middle]);
    assert.deepEqual(adjacentTargets(key, 'not-a-trait'), []);
  }
});

test('isValidAdjacentChoice rejects the same value and skipping levels', () => {
  for (const key of traitKeys) {
    const [first, middle, last] = TRAITS[key].options.map((o: any) => o.id);
    assert.equal(isValidAdjacentChoice(key, first, middle), true);
    assert.equal(isValidAdjacentChoice(key, last, middle), true);
    assert.equal(isValidAdjacentChoice(key, first, last), false);
    assert.equal(isValidAdjacentChoice(key, middle, middle), false);
    assert.equal(isValidAdjacentChoice(key, middle, 'missing'), false);
  }
});
