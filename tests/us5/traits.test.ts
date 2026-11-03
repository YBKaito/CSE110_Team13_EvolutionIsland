import test from 'node:test';
import assert from 'node:assert/strict';
import { game } from './helpers';
const { TRAITS, traitKeys, DEFAULT_PREFERENCES, labelFor, adjacentTargets, isValidAdjacentChoice } = game('traits.js');

test('trait choices have the expected categories and ordered options', () => {
  assert.deepEqual(traitKeys, ['beakLength', 'bodySize', 'featherDensity', 'color']);
  for (const key of traitKeys) {
    const optionCount = key === 'color' ? 4 : 3;
    assert.equal(TRAITS[key].options.length, optionCount);
    assert.equal(new Set(TRAITS[key].options.map((o: any) => o.id)).size, optionCount);
    assert.ok(TRAITS[key].options.some((o: any) => o.id === DEFAULT_PREFERENCES[key]));
  }
  assert.deepEqual(TRAITS.color.options.map((o: any) => o.id), ['brown', 'gray', 'yellow', 'white']);
});

test('labelFor converts IDs into readable labels and falls back on unknown IDs', () => {
  for (const [id, label] of [['brown', 'Brown'], ['gray', 'Gray'], ['yellow', 'Yellow'], ['white', 'White']]) {
    assert.equal(labelFor('color', id), label);
  }
  assert.equal(labelFor('beakLength', 'short'), 'Short');
  assert.equal(labelFor('bodySize', 'giant'), 'giant');
});

test('adjacentTargets returns only direct neighbors for every trait', () => {
  for (const key of traitKeys) {
    const values = TRAITS[key].options.map((o: any) => o.id);
    values.forEach((value: string, index: number) => {
      const neighbors = [values[index - 1], values[index + 1]].filter(v => v !== undefined);
      assert.deepEqual(adjacentTargets(key, value), neighbors);
    });
    assert.deepEqual(adjacentTargets(key, 'not-a-trait'), []);
  }
});

test('isValidAdjacentChoice rejects the same value and skipping levels', () => {
  for (const key of traitKeys) {
    const values = TRAITS[key].options.map((o: any) => o.id);
    values.forEach((from: string, i: number) => {
      values.forEach((target: string, j: number) => {
        assert.equal(isValidAdjacentChoice(key, from, target), Math.abs(i - j) === 1);
      });
      assert.equal(isValidAdjacentChoice(key, from, 'missing'), false);
    });
  }
});
